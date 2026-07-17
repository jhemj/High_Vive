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
  assert.match(source, /'PUBLISHED'/);
  assert.match(source, /current_passport_id = \?/);
  assert.match(source, /publishRequired: false/);
  assert.doesNotMatch(source, /ON CONFLICT\s*\(nickname\)/i);
});

test("leaderboard ranks in D1, not after a 50-row memory slice", async () => {
  const source = await readFile(new URL("../packages/shared/leaderboards.ts", import.meta.url), "utf8");
  assert.match(source, /ORDER BY pv\.hv_rating DESC, pv\.reliability_score DESC/);
  assert.match(source, /LIMIT \? OFFSET \?/);
  assert.match(source, /pv\.evidence_level IN \('E2','E3','E4','E5'\)/);
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
  assert.match(mainUi, /Claude Code users do not need a ChatGPT account/);
  assert.match(mainUi, /Start with a new Passkey/);
  assert.match(mainUi, /NotAllowedError/);
  assert.ok(mainUi.indexOf("Start with a new Passkey") < mainUi.indexOf("Sign in with an existing Passkey"));
  assert.match(mainUi, /Continue with ChatGPT/);
  assert.match(connectUi, /PasskeyAuth/);
});
