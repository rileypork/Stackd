import { getD1 } from "../../../db";

export type { AppPayload, Status } from "./payload";
export { STATUSES, isStatus, cleanPayload, rowToApp, userEmailFromRequest as userEmail } from "./payload";
import { cleanPayload, rowToApp, type AppPayload } from "./payload";

export function unauthorized() {
  return Response.json({ error: "Sign in to manage your Stackd library." }, { status: 401 });
}

export async function listApps(email: string) {
  const result = await getD1().prepare("SELECT * FROM user_apps WHERE user_email = ? ORDER BY updated_at DESC, name COLLATE NOCASE").bind(email).all();
  return (result.results as Record<string, unknown>[]).map(rowToApp);
}

export async function insertApp(email: string, payload: AppPayload) {
  const app = cleanPayload(payload);
  const id = crypto.randomUUID();
  await getD1().prepare(`INSERT INTO user_apps (
    id, user_email, name, initials, tone, website, description, category, status, monthly_cost_cents,
    billing_frequency, renewal_date, trial_start_date, trial_end_date, cancellation_date, access_end_date,
    projects_json, sources_json, last_activity, confidence, notes, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(id, email, app.name, app.initials, app.tone, app.website, app.description, app.category, app.status, app.monthlyCostCents,
      app.billingFrequency, app.renewalDate, app.trialStartDate, app.trialEndDate, app.cancellationDate, app.accessEndDate,
      app.projectsJson, app.sourcesJson, app.lastActivity, app.confidence, app.notes).run();
  const row = await getD1().prepare("SELECT * FROM user_apps WHERE id = ? AND user_email = ?").bind(id, email).first();
  return rowToApp(row as Record<string, unknown>);
}
