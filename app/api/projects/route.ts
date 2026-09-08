import { getD1 } from "../../../db";
import { unauthorized, userEmail } from "../apps/shared";
import { cleanProject } from "./payload";
import { getProject, isUniqueViolation, listProjects } from "./shared";

export async function GET(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try { return Response.json({ projects: await listProjects(email) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load projects." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const project = cleanProject(await request.json());
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO user_projects (id, user_email, name, description, accent) VALUES (?, ?, ?, ?, ?)")
      .bind(id, email, project.name, project.description, project.accent).run();
    return Response.json({ project: await getProject(email, id) }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "You already have a project with that name." }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create project." }, { status: 400 });
  }
}
