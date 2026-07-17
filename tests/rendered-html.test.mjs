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
  assert.match(app, /전체 랭킹|Overall/);
  assert.match(app, /분야별|Categories/);
  assert.match(app, /국가별|Countries/);
  assert.match(app, /countryLabel/);
  assert.match(app, /personalSettings|개인 설정|Settings/);
  assert.match(app, /\/api\/v1\/me/);
  assert.doesNotMatch(app, /publishPassport/);
  assert.match(app, /리더보드 등록|Join the leaderboard/);
  assert.match(app, /Claude Code/);
  assert.match(app, /HIGH-VIVE란\?|WHAT IS HIGH-VIVE\?/);
  assert.match(app, /AUTOMATED LOCAL SCAN/);
  assert.match(app, /YOUR AI KNOWS YOUR VIBE/);
  assert.match(app, /전 세계 바이브코더|vibe coders worldwide/);
  assert.doesNotMatch(app, /\["COMMIT"|\["CHALLENGE"/);
  assert.match(app, /내 고유 주소 \(Handle\)|Your unique URL \(Handle\)/);
  assert.match(app, /리더보드 닉네임|Leaderboard nickname/);
  assert.match(app, /최대 10분|up to 10 minutes/);
  assert.match(app, /이 창을 닫지 마세요|Keep this window open/);
  assert.doesNotMatch(app, /useState\("ngmptdz"\)/);
  assert.match(app, /HIGH_VIVE_AGENT/);
  assert.match(app, /useState<Locale>\(initialLocale\)/);
  assert.doesNotMatch(app, /useState<Locale>\(\(\) =>/);
  assert.match(app, /detectPlatform/);
  assert.match(app, /Windows/);
  assert.match(app, /macOS/);
  assert.match(app, /Ubuntu/);
  assert.match(app, /codex:\/\/new/);
  assert.match(app, /claude:\/\/code\/new\?q=/);
  assert.match(app, /Claude Code로 평가 시작|Start assessment with Claude Code/);
  assert.match(app, /install-high-vive\.ps1/);
  assert.match(app, /install-high-vive\.sh/);
  assert.doesNotMatch(app, /assessment\.command|assessment\.uploadToken/);
  assert.match(profile, /PASSPORT HISTORY/);
  assert.match(connect, /CLI DEVICE LOGIN/);
  assert.match(layout, /HV Rating/);
  assert.doesNotMatch(`${app}${layout}${profile}`, /\bELO\b|PERCENTILE|백분위/);
  assert.doesNotMatch(app, /textarea|passport-json/);
});

test("keeps local-first privacy copy without the removed footer slogan", async () => {
  const app = await readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /내 기기에서 AI 평가 · 서버 LLM 재평가 0회|AI assessment runs locally · 0 server LLM re-evaluations/);
  assert.match(app, /대화 원문과 로컬 파일|transcripts and local files/);
  assert.match(app, /평가 결과와 확인용 정보|assessment result and verification details/);
  assert.match(app, /신원, 전체 업무 이력, 실제 성과/);
});
