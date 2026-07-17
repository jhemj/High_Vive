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
