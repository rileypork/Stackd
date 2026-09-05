import { insertApp, listApps, unauthorized, userEmail, type AppPayload } from "../shared";

export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const body = await request.json() as { apps?: AppPayload[] };
    const apps = Array.isArray(body.apps) ? body.apps.slice(0, 500) : [];
    if (!apps.length) return Response.json({ error: "No apps were found in that file." }, { status: 400 });
    let imported = 0;
    let skipped = 0;
    for (const app of apps) {
      try { await insertApp(email, app); imported += 1; } catch { skipped += 1; }
    }
    return Response.json({ apps: await listApps(email), imported, skipped });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
