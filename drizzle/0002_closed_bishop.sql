CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text DEFAULT 'High-Vive CLI' NOT NULL,
	`expires_at` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `api_tokens_user_idx` ON `api_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `assessment_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`status` text NOT NULL,
	`protocol_version` text NOT NULL,
	`scanner_version` text NOT NULL,
	`canonicalization_version` text NOT NULL,
	`redaction_version` text NOT NULL,
	`upload_token_hash` text NOT NULL,
	`nonce_hash` text,
	`selection_seed` text,
	`challenge_version` text,
	`expires_at` text NOT NULL,
	`committed_at` text,
	`challenged_at` text,
	`assessed_at` text,
	`submitted_at` text,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_sessions_upload_token_hash_unique` ON `assessment_sessions` (`upload_token_hash`);--> statement-breakpoint
CREATE INDEX `assessment_user_idx` ON `assessment_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `assessment_status_idx` ON `assessment_sessions` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`event_type` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_resource_idx` ON `audit_events` (`resource_type`,`resource_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `auth_device_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code_hash` text NOT NULL,
	`user_code` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`user_id` text,
	`expires_at` text NOT NULL,
	`approved_at` text,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_device_sessions_device_code_hash_unique` ON `auth_device_sessions` (`device_code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_device_sessions_user_code_unique` ON `auth_device_sessions` (`user_code`);--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_subject` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_identity_provider_subject_uq` ON `auth_identities` (`provider`,`provider_subject`);--> statement-breakpoint
CREATE INDEX `auth_identity_user_idx` ON `auth_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `benchmark_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`benchmark_version` text NOT NULL,
	`status` text NOT NULL,
	`result_json` text NOT NULL,
	`score` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `benchmark_assessment_idx` ON `benchmark_runs` (`assessment_id`);--> statement-breakpoint
CREATE TABLE `evidence_commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`history_root` text NOT NULL,
	`root_algorithm` text DEFAULT 'sha256-merkle-v1' NOT NULL,
	`session_count` integer NOT NULL,
	`record_count` integer NOT NULL,
	`active_days` integer NOT NULL,
	`date_from` text NOT NULL,
	`date_to` text NOT NULL,
	`scope_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_commitments_assessment_id_unique` ON `evidence_commitments` (`assessment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_history_assessment_uq` ON `evidence_commitments` (`assessment_id`,`history_root`);--> statement-breakpoint
CREATE INDEX `evidence_history_root_idx` ON `evidence_commitments` (`history_root`);--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_key` text NOT NULL,
	`route` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`response_status` integer NOT NULL,
	`response_json` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_actor_route_key_uq` ON `idempotency_keys` (`actor_key`,`route`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `passport_metric_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`passport_id` text NOT NULL,
	`metric_key` text NOT NULL,
	`raw_score` real NOT NULL,
	`calibrated_score` real NOT NULL,
	`confidence` real NOT NULL,
	`rationale` text NOT NULL,
	`supporting_refs_json` text NOT NULL,
	`counter_refs_json` text NOT NULL,
	`limitation` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passport_metric_uq` ON `passport_metric_evidence` (`passport_id`,`metric_key`);--> statement-breakpoint
CREATE INDEX `passport_metric_passport_idx` ON `passport_metric_evidence` (`passport_id`);--> statement-breakpoint
CREATE TABLE `passport_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`assessment_id` text,
	`previous_version_id` text,
	`status` text DEFAULT 'SUBMITTED' NOT NULL,
	`category` text NOT NULL,
	`subfields_json` text NOT NULL,
	`summary_json` text NOT NULL,
	`strengths_json` text NOT NULL,
	`weaknesses_json` text NOT NULL,
	`raw_scores_json` text NOT NULL,
	`calibrated_scores_json` text NOT NULL,
	`ovr` real NOT NULL,
	`hv_rating` integer NOT NULL,
	`tier` text NOT NULL,
	`tier_division` text,
	`reliability_score` real NOT NULL,
	`evidence_level` text NOT NULL,
	`evaluator_json` text NOT NULL,
	`limitations_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`protocol_version` text NOT NULL,
	`legacy_elo_rating` integer,
	`is_demo` integer DEFAULT false NOT NULL,
	`published_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passport_versions_assessment_id_unique` ON `passport_versions` (`assessment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `passport_versions_payload_hash_unique` ON `passport_versions` (`payload_hash`);--> statement-breakpoint
CREATE INDEX `passport_profile_published_idx` ON `passport_versions` (`profile_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `passport_category_rating_idx` ON `passport_versions` (`category`,`hv_rating`,`reliability_score`);--> statement-breakpoint
CREATE INDEX `passport_public_rating_idx` ON `passport_versions` (`published_at`,`hv_rating`,`reliability_score`);--> statement-breakpoint
CREATE TABLE `profile_handle_history` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`previous_handle` text,
	`new_handle` text NOT NULL,
	`changed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_handle_history_profile_idx` ON `profile_handle_history` (`profile_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT '' NOT NULL,
	`languages_json` text DEFAULT '[]' NOT NULL,
	`links_json` text DEFAULT '[]' NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`current_passport_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_handle_unique` ON `profiles` (`handle`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_user_uq` ON `profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `profiles_public_idx` ON `profiles` (`is_public`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sample_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`sample_ref` text NOT NULL,
	`sample_hash` text NOT NULL,
	`proof_json` text NOT NULL,
	`redacted_excerpt` text,
	`visibility` text DEFAULT 'PRIVATE' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sample_assessment_ref_uq` ON `sample_proofs` (`assessment_id`,`sample_ref`);--> statement-breakpoint
CREATE INDEX `sample_assessment_idx` ON `sample_proofs` (`assessment_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT OR IGNORE INTO `profiles` (
	`id`, `user_id`, `handle`, `display_name`, `bio`, `country`, `timezone`,
	`languages_json`, `links_json`, `is_public`, `current_passport_id`, `created_at`, `updated_at`
)
SELECT
	'legacy_profile_' || `id`, NULL, `nickname`, `nickname`, '', `country`, `timezone`,
	'[]', '[]', 1, 'legacy_passport_' || `id`, `created_at`, `created_at`
FROM `passports`;
--> statement-breakpoint
INSERT OR IGNORE INTO `profile_handle_history` (`id`, `profile_id`, `previous_handle`, `new_handle`, `changed_at`)
SELECT 'legacy_handle_' || `id`, 'legacy_profile_' || `id`, NULL, `nickname`, `created_at`
FROM `passports`;
--> statement-breakpoint
INSERT OR IGNORE INTO `passport_versions` (
	`id`, `profile_id`, `assessment_id`, `previous_version_id`, `status`, `category`, `subfields_json`,
	`summary_json`, `strengths_json`, `weaknesses_json`, `raw_scores_json`, `calibrated_scores_json`,
	`ovr`, `hv_rating`, `tier`, `tier_division`, `reliability_score`, `evidence_level`, `evaluator_json`,
	`limitations_json`, `payload_hash`, `protocol_version`, `legacy_elo_rating`, `is_demo`,
	`published_at`, `revoked_at`, `created_at`
)
SELECT
	'legacy_passport_' || `id`,
	'legacy_profile_' || `id`,
	NULL,
	NULL,
	'LEGACY',
	CASE
		WHEN lower(`primary_domain`) LIKE '%security%' OR `primary_domain` LIKE '%보안%' THEN 'security'
		WHEN lower(`primary_domain`) LIKE '%front%' OR `primary_domain` LIKE '%프론트%' THEN 'frontend'
		WHEN lower(`primary_domain`) LIKE '%back%' OR `primary_domain` LIKE '%백엔드%' THEN 'backend'
		WHEN lower(`primary_domain`) LIKE '%data%' OR `primary_domain` LIKE '%데이터%' THEN 'data'
		WHEN lower(`primary_domain`) LIKE '%ops%' OR lower(`primary_domain`) LIKE '%automation%' THEN 'aiOps'
		WHEN lower(`primary_domain`) LIKE '%ai%' OR lower(`primary_domain`) LIKE '%ml%' THEN 'aiEngineering'
		WHEN lower(`primary_domain`) LIKE '%devops%' OR lower(`primary_domain`) LIKE '%cloud%' THEN 'devops'
		ELSE 'product'
	END,
	`subfields_json`,
	CASE WHEN json_valid(`summary`) THEN json_object(
		'ko', coalesce(json_extract(`summary`, '$.ko'), json_extract(`summary`, '$.en'), ''),
		'en', coalesce(json_extract(`summary`, '$.en'), json_extract(`summary`, '$.ko'), '')
	) ELSE json_object('ko', `summary`, 'en', `summary`) END,
	CASE WHEN json_valid(`summary`) THEN json_object(
		'ko', coalesce(json_extract(`summary`, '$.strengthsKo'), json('[]')),
		'en', coalesce(json_extract(`summary`, '$.strengthsEn'), json('[]'))
	) ELSE json_object('ko', json('[]'), 'en', json('[]')) END,
	CASE WHEN json_valid(`summary`) THEN json_object(
		'ko', coalesce(json_extract(`summary`, '$.weaknessesKo'), json('[]')),
		'en', coalesce(json_extract(`summary`, '$.weaknessesEn'), json('[]'))
	) ELSE json_object('ko', json('[]'), 'en', json('[]')) END,
	`scores_json`,
	`scores_json`,
	`benchmark_score`,
	CAST(round(`benchmark_score` * 10) AS INTEGER),
	'Legacy',
	NULL,
	`reliability_score`,
	'E0',
	json_object('legacy', json('true'), 'surface', 'legacy-import', 'model', 'unknown', 'codexVersion', 'unknown', 'tools', json('["codex"]')),
	json_array('Legacy v0.2 record: no assessment commitment or server challenge.'),
	'legacy:' || `id`,
	'high-vive-witness-v0.2',
	CAST(round(650 + `benchmark_score` * 10 + `reliability_score` * 1.5) AS INTEGER),
	0,
	`created_at`,
	NULL,
	`created_at`
FROM `passports`;
