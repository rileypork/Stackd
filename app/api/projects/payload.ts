export const ACCENTS = ["cobalt", "coral", "amber", "mint"] as const;
export type Accent = (typeof ACCENTS)[number];

export type ProjectPayload = { name?: string; description?: string; accent?: string };

export type Project = { id: string; name: string; description: string; accent: Accent; updatedAt: string };

export function cleanProject(payload: ProjectPayload) {
  const name = String(payload.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Project name is required.");
  const description = String(payload.description ?? "").trim().slice(0, 300);
  const accent: Accent = (ACCENTS as readonly string[]).includes(String(payload.accent)) ? (payload.accent as Accent) : "cobalt";
  return { name, description, accent };
}

export function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    accent: (ACCENTS as readonly string[]).includes(String(row.accent)) ? (row.accent as Accent) : "cobalt",
    updatedAt: String(row.updated_at ?? ""),
  };
}

/** Returns the app's project list with `from` renamed to `to` (or removed when `to` is null), or null if unchanged. */
export function retagProjects(projects: string[], from: string, to: string | null): string[] | null {
  if (!projects.includes(from)) return null;
  const next = projects.flatMap((project) => project === from ? (to ? [to] : []) : [project]);
  return [...new Set(next)];
}
