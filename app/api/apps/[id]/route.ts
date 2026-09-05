import { getD1 } from "../../../../db";
import { cleanPayload, rowToApp, unauthorized, userEmail } from "../shared";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const { id } = await context.params;
    const app = cleanPayload(await request.json());
    await getD1().prepare(`UPDATE user_apps SET name = ?, initials = ?, tone = ?, website = ?, description = ?, category = ?, status = ?,
      monthly_cost_cents = ?, billing_frequency = ?, renewal_date = ?, trial_start_date = ?, trial_end_date = ?, cancellation_date = ?,
      access_end_date = ?, projects_json = ?, sources_json = ?, last_activity = ?, confidence = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_email = ?`)
      .bind(app.name, app.initials, app.tone, app.website, app.description, app.category, app.status, app.monthlyCostCents,
        app.billingFrequency, app.renewalDate, app.trialStartDate, app.trialEndDate, app.cancellationDate, app.accessEndDate,
        app.projectsJson, app.sourcesJson, app.lastActivity, app.confidence, app.notes, id, email).run();
    const row = await getD1().prepare("SELECT * FROM user_apps WHERE id = ? AND user_email = ?").bind(id, email).first();
    if (!row) return Response.json({ error: "App not found." }, { status: 404 });
    return Response.json({ app: rowToApp(row as Record<string, unknown>) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to update app." }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  const { id } = await context.params;
  await getD1().prepare("DELETE FROM user_apps WHERE id = ? AND user_email = ?").bind(id, email).run();
  return Response.json({ deleted: true });
}
