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
  assert.match(source, /buildSkillOnlyPublicProfile/);
  assert.match(source, /skillOnlyMetricRationale/);
  assert.match(source, /INSERT INTO passport_versions/);
  assert.match(source, /'PUBLISHED'/);
  assert.match(source, /current_passport_id = \?/);
  assert.match(source, /publishRequired: false/);
  assert.doesNotMatch(source, /ON CONFLICT\s*\(nickname\)/i);
});

test("leaderboard ranks in D1, not after a 50-row memory slice", async () => {
  const source = await readFile(new URL("../packages/shared/leaderboards.ts", import.meta.url), "utf8");
  assert.match(source, /ORDER BY pv\.hv_rating DESC, effectiveReliability DESC/);
  assert.match(source, /LIMIT \? OFFSET \?/);
  assert.match(source, /pv\.evidence_level IN \('E2','E3','E4','E5'\)/);
  assert.match(source, /p\.current_passport_id = pv\.id/);
  assert.match(source, /effectiveReliability/);
  assert.match(source, /AVG\(pv\.hv_rating\)/);
  assert.match(source, /GROUP BY p\.country/);
  assert.match(source, /categoryStandings/);
  assert.match(source, /preferred_category/);
  assert.match(source, /Promise\.all/);
  assert.doesNotMatch(source, /s-maxage=/);
  assert.match(source, /countryFilter|country/);
});

