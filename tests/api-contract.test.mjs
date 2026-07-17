import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "../app/api/v1/assessments/route.ts",
  "../app/api/v1/assessments/[id]/commit/route.ts",
  "../app/api/v1/assessments/[id]/challenge/route.ts",
  "../app/api/v1/assessments/[id]/submit/route.ts",
  "../app/api/v1/passports/[id]/publish/route.ts",
  "../app/api/v1/passports/[id]/revoke/route.ts",
  "../app/api/v1/leaderboards/route.ts",
  "../app/api/v1/profiles/[handle]/route.ts",
];

test("v1 lifecycle routes exist", async () => {
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
});

test("submit route recalculates all public rating fields", async () => {
  const source = await readFile(new URL("../app/api/v1/assessments/[id]/submit/route.ts", import.meta.url), "utf8");
  assert.match(source, /SUBMISSION_FIELDS/);
  assert.match(source, /SUBMISSION_FIELD_UNSUPPORTED/);
  assert.match(source, /calculateCalibratedOvr/);
  assert.match(source, /calculateHvRating/);
  assert.match(source, /calculateReliability/);
  assert.match(source, /calculateTier/);
  assert.match(source, /INSERT INTO passport_versions/);
  assert.doesNotMatch(source, /ON CONFLICT\s*\(nickname\)/i);
});

test("leaderboard ranks in D1, not after a 50-row memory slice", async () => {
  const source = await readFile(new URL("../packages/shared/leaderboards.ts", import.meta.url), "utf8");
  assert.match(source, /ORDER BY pv\.hv_rating DESC, pv\.reliability_score DESC/);
  assert.match(source, /LIMIT \? OFFSET \?/);
  assert.match(source, /pv\.evidence_level IN \('E2','E3','E4','E5'\)/);
});
