import { getD1 } from "../../../db";
import { rowToProject, retagProjects } from "./payload";

export async function listProjects(email: string) {
  const result = await getD1().prepare("SELECT * FROM user_projects WHERE user_email = ? ORDER BY name COLLATE NOCASE").bind(email).all();
  return (result.results as Record<string, unknown>[]).map(rowToProject);
}

export async function getProject(email: string, id: string) {
  const row = await getD1().prepare("SELECT * FROM user_projects WHERE id = ? AND user_email = ?").bind(id, email).first();
  return row ? rowToProject(row as Record<string, unknown>) : null;
}

/** Rewrites projects_json on every app of this user that references `from`. */
export async function retagApps(email: string, from: string, to: string | null) {
  const result = await getD1().prepare("SELECT id, projects_json FROM user_apps WHERE user_email = ?").bind(email).all();
  const statements: D1PreparedStatement[] = [];
  for (const row of result.results as { id: string; projects_json: string }[]) {
    let projects: string[] = [];
    try { const parsed = JSON.parse(row.projects_json || "[]"); projects = Array.isArray(parsed) ? parsed.map(String) : []; } catch { projects = []; }
    const next = retagProjects(projects, from, to);
    if (next) statements.push(getD1().prepare("UPDATE user_apps SET projects_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_email = ?").bind(JSON.stringify(next), row.id, email));
  }
  if (statements.length) await getD1().batch(statements);
}

export function isUniqueViolation(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}