test("legacy and new public Passports expose skill-only narrative", async () => {
  const [serializer, passportRoute, cli] = await Promise.all([
    readFile(new URL("../packages/shared/passports.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/passports/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../packages/cli/src/index.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(serializer, /buildSkillOnlyPublicProfile/);
  assert.match(passportRoute, /skillOnlyMetricRationale/);
  assert.match(cli, /Project-content firewall/);
  assert.match(cli, /applySkillOnlyPublicCopy/);
  assert.match(cli, /subfields as an empty array/);
});

test("private Passport visibility is preserved and removed from every public surface", async () => {
  const [profileUpdate, leaderboard, profileRoute, passportRoute] = await Promise.all([
    readFile(new URL("../app/api/v1/me/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../packages/shared/leaderboards.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/profiles/[handle]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/passports/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(profileUpdate, /payload\.isPublic === undefined/);
  assert.match(profileUpdate, /INVALID_VISIBILITY/);
  assert.match(leaderboard, /p\.is_public = 1/);
  assert.match(profileRoute, /is_public = 1/);
  assert.match(passportRoute, /p\.is_public = 1/);
  assert.doesNotMatch(`${leaderboard}${profileRoute}`, /stale-while-revalidate|s-maxage=/);
});

test("authenticated account deletion permanently removes owned account data", async () => {
  const source = await readFile(new URL("../app/api/v1/me/route.ts", import.meta.url), "utf8");
  assert.match(source, /ACCOUNT_DELETE_CONFIRMATION_INVALID/);
  assert.match(source, /payload\.confirmation !== profile\.handle/);
  for (const table of [
    "passport_metric_evidence", "sample_proofs", "benchmark_runs", "evidence_commitments",
    "passport_versions", "assessment_sessions", "passkey_credentials", "browser_sessions",
    "api_tokens", "auth_device_sessions", "auth_identities", "profile_handle_history", "profiles", "users",
  ]) assert.match(source, new RegExp(`DELETE FROM ${table}`));
  assert.match(source, /Max-Age=0/);
  assert.doesNotMatch(source, /UPDATE users SET status = 'DELETED'/);
});

test("my info response includes private Passport history and reassessment timing", async () => {
  const source = await readFile(new URL("../app/api/v1/me/route.ts", import.meta.url), "utf8");
  assert.match(source, /passportOverview/);
  assert.match(source, /passportHistory/);
  assert.match(source, /highestPassport/);
  assert.match(source, /nextEligibleAt/);
  assert.match(source, /7 \* 86400000/);
});

test("weekly reassessment limit is consumed only by a published Passport", async () => {
  const [createRoute, submitRoute, ratings] = await Promise.all([
    readFile(new URL("../app/api/v1/assessments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/assessments/[id]/submit/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../packages/shared/ratings.ts", import.meta.url), "utf8"),
  ]);
  assert.match(createRoute, /published_at IS NOT NULL/);
  assert.match(createRoute, /7 \* 86400000/);
  assert.match(createRoute, /ASSESSMENT_WEEKLY_LIMIT/);
  assert.doesNotMatch(createRoute, /created_at AS publishedAt FROM assessment_sessions/);
  assert.match(submitRoute, /refreshLeagueRatings/);
  assert.match(ratings, /cohortPositions/);
  assert.match(ratings, /calculateEffectiveReliability/);
  assert.match(ratings, /calculateHvRating/);
  assert.match(ratings, /RATING_REFRESH_INTERVAL_MS/);
  assert.match(ratings, /league_refresh_state/);
  assert.match(submitRoute, /refreshLeagueRatings\(\{ force: true \}\)/);
});

test("prepare removes stale public assessment artifacts before requesting a new session", async () => {
  const cli = await readFile(new URL("../packages/cli/src/index.mjs", import.meta.url), "utf8");
  for (const file of ["assessment.json", "sample-manifest.json", "assessment-instructions.md", "passport-draft.json", "submission-manifest.json"]) {
    assert.match(cli, new RegExp('"' + file.replaceAll(".", "\\.") + '"'));
  }
  assert.match(cli, /STALE_ASSESSMENT_FILES\.map/);
  assert.match(cli, /rm\(join\(directory, name\), \{ force: true \}\)/);
});

test("country defaults come from the connection and remain user-editable", async () => {
  const [server, meRoute, profileRoute, ui] = await Promise.all([
    readFile(new URL("../packages/shared/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/me/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/me/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(server, /countryFromRequest/);
  assert.match(meRoute, /suggestedCountry/);
  assert.match(profileRoute, /isSupportedCountry/);
  assert.match(profileRoute, /preferredCategory/);
  assert.match(profileRoute, /INVALID_CATEGORY/);
  assert.match(ui, /settingsOpen/);
  assert.match(ui, /saveSettings/);
  assert.match(ui, /viewCategoryRank/);
  assert.match(ui, /standingsView/);
  assert.doesNotMatch(ui, /onSubmit=\{saveProfile\}[\s\S]{0,600}COUNTRY_CODES/);
});

test("browser onboarding polls the owned latest assessment without exposing a command", async () => {
  const [createRoute, meRoute] = await Promise.all([
    readFile(new URL("../app/api/v1/assessments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/me/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(createRoute, /command:\s*`|npx high-vive/);
  assert.match(meRoute, /latestAssessment/);
  assert.match(meRoute, /WHERE user_id = \?/);
  assert.doesNotMatch(meRoute, /upload_token_hash|nonce_hash|selection_seed/);
});

test("cross-platform installers and automatic CLI login are part of the release", async () => {
  const [windowsInstaller, unixInstaller, cli] = await Promise.all([
    readFile(new URL("../scripts/install-high-vive.ps1", import.meta.url), "utf8"),
    readFile(new URL("../scripts/install-high-vive.sh", import.meta.url), "utf8"),
    readFile(new URL("../packages/cli/src/index.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(windowsInstaller, /winget install --id OpenJS\.NodeJS\.LTS/);
  assert.match(unixInstaller, /Darwin/);
  assert.match(unixInstaller, /Linux/);
  assert.match(unixInstaller, /nvm install 22/);
  assert.match(cli, /ensureConfig/);
  assert.match(cli, /prepareAssessment/);
  assert.match(cli, /@openai\/codex/);
  assert.match(cli, /runClaude/);
  assert.match(cli, /Published automatically/);
  assert.doesNotMatch(cli, /Submit this public Passport manifest/);
  assert.match(windowsInstaller, /@anthropic-ai\/claude-code/);
  assert.match(unixInstaller, /@anthropic-ai\/claude-code/);
});

test("local Cloudflare runtime config has one supported compatibility source", async () => {
  const [viteConfig, wranglerConfig] = await Promise.all([
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(viteConfig, /compatibility_flags/);
  assert.match(wranglerConfig, /"compatibility_flags": \["nodejs_compat"\]/);
  assert.match(wranglerConfig, /"compatibility_date": "2026-05-22"/);
});

test("provider-neutral browser auth supports Passkeys and ChatGPT without coupling Claude Code to ChatGPT", async () => {
  const [passkeyVerify, server, mainUi, connectUi] = await Promise.all([
    readFile(new URL("../app/api/v1/auth/passkey/verify/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../packages/shared/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/passkey-auth.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/connect/connect-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(passkeyVerify, /verifyPasskeyAssertion/);
  assert.match(passkeyVerify, /PASSKEY_CHALLENGE_REPLAY/);
  assert.match(server, /browser_sessions/);
  assert.match(mainUi, /Both Codex and Claude Code are supported/);
  assert.match(mainUi, /Create an account with Passkey/);
  assert.match(mainUi, /NotAllowedError/);
  assert.ok(mainUi.indexOf("Create an account with Passkey") < mainUi.indexOf("Sign in with Passkey"));
  assert.match(mainUi, /Start with ChatGPT/);
  assert.match(connectUi, /PasskeyAuth/);
});
