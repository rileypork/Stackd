import { getD1 } from "../../../db";
import { unauthorized, userEmail } from "../apps/shared";
import { cleanSubscription } from "./payload";
import { getSubscription, isUniqueViolation, listSubscriptions, ownsApp, ownsProject } from "./shared";

export async function GET(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    return Response.json({ subscriptions: await listSubscriptions(email) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load subscriptions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const sub = cleanSubscription(await request.json());
    if (sub.projectId && !(await ownsProject(email, sub.projectId))) return Response.json({ error: "Unknown project." }, { status: 400 });
    if (sub.appId && !(await ownsApp(email, sub.appId))) return Response.json({ error: "Unknown app." }, { status: 400 });
    const id = crypto.randomUUID();
    await getD1().prepare(`INSERT INTO subscriptions (id, user_email, service_name, domain, category, plan_name, cost_cents, currency, billing_interval,
        next_renewal_date, trial_end_date, cancel_url, status, project_id, app_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, email, sub.serviceName, sub.domain, sub.category, sub.planName, sub.costCents, sub.currency, sub.billingInterval,
        sub.nextRenewalDate, sub.trialEndDate, sub.cancelUrl, sub.status, sub.projectId, sub.appId).run();
    return Response.json({ subscription: await getSubscription(email, id) }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "You already track a subscription with that service name." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create subscription." }, { status: 400 });
  }
}
