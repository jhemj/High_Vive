import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

let schemaPromise: Promise<void> | null = null;

export function ensureDbSchema() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB`.",
    );
  }

  schemaPromise ??= env.DB
    .batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS passports (
          id TEXT PRIMARY KEY,
          nickname TEXT NOT NULL UNIQUE,
          country TEXT NOT NULL DEFAULT '',
          timezone TEXT NOT NULL DEFAULT '',
          contact_opt_in INTEGER NOT NULL DEFAULT 0,
          primary_domain TEXT NOT NULL,
          subfields_json TEXT NOT NULL,
          summary TEXT NOT NULL,
          scores_json TEXT NOT NULL,
          witness_level TEXT NOT NULL,
          benchmark_score INTEGER NOT NULL,
          confidence REAL NOT NULL,
          evidence_count INTEGER NOT NULL DEFAULT 0,
          evidence_root TEXT,
          protocol_version TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `),
      env.DB.prepare(
        "CREATE INDEX IF NOT EXISTS passports_score_idx ON passports (benchmark_score DESC, created_at DESC)",
      ),
      env.DB.prepare(
        "CREATE INDEX IF NOT EXISTS passports_domain_idx ON passports (primary_domain, benchmark_score DESC)",
      ),
    ])
    .then(() => undefined)
    .catch((error) => {
      schemaPromise = null;
      throw error;
    });

  return schemaPromise;
}

export function getD1() {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
}
