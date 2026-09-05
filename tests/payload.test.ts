import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPayload, rowToApp, userEmailFromRequest } from "../app/api/apps/payload.ts";

test("cleanPayload requires a name and normalizes fields", () => {
  assert.throws(() => cleanPayload({ name: "   " }), /App name is required/);

  const app = cleanPayload({
    name: "  Notion  ",
    status: "Bogus",
    cost: 12.345,
    confidence: 250,
    projects: ["Launch", " ", "Ops"],
  });

  assert.equal(app.name, "Notion");
  assert.equal(app.initials, "NO");
  assert.equal(app.status, "Needs Review");
  assert.equal(app.monthlyCostCents, 1235);
  assert.equal(app.confidence, 100);
  assert.deepEqual(JSON.parse(app.projectsJson), ["Launch", "Ops"]);
  assert.deepEqual(JSON.parse(app.sourcesJson), ["Manual"]);
});

test("cleanPayload keeps valid statuses and rejects negative cost", () => {
  const app = cleanPayload({ name: "Figma", status: "Trialing", cost: -5 });
  assert.equal(app.status, "Trialing");
  assert.equal(app.monthlyCostCents, 0);
});

test("rowToApp maps DB rows back to UI shape and tolerates bad JSON", () => {
  const app = rowToApp({
    id: "abc",
    name: "Linear",
    initials: "LI",
    tone: "blue",
    category: "Work",
    status: "Active",
    monthly_cost_cents: 800,
    projects_json: "not json",
    sources_json: JSON.stringify(["Gmail"]),
    last_activity: null,
  });

  assert.equal(app.cost, 8);
  assert.equal(app.status, "Active");
  assert.deepEqual(app.projects, []);
  assert.deepEqual(app.sources, ["Gmail"]);
  assert.equal(app.last, "No activity yet");
  assert.equal(app.website, undefined);
});

test("userEmailFromRequest uses the ChatGPT header, falls back only on localhost", () => {
  const signedIn = new Request("https://stackd.example/api/apps", {
    headers: { "oai-authenticated-user-email": "  Riley@Example.com " },
  });
  assert.equal(userEmailFromRequest(signedIn), "riley@example.com");

  assert.equal(userEmailFromRequest(new Request("http://localhost:3000/api/apps")), "local@stackd.dev");
  assert.equal(userEmailFromRequest(new Request("https://stackd.example/api/apps")), null);
});
