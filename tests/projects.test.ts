import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanProject, retagProjects, rowToProject } from "../app/api/projects/payload.ts";

test("cleanProject requires a name and falls back to a valid accent", () => {
  assert.throws(() => cleanProject({ name: " " }), /Project name is required/);
  assert.deepEqual(cleanProject({ name: " Rally ", accent: "neon" }), { name: "Rally", description: "", accent: "cobalt" });
  assert.equal(cleanProject({ name: "Rally", accent: "mint" }).accent, "mint");
});

test("rowToProject maps a DB row", () => {
  const project = rowToProject({ id: "p1", name: "Rally", description: null, accent: "coral", updated_at: "2026-01-01" });
  assert.deepEqual(project, { id: "p1", name: "Rally", description: "", accent: "coral", updatedAt: "2026-01-01" });
});

test("retagProjects renames, removes, dedupes, and reports no-ops", () => {
  assert.equal(retagProjects(["Ops"], "Rally", "Rally 2"), null);
  assert.deepEqual(retagProjects(["Rally", "Ops"], "Rally", "Rally 2"), ["Rally 2", "Ops"]);
  assert.deepEqual(retagProjects(["Rally", "Ops"], "Rally", null), ["Ops"]);
  assert.deepEqual(retagProjects(["Rally", "Ops"], "Rally", "Ops"), ["Ops"]);
});
