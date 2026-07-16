import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const passports = sqliteTable("passports", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  country: text("country").notNull().default(""),
  timezone: text("timezone").notNull().default(""),
  contactOptIn: integer("contact_opt_in", { mode: "boolean" })
    .notNull()
    .default(false),
  primaryDomain: text("primary_domain").notNull(),
  subfieldsJson: text("subfields_json").notNull(),
  summary: text("summary").notNull(),
  scoresJson: text("scores_json").notNull(),
  reliabilityScore: real("reliability_score").notNull(),
  benchmarkScore: real("benchmark_score").notNull(),
  confidence: real("confidence").notNull(),
  evidenceCount: integer("evidence_count").notNull().default(0),
  evidenceRoot: text("evidence_root"),
  protocolVersion: text("protocol_version").notNull(),
  createdAt: text("created_at").notNull(),
});
