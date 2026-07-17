import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Read-only legacy table. v1 routes never update it; migration 0002 imports rows
// into append-only passport_versions as E0 records.
export const legacyPassports = sqliteTable("passports", {
  id: text("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  country: text("country").notNull().default(""),
  timezone: text("timezone").notNull().default(""),
  contactOptIn: integer("contact_opt_in", { mode: "boolean" }).notNull().default(false),
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

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("ACTIVE"),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const authIdentities = sqliteTable("auth_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  providerSubject: text("provider_subject").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("auth_identity_provider_subject_uq").on(table.provider, table.providerSubject),
  index("auth_identity_user_idx").on(table.userId),
]);

export const authDeviceSessions = sqliteTable("auth_device_sessions", {
  id: text("id").primaryKey(),
  deviceCodeHash: text("device_code_hash").notNull().unique(),
  userCode: text("user_code").notNull().unique(),
  status: text("status").notNull().default("PENDING"),
  userId: text("user_id"),
  expiresAt: text("expires_at").notNull(),
  approvedAt: text("approved_at"),
  consumedAt: text("consumed_at"),
  createdAt: text("created_at").notNull(),
});

export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label").notNull().default("High-Vive CLI"),
  expiresAt: text("expires_at").notNull(),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("api_tokens_user_idx").on(table.userId)]);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  country: text("country").notNull().default(""),
  timezone: text("timezone").notNull().default(""),
  languagesJson: text("languages_json").notNull().default("[]"),
  linksJson: text("links_json").notNull().default("[]"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  currentPassportId: text("current_passport_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("profiles_user_uq").on(table.userId),
  index("profiles_public_idx").on(table.isPublic),
]);

export const profileHandleHistory = sqliteTable("profile_handle_history", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  previousHandle: text("previous_handle"),
  newHandle: text("new_handle").notNull(),
  changedAt: text("changed_at").notNull(),
}, (table) => [index("profile_handle_history_profile_idx").on(table.profileId, table.changedAt)]);

export const assessmentSessions = sqliteTable("assessment_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  profileId: text("profile_id").notNull(),
  status: text("status").notNull(),
  protocolVersion: text("protocol_version").notNull(),
  scannerVersion: text("scanner_version").notNull(),
  canonicalizationVersion: text("canonicalization_version").notNull(),
  redactionVersion: text("redaction_version").notNull(),
  uploadTokenHash: text("upload_token_hash").notNull().unique(),
  nonceHash: text("nonce_hash"),
  selectionSeed: text("selection_seed"),
  challengeVersion: text("challenge_version"),
  expiresAt: text("expires_at").notNull(),
  committedAt: text("committed_at"),
  challengedAt: text("challenged_at"),
  assessedAt: text("assessed_at"),
  submittedAt: text("submitted_at"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("assessment_user_idx").on(table.userId, table.createdAt),
  index("assessment_status_idx").on(table.status, table.expiresAt),
]);

export const evidenceCommitments = sqliteTable("evidence_commitments", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().unique(),
  historyRoot: text("history_root").notNull(),
  rootAlgorithm: text("root_algorithm").notNull().default("sha256-merkle-v1"),
  sessionCount: integer("session_count").notNull(),
  recordCount: integer("record_count").notNull(),
  activeDays: integer("active_days").notNull(),
  dateFrom: text("date_from").notNull(),
  dateTo: text("date_to").notNull(),
  scopeJson: text("scope_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("evidence_history_assessment_uq").on(table.assessmentId, table.historyRoot),
  index("evidence_history_root_idx").on(table.historyRoot),
]);

export const passportVersions = sqliteTable("passport_versions", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  assessmentId: text("assessment_id").unique(),
  previousVersionId: text("previous_version_id"),
  status: text("status").notNull().default("SUBMITTED"),
  category: text("category").notNull(),
  subfieldsJson: text("subfields_json").notNull(),
  summaryJson: text("summary_json").notNull(),
  strengthsJson: text("strengths_json").notNull(),
  weaknessesJson: text("weaknesses_json").notNull(),
  rawScoresJson: text("raw_scores_json").notNull(),
  calibratedScoresJson: text("calibrated_scores_json").notNull(),
  ovr: real("ovr").notNull(),
  hvRating: integer("hv_rating").notNull(),
  tier: text("tier").notNull(),
  tierDivision: text("tier_division"),
  reliabilityScore: real("reliability_score").notNull(),
  evidenceLevel: text("evidence_level").notNull(),
  evaluatorJson: text("evaluator_json").notNull(),
  limitationsJson: text("limitations_json").notNull(),
  payloadHash: text("payload_hash").notNull().unique(),
  protocolVersion: text("protocol_version").notNull(),
  legacyEloRating: integer("legacy_elo_rating"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("passport_profile_published_idx").on(table.profileId, table.publishedAt),
  index("passport_category_rating_idx").on(table.category, table.hvRating, table.reliabilityScore),
  index("passport_public_rating_idx").on(table.publishedAt, table.hvRating, table.reliabilityScore),
]);

export const passportMetricEvidence = sqliteTable("passport_metric_evidence", {
  id: text("id").primaryKey(),
  passportId: text("passport_id").notNull(),
  metricKey: text("metric_key").notNull(),
  rawScore: real("raw_score").notNull(),
  calibratedScore: real("calibrated_score").notNull(),
  confidence: real("confidence").notNull(),
  rationale: text("rationale").notNull(),
  supportingRefsJson: text("supporting_refs_json").notNull(),
  counterRefsJson: text("counter_refs_json").notNull(),
  limitation: text("limitation").notNull().default(""),
}, (table) => [
  uniqueIndex("passport_metric_uq").on(table.passportId, table.metricKey),
  index("passport_metric_passport_idx").on(table.passportId),
]);

export const sampleProofs = sqliteTable("sample_proofs", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull(),
  sampleRef: text("sample_ref").notNull(),
  sampleHash: text("sample_hash").notNull(),
  proofJson: text("proof_json").notNull(),
  redactedExcerpt: text("redacted_excerpt"),
  visibility: text("visibility").notNull().default("PRIVATE"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("sample_assessment_ref_uq").on(table.assessmentId, table.sampleRef),
  index("sample_assessment_idx").on(table.assessmentId),
]);

export const benchmarkRuns = sqliteTable("benchmark_runs", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull(),
  benchmarkVersion: text("benchmark_version").notNull(),
  status: text("status").notNull(),
  resultJson: text("result_json").notNull(),
  score: real("score").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("benchmark_assessment_idx").on(table.assessmentId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("audit_resource_idx").on(table.resourceType, table.resourceId, table.createdAt),
  index("audit_actor_idx").on(table.actorUserId, table.createdAt),
]);

export const idempotencyKeys = sqliteTable("idempotency_keys", {
  id: text("id").primaryKey(),
  actorKey: text("actor_key").notNull(),
  route: text("route").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  responseStatus: integer("response_status").notNull(),
  responseJson: text("response_json").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idempotency_actor_route_key_uq").on(table.actorKey, table.route, table.idempotencyKey)]);

export const rateLimitBuckets = sqliteTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: text("reset_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
