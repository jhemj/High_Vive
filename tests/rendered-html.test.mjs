import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the v1 Official/Open HV Rating leaderboard contract", async () => {
  const [app, layout, profile, connect] = await Promise.all([
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/u/[handle]/profile-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/connect/connect-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /OFFICIAL/);
  assert.match(app, /OPEN/);
  assert.match(app, /HV RATING/);
  assert.match(app, /보정 OVR|CALIBRATED OVR/);
  assert.match(app, /Evidence|증거 단계/);
  assert.match(app, /Provisional Tier|잠정 티어/);
  assert.match(app, /\/api\/v1\/leaderboards/);
  assert.match(app, /\/api\/v1\/assessments/);
  assert.match(app, /publishPassport/);
  assert.match(profile, /PASSPORT HISTORY/);
  assert.match(connect, /CLI DEVICE LOGIN/);
  assert.match(layout, /HV Rating/);
  assert.doesNotMatch(`${app}${layout}${profile}`, /\bELO\b|PERCENTILE|백분위/);
  assert.doesNotMatch(app, /textarea|passport-json/);
});

test("keeps local-first privacy and server-zero-LLM copy explicit", async () => {
  const app = await readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8");
  assert.match(app, /SERVER LLM CALLS 0/);
  assert.match(app, /Codex 대화 원문/);
  assert.match(app, /commitment/);
  assert.match(app, /Merkle root/);
  assert.match(app, /신원, 전체 업무 이력, 실제 성과/);
});
