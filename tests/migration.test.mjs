
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("v1 migration creates append-only schema and imports legacy as E0", async () => {
  const migration = await readFile(new URL("../drizzle/0002_closed_bishop.sql", import.meta.url), "utf8");
  for (const table of ["users", "profiles", "assessment_sessions", "evidence_commitments", "passport_versions", "passport_metric_evidence", "sample_proofs", "audit_events"]) {
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  }
  assert.match(migration, /'E0'/);
  assert.match(migration, /'LEGACY'/);
  assert.match(migration, /high-vive-witness-v0\.2/);
  assert.match(migration, /passport_category_rating_idx/);
});

test("runtime database helper never creates schema", async () => {
  const source = await readFile(new URL("../db/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /CREATE TABLE|ensureDbSchema/);
});

test("submitted official Passports are migrated to automatic publication", async () => {
  const migration = await readFile(new URL("../drizzle/0003_auto_publish_submitted.sql", import.meta.url), "utf8");
  assert.match(migration, /status` = 'PUBLISHED'/);
  assert.match(migration, /evidence_level` IN \('E2', 'E3', 'E4', 'E5'\)/);
  assert.match(migration, /reliability_score` >= 60/);
  assert.match(migration, /current_passport_id/);
});

test("profile category and throttled rating refresh have deploy-time schema", async () => {
  const migration = await readFile(new URL("../drizzle/0005_lovely_iceman.sql", import.meta.url), "utf8");
  assert.match(migration, /preferred_category/);
  assert.match(migration, /league_refresh_state/);
  assert.match(migration, /1970-01-01T00:00:00\.000Z/);
  assert.doesNotMatch(migration, /CREATE TABLE `browser_sessions`/);
  assert.doesNotMatch(migration, /CREATE TABLE `passkey_credentials`/);
});

test("the first live Passport reset preserves the account while clearing its assessment", async () => {
  const migration = await readFile(new URL("../drizzle/0006_reset_first_live_passport.sql", import.meta.url), "utf8");
  assert.match(migration, /psp_d95d4fe0c8eb4d8d887390ea2d02dbd9/);
  assert.match(migration, /current_passport_id` = NULL/);
  assert.match(migration, /DELETE FROM `passport_versions`/);
  assert.match(migration, /DELETE FROM `assessment_sessions`/);
  assert.doesNotMatch(migration, /DELETE FROM `users`/);
  assert.doesNotMatch(migration, /DELETE FROM `profiles`/);
});

test("the one-time ngmptdz reset clears the account, profile, credentials, and benchmark history", async () => {
  const migration = await readFile(new URL("../drizzle/0007_reset_ngmptdz_benchmark_history.sql", import.meta.url), "utf8");
  for (const table of [
    "passport_versions", "assessment_sessions", "evidence_commitments", "sample_proofs", "benchmark_runs",
    "idempotency_keys", "rate_limit_buckets", "passkey_credentials", "browser_sessions", "api_tokens",
    "auth_device_sessions", "auth_identities", "audit_events", "profile_handle_history", "users", "profiles",
  ]) {
    assert.match(migration, new RegExp("DELETE FROM `" + table + "`"));
  }
  assert.match(migration, /handle` = 'ngmptdz'/);
  assert.match(migration, /current_passport_id` = NULL/);
  assert.match(migration, /substr\([\s\S]*assessment:create:/);
  assert.doesNotMatch(migration, /LIKE 'assessment:create:/);
  assert.match(migration, /DELETE FROM `passports`[\s\S]*nickname` = 'ngmptdz'/);
});
