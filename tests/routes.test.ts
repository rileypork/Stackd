import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./harness/cloudflare-workers.ts";
import * as subscriptionsRoute from "../app/api/subscriptions/route.ts";
import * as subscriptionRoute from "../app/api/subscriptions/[id]/route.ts";
import * as ingestRoute from "../app/api/gmail/ingest/route.ts";
import * as projectsRoute from "../app/api/projects/route.ts";
import * as projectRoute from "../app/api/projects/[id]/route.ts";
import * as appsRoute from "../app/api/apps/route.ts";
import * as appRoute from "../app/api/apps/[id]/route.ts";
import { applySignal } from "../app/api/subscriptions/shared.ts";
import { parseEmail } from "../app/api/subscriptions/payload.ts";

const ALICE = "alice@example.com";
const BOB = "bob@example.com";
const ORIGIN = "https://stackd.example.com";

/** Production-shaped request: non-local host, identity only via the auth header. */
function request(path: string, init: RequestInit & { user?: string | null; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.user) headers.set("oai-authenticated-user-email", init.user);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async <T,>(response: Response) => (await response.json()) as T;

async function createSubscription(user: string, serviceName: string, extra: Record<string, unknown> = {}) {
  const response = await subscriptionsRoute.POST(request("/api/subscriptions", { method: "POST", user, json: { serviceName, cost: 12, ...extra } }));
  assert.equal(response.status, 201);
  return (await json<{ subscription: { id: string; status: string; serviceName: string } }>(response)).subscription;
}

async function createProject(user: string, name: string) {
  const response = await projectsRoute.POST(request("/api/projects", { method: "POST", user, json: { name } }));
  assert.equal(response.status, 201);
  return (await json<{ project: { id: string } }>(response)).project;
}

async function createApp(user: string, name: string) {
  const response = await appsRoute.POST(request("/api/apps", { method: "POST", user, json: { name, status: "Active", cost: 5 } }));
  assert.equal(response.status, 201);
  return (await json<{ app: { id: string } }>(response)).app;
}

const count = (sql: string, ...params: unknown[]) =>
  (db.sqlite.prepare(sql).get(...(params as (string | number | null)[])) as { n: number }).n;

beforeEach(() => db.reset());

test("unauthenticated requests are rejected on every subscription route", async () => {
  const sub = await createSubscription(ALICE, "Notion");
  const responses = await Promise.all([
    subscriptionsRoute.GET(request("/api/subscriptions")),
    subscriptionsRoute.POST(request("/api/subscriptions", { method: "POST", json: { serviceName: "Figma" } })),
    subscriptionRoute.GET(request(`/api/subscriptions/${sub.id}`), ctx(sub.id)),
    subscriptionRoute.PATCH(request(`/api/subscriptions/${sub.id}`, { method: "PATCH", json: { cost: 1 } }), ctx(sub.id)),
    subscriptionRoute.DELETE(request(`/api/subscriptions/${sub.id}`, { method: "DELETE" }), ctx(sub.id)),
    ingestRoute.POST(request("/api/gmail/ingest", { method: "POST", json: { from: "billing@notion.so", subject: "Receipt" } })),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.match((await json<{ error: string }>(response)).error, /Sign in/);
  }
  assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions"), 1, "unauthenticated writes must not touch the table");
});

test("unauthenticated requests are rejected on projects and apps routes", async () => {
  const project = await createProject(ALICE, "Rally");
  const app = await createApp(ALICE, "Linear");
  const responses = await Promise.all([
    projectsRoute.GET(request("/api/projects")),
    projectsRoute.POST(request("/api/projects", { method: "POST", json: { name: "X" } })),
    projectRoute.PATCH(request(`/api/projects/${project.id}`, { method: "PATCH", json: { name: "Y" } }), ctx(project.id)),
    projectRoute.DELETE(request(`/api/projects/${project.id}`, { method: "DELETE" }), ctx(project.id)),
    appsRoute.GET(request("/api/apps")),
    appsRoute.POST(request("/api/apps", { method: "POST", json: { name: "X" } })),
    appRoute.PATCH(request(`/api/apps/${app.id}`, { method: "PATCH", json: { name: "Y" } }), ctx(app.id)),
    appRoute.DELETE(request(`/api/apps/${app.id}`, { method: "DELETE" }), ctx(app.id)),
  ]);
  for (const response of responses) assert.equal(response.status, 401);
});

test("a blank auth header does not fall through to the local dev identity on a production host", async () => {
  const response = await subscriptionsRoute.GET(request("/api/subscriptions", { headers: { "oai-authenticated-user-email": "   " } }));
  assert.equal(response.status, 401);
});

test("the auth header is normalised and scopes reads to the caller", async () => {
  await createSubscription(ALICE, "Notion");
  await createSubscription(BOB, "Figma");
  const asAlice = await json<{ subscriptions: { serviceName: string }[] }>(
    await subscriptionsRoute.GET(request("/api/subscriptions", { user: " Alice@Example.com " })));
  assert.deepEqual(asAlice.subscriptions.map((s) => s.serviceName), ["Notion"]);
  const asBob = await json<{ subscriptions: { serviceName: string }[] }>(await subscriptionsRoute.GET(request("/api/subscriptions", { user: BOB })));
  assert.deepEqual(asBob.subscriptions.map((s) => s.serviceName), ["Figma"]);
});

test("GET /api/subscriptions/:id hides other users' rows", async () => {
  const sub = await createSubscription(ALICE, "Notion");
  assert.equal((await subscriptionRoute.GET(request(`/api/subscriptions/${sub.id}`, { user: BOB }), ctx(sub.id))).status, 404);
  assert.equal((await subscriptionRoute.GET(request(`/api/subscriptions/${sub.id}`, { user: ALICE }), ctx(sub.id))).status, 200);
});

test("PATCH /api/subscriptions/:id cannot modify another user's subscription", async () => {
  const sub = await createSubscription(ALICE, "Notion");
  const response = await subscriptionRoute.PATCH(
    request(`/api/subscriptions/${sub.id}`, { method: "PATCH", user: BOB, json: { serviceName: "Hijacked", cost: 999, status: "canceled" } }), ctx(sub.id));
  assert.equal(response.status, 404);
  const row = db.sqlite.prepare("SELECT service_name, cost_cents, status, user_email FROM subscriptions WHERE id = ?").get(sub.id) as Record<string, unknown>;
  assert.deepEqual({ ...row }, { service_name: "Notion", cost_cents: 1200, status: "active", user_email: ALICE });

  const own = await subscriptionRoute.PATCH(request(`/api/subscriptions/${sub.id}`, { method: "PATCH", user: ALICE, json: { status: "canceled" } }), ctx(sub.id));
  assert.equal(own.status, 200);
  assert.equal((await json<{ subscription: { status: string } }>(own)).subscription.status, "canceled");
});

test("PATCH cannot link a subscription to another user's project or app", async () => {
  const sub = await createSubscription(ALICE, "Notion");
  const bobProject = await createProject(BOB, "Bob's project");
  const bobApp = await createApp(BOB, "Bob's app");
  const viaProject = await subscriptionRoute.PATCH(request(`/api/subscriptions/${sub.id}`, { method: "PATCH", user: ALICE, json: { projectId: bobProject.id } }), ctx(sub.id));
  assert.equal(viaProject.status, 400);
  const viaApp = await subscriptionRoute.PATCH(request(`/api/subscriptions/${sub.id}`, { method: "PATCH", user: ALICE, json: { appId: bobApp.id } }), ctx(sub.id));
  assert.equal(viaApp.status, 400);
  const viaCreate = await subscriptionsRoute.POST(request("/api/subscriptions", { method: "POST", user: ALICE, json: { serviceName: "Figma", projectId: bobProject.id } }));
  assert.equal(viaCreate.status, 400);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions WHERE project_id IS NOT NULL OR app_id IS NOT NULL"), 0);
});

test("DELETE /api/subscriptions/:id cannot remove another user's subscription or its signals", async () => {
  await applySignal(ALICE, parseEmail({ from: "Notion <billing@notion.so>", subject: "Your Notion receipt", body: "Amount paid: $12.00. Your next billing date is 2027-01-01." }));
  const subId = (db.sqlite.prepare("SELECT id FROM subscriptions WHERE user_email = ?").get(ALICE) as { id: string }).id;
  assert.equal(count("SELECT COUNT(*) AS n FROM subscription_signals WHERE subscription_id = ?", subId), 1);

  const response = await subscriptionRoute.DELETE(request(`/api/subscriptions/${subId}`, { method: "DELETE", user: BOB }), ctx(subId));
  assert.equal(response.status, 404);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions WHERE id = ?", subId), 1);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscription_signals WHERE subscription_id = ?", subId), 1);

  const own = await subscriptionRoute.DELETE(request(`/api/subscriptions/${subId}`, { method: "DELETE", user: ALICE }), ctx(subId));
  assert.equal(own.status, 200);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions WHERE id = ?", subId), 0);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscription_signals WHERE subscription_id = ?", subId), 0);
});

