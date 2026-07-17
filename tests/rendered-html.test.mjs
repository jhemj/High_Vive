import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the public official HV Rating leaderboard contract", async () => {
  const [app, layout, profile, connect] = await Promise.all([
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/u/[handle]/profile-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/connect/connect-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /OFFICIAL/);
  assert.doesNotMatch(app, /Legacy · Self-reported|Includes legacy|emptyOpen|openHelp/);
  assert.match(app, /HV RATING/);
  assert.match(app, /보정 OVR|CALIBRATED OVR/);
  assert.match(app, /Evidence|증거 단계/);
  assert.match(app, /Provisional Tier|잠정 티어/);
  assert.match(app, /\/api\/v1\/leaderboards/);
  assert.match(app, /\/api\/v1\/me/);
  assert.doesNotMatch(app, /publishPassport/);
  assert.match(app, /Automatic publish|자동 공개/);
  assert.match(app, /Claude Code/);
  assert.match(app, /HIGH_VIVE_AGENT/);
  assert.match(app, /useState<Locale>\(initialLocale\)/);
  assert.doesNotMatch(app, /useState<Locale>\(\(\) =>/);
  assert.match(app, /detectPlatform/);
  assert.match(app, /Windows/);
  assert.match(app, /macOS/);
  assert.match(app, /Ubuntu/);
  assert.match(app, /codex:\/\/new/);
  assert.match(app, /install-high-vive\.ps1/);
  assert.match(app, /install-high-vive\.sh/);
  assert.doesNotMatch(app, /assessment\.command|assessment\.uploadToken/);
  assert.match(profile, /PASSPORT HISTORY/);
  assert.match(connect, /CLI DEVICE LOGIN/);
  assert.match(layout, /HV Rating/);
  assert.doesNotMatch(`${app}${layout}${profile}`, /\bELO\b|PERCENTILE|백분위/);
  assert.doesNotMatch(app, /textarea|passport-json/);
});

test("keeps local-first privacy and server-zero-LLM copy explicit", async () => {
  const app = await readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8");
  assert.match(app, /SERVER LLM CALLS 0/);
  assert.match(app, /Codex·Claude Code 대화 원문/);
  assert.match(app, /commitment/);
  assert.match(app, /Merkle root/);
  assert.match(app, /신원, 전체 업무 이력, 실제 성과/);
});
