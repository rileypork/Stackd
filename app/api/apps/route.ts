import { insertApp, listApps, unauthorized, userEmail } from "./shared";

export async function GET(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try { return Response.json({ apps: await listApps(email) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load apps." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try { return Response.json({ app: await insertApp(email, await request.json()) }, { status: 201 }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add app.";
    return Response.json({ error: message.includes("UNIQUE") ? "That app is already in your stack." : message }, { status: 400 });
  }
}