test("PATCH/DELETE on projects and apps are isolated per user", async () => {
  const project = await createProject(ALICE, "Rally");
  const app = await createApp(ALICE, "Linear");
  assert.equal((await projectRoute.PATCH(request(`/api/projects/${project.id}`, { method: "PATCH", user: BOB, json: { name: "Stolen" } }), ctx(project.id))).status, 404);
  assert.equal((await projectRoute.DELETE(request(`/api/projects/${project.id}`, { method: "DELETE", user: BOB }), ctx(project.id))).status, 404);
  assert.equal((await appRoute.PATCH(request(`/api/apps/${app.id}`, { method: "PATCH", user: BOB, json: { name: "Stolen" } }), ctx(app.id))).status, 404);
  assert.equal((await appRoute.DELETE(request(`/api/apps/${app.id}`, { method: "DELETE", user: BOB }), ctx(app.id))).status, 404);
  assert.equal(count("SELECT COUNT(*) AS n FROM user_projects WHERE name = 'Rally'"), 1);
  assert.equal(count("SELECT COUNT(*) AS n FROM user_apps WHERE name = 'Linear'"), 1);
});

test("service names are unique per user, not globally", async () => {
  await createSubscription(ALICE, "Notion");
  await createSubscription(BOB, "Notion");
  const dup = await subscriptionsRoute.POST(request("/api/subscriptions", { method: "POST", user: ALICE, json: { serviceName: "Notion" } }));
  assert.equal(dup.status, 400);
  assert.match((await json<{ error: string }>(dup)).error, /already track/);
});

