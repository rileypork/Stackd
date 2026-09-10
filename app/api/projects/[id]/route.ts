import { getD1 } from "../../../../db";
import { listApps, unauthorized, userEmail } from "../../apps/shared";
import { cleanProject } from "../payload";
import { getProject, isUniqueViolation, retagApps } from "../shared";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const { id } = await context.params;
    const existing = await getProject(email, id);
    if (!existing) return Response.json({ error: "Project not found." }, { status: 404 });
    const project = cleanProject(await request.json());
    await getD1().prepare("UPDATE user_projects SET name = ?, description = ?, accent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_email = ?")
      .bind(project.name, project.description, project.accent, id, email).run();
    if (project.name !== existing.name) await retagApps(email, existing.name, project.name);
    return Response.json({ project: await getProject(email, id), apps: await listApps(email) });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "You already have a project with that name." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update project." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  const { id } = await context.params;
  const existing = await getProject(email, id);
  if (!existing) return Response.json({ error: "Project not found." }, { status: 404 });
  await getD1().prepare("DELETE FROM user_projects WHERE id = ? AND user_email = ?").bind(id, email).run();
  await retagApps(email, existing.name, null);
  return Response.json({ deleted: true, apps: await listApps(email) });
}
