import { getD1 } from "../../../db";
import { rowToSignal, rowToSubscription, statusAfterSignal, type ParsedSignal } from "./payload";

const SELECT_WITH_COUNT = `SELECT s.*, (SELECT COUNT(*) FROM subscription_signals g WHERE g.subscription_id = s.id AND g.user_email = s.user_email) AS signal_count FROM subscriptions s`;

export async function listSubscriptions(email: string) {
  const result = await getD1()
    .prepare(`${SELECT_WITH_COUNT} WHERE s.user_email = ? ORDER BY s.status, s.next_renewal_date IS NULL, s.next_renewal_date, s.service_name COLLATE NOCASE`)
    .bind(email).all();
  return (result.results as Record<string, unknown>[]).map(rowToSubscription);
}

export async function getSubscription(email: string, id: string) {
  const row = await getD1().prepare(`${SELECT_WITH_COUNT} WHERE s.id = ? AND s.user_email = ?`).bind(id, email).first();
  return row ? rowToSubscription(row as Record<string, unknown>) : null;
}

export async function listSignals(email: string, subscriptionId: string) {
  const result = await getD1()
    .prepare("SELECT * FROM subscription_signals WHERE user_email = ? AND subscription_id = ? ORDER BY detected_at DESC")
    .bind(email, subscriptionId).all();
  return (result.results as Record<string, unknown>[]).map(rowToSignal);
}

/** Ownership checks for foreign keys — a user may only link to their own projects/apps. */
export async function ownsProject(email: string, projectId: string) {
  const row = await getD1().prepare("SELECT id FROM user_projects WHERE id = ? AND user_email = ?").bind(projectId, email).first();
  return Boolean(row);
}
export async function ownsApp(email: string, appId: string) {
  const row = await getD1().prepare("SELECT id FROM user_apps WHERE id = ? AND user_email = ?").bind(appId, email).first();
  return Boolean(row);
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export type IngestOutcome = { subscriptionId: string; created: boolean; duplicate: boolean };

/** Upsert the subscription for a parsed signal and record the signal. Stores structured fields only. */
export async function applySignal(email: string, signal: ParsedSignal): Promise<IngestOutcome> {
  const db = getD1();
  const existing = await db
    .prepare("SELECT id FROM subscriptions WHERE user_email = ? AND service_name = ? COLLATE NOCASE")
    .bind(email, signal.serviceName).first<{ id: string }>();

  let subscriptionId = existing?.id ?? null;
  let created = false;
  if (!subscriptionId) {
    subscriptionId = crypto.randomUUID();
    created = true;
    const linkedApp = await db
      .prepare("SELECT id FROM user_apps WHERE user_email = ? AND (name = ? COLLATE NOCASE OR (? IS NOT NULL AND website LIKE ?)) LIMIT 1")
      .bind(email, signal.serviceName, signal.senderDomain, signal.senderDomain ? `%${signal.senderDomain}%` : null)
      .first<{ id: string }>();
    await db.prepare(`INSERT INTO subscriptions (id, user_email, service_name, domain, category, plan_name, cost_cents, currency, billing_interval,
        next_renewal_date, trial_end_date, cancel_url, status, app_id, last_detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(subscriptionId, email, signal.serviceName, signal.senderDomain, signal.category, signal.planName,
        signal.amountCents ?? 0, signal.currency ?? "USD", signal.billingInterval ?? "monthly",
        signal.renewalDate, signal.trialEndDate, signal.cancelUrl, statusAfterSignal(signal.kind) ?? "active", linkedApp?.id ?? null)
      .run();
  }

  const signalInsert = await db.prepare(`INSERT OR IGNORE INTO subscription_signals (id, user_email, subscription_id, kind, source, message_hash, sender_domain, subject,
      amount_cents, currency, billing_interval, renewal_date, trial_end_date, cancel_url, confidence)
    VALUES (?, ?, ?, ?, 'gmail', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), email, subscriptionId, signal.kind, signal.messageHash, signal.senderDomain, signal.subject,
      signal.amountCents, signal.currency, signal.billingInterval, signal.renewalDate, signal.trialEndDate, signal.cancelUrl, signal.confidence)
    .run();
  const duplicate = (signalInsert.meta.changes ?? 0) === 0;

  if (!created && !duplicate) {
    // COALESCE keeps existing values when the new signal lacks a field; status only moves when the signal implies one.
    const status = statusAfterSignal(signal.kind);
    await db.prepare(`UPDATE subscriptions SET
        domain = COALESCE(?, domain), plan_name = COALESCE(?, plan_name),
        cost_cents = CASE WHEN ? IS NULL THEN cost_cents ELSE ? END, currency = COALESCE(?, currency),
        billing_interval = COALESCE(?, billing_interval), next_renewal_date = COALESCE(?, next_renewal_date),
        trial_end_date = COALESCE(?, trial_end_date), cancel_url = COALESCE(?, cancel_url),
        status = COALESCE(?, status), last_detected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_email = ?`)
      .bind(signal.senderDomain, signal.planName, signal.amountCents, signal.amountCents, signal.currency,
        signal.billingInterval, signal.renewalDate, signal.trialEndDate, signal.cancelUrl, status, subscriptionId, email)
      .run();
  }

  return { subscriptionId, created, duplicate };
}