test("ingest persists structured fields only and never the email body", async () => {
  const body = "SECRET-BODY-TOKEN Amount paid: $15.00 for Notion Plus. Renews monthly on 2027-03-01.";
  const response = await ingestRoute.POST(request("/api/gmail/ingest", { method: "POST", user: ALICE, json: { from: "Notion <billing@notion.so>", subject: "Your Notion receipt", body } }));
  assert.equal(response.status, 200);
  const dump = [
    ...db.sqlite.prepare("SELECT * FROM subscriptions").all(),
    ...db.sqlite.prepare("SELECT * FROM subscription_signals").all(),
  ].map((row) => JSON.stringify(row)).join("\n");
  assert.ok(dump.includes("Notion"));
  assert.ok(!dump.includes("SECRET-BODY-TOKEN"));
});

test("concurrent ingest of the same service converges on one subscription row", async () => {
  const emails = [
    { from: "Notion <billing@notion.so>", subject: "Your Notion receipt", body: "Amount paid: $12.00. Next billing date 2027-01-01." },
    { from: "Notion <billing@notion.so>", subject: "Your Notion receipt #2", body: "Amount paid: $12.00. Next billing date 2027-02-01." },
    { from: "Notion <billing@notion.so>", subject: "Notion renewal reminder", body: "Your subscription renews on 2027-02-01 for $12.00." },
    { from: "notion <billing@notion.so>", subject: "Your Notion receipt #3", body: "Amount paid: $12.00. Next billing date 2027-03-01." },
  ];
  const outcomes = await Promise.all(emails.map((email) => applySignal(ALICE, parseEmail(email))));
  const ids = new Set(outcomes.map((o) => o.subscriptionId));
  assert.equal(ids.size, 1, "all concurrent signals must attach to the same subscription");
  assert.equal(outcomes.filter((o) => o.created).length, 1, "exactly one caller creates the row");
  assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions WHERE user_email = ?", ALICE), 1);
  assert.equal(count("SELECT COUNT(*) AS n FROM subscription_signals WHERE user_email = ?", ALICE), emails.length);
});

test("applySignal survives losing the unique-constraint race to a concurrent insert", async () => {
  // Simulate another worker inserting the row between our SELECT (miss) and INSERT.
  const signal = parseEmail({ from: "Figma <billing@figma.com>", subject: "Your Figma receipt", body: "Amount paid: $15.00." });
  const originalPrepare = db.prepare.bind(db);
  let injected = false;
  db.prepare = (sql: string) => {
    if (!injected && /^INSERT INTO subscriptions/.test(sql.trim())) {
      injected = true;
      originalPrepare("INSERT INTO subscriptions (id, user_email, service_name) VALUES ('winner', ?, ?)").bind(ALICE, signal.serviceName).run();
    }
    return originalPrepare(sql);
  };
  try {
    const outcome = await applySignal(ALICE, signal);
    assert.equal(outcome.subscriptionId, "winner");
    assert.equal(outcome.created, false);
    assert.equal(outcome.duplicate, false);
    assert.equal(count("SELECT COUNT(*) AS n FROM subscriptions WHERE user_email = ?", ALICE), 1);
    assert.equal(count("SELECT COUNT(*) AS n FROM subscription_signals WHERE subscription_id = 'winner'"), 1);
  } finally {
    db.prepare = originalPrepare;
  }
});
