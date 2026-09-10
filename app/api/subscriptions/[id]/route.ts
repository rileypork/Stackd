import { getD1 } from "../../../../db";
import { unauthorized, userEmail } from "../../apps/shared";
import { cleanSubscription, type SubscriptionPayload } from "../payload";
import { getSubscription, isUniqueViolation, listSignals, ownsApp, ownsProject } from "../shared";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  const { id } = await context.params;
  const subscription = await getSubscription(email, id);
  if (!subscription) return Response.json({ error: "Subscription not found." }, { status: 404 });
  return Response.json({ subscription, signals: await listSignals(email, id) });
}

export async function PATCH(request: Request, context: Context) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  const { id } = await context.params;
  const current = await getSubscription(email, id);
  if (!current) return Response.json({ error: "Subscription not found." }, { status: 404 });
  try {
    const patch = (await request.json()) as SubscriptionPayload;
    const merged = cleanSubscription({
      serviceName: patch.serviceName ?? current.serviceName,
      domain: patch.domain === undefined ? current.domain : patch.domain,
      category: patch.category ?? current.category,
      planName: patch.planName === undefined ? current.planName : patch.planName,
      cost: patch.cost ?? current.cost,
      currency: patch.currency ?? current.currency,
      billingInterval: patch.billingInterval ?? current.billingInterval,
      nextRenewalDate: patch.nextRenewalDate === undefined ? current.nextRenewalDate : patch.nextRenewalDate,
      trialEndDate: patch.trialEndDate === undefined ? current.trialEndDate : patch.trialEndDate,
      cancelUrl: patch.cancelUrl === undefined ? current.cancelUrl : patch.cancelUrl,
      status: patch.status ?? current.status,
      projectId: patch.projectId === undefined ? current.projectId : patch.projectId,
      appId: patch.appId === undefined ? current.appId : patch.appId,
    });
    if (merged.projectId && merged.projectId !== current.projectId && !(await ownsProject(email, merged.projectId))) {
      return Response.json({ error: "Unknown project." }, { status: 400 });
    }
    if (merged.appId && merged.appId !== current.appId && !(await ownsApp(email, merged.appId))) {
      return Response.json({ error: "Unknown app." }, { status: 400 });
    }
    await getD1().prepare(`UPDATE subscriptions SET service_name = ?, domain = ?, category = ?, plan_name = ?, cost_cents = ?, currency = ?, billing_interval = ?,
        next_renewal_date = ?, trial_end_date = ?, cancel_url = ?, status = ?, project_id = ?, app_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_email = ?`)
      .bind(merged.serviceName, merged.domain, merged.category, merged.planName, merged.costCents, merged.currency, merged.billingInterval,
        merged.nextRenewalDate, merged.trialEndDate, merged.cancelUrl, merged.status, merged.projectId, merged.appId, id, email).run();
    return Response.json({ subscription: await getSubscription(email, id) });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "You already track a subscription with that service name." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update subscription." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  const { id } = await context.params;
  const db = getD1();
  // Explicit delete of signals in case the D1 database runs without foreign_keys enforcement.
  const result = await db.batch([
    db.prepare("DELETE FROM subscription_signals WHERE subscription_id = ? AND user_email = ?").bind(id, email),
    db.prepare("DELETE FROM subscriptions WHERE id = ? AND user_email = ?").bind(id, email),
  ]);
  const deleted = (result[1]?.meta.changes ?? 0) > 0;
  return deleted ? Response.json({ deleted: true }) : Response.json({ error: "Subscription not found." }, { status: 404 });
}
