UPDATE `profiles`
SET `current_passport_id` = NULL,
    `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `current_passport_id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9';
--> statement-breakpoint
DELETE FROM `passport_metric_evidence`
WHERE `passport_id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9';
--> statement-breakpoint
DELETE FROM `sample_proofs`
WHERE `assessment_id` IN (
  SELECT `assessment_id` FROM `passport_versions`
  WHERE `id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9'
);
--> statement-breakpoint
DELETE FROM `benchmark_runs`
WHERE `assessment_id` IN (
  SELECT `assessment_id` FROM `passport_versions`
  WHERE `id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9'
);
--> statement-breakpoint
DELETE FROM `evidence_commitments`
WHERE `assessment_id` IN (
  SELECT `assessment_id` FROM `passport_versions`
  WHERE `id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9'
);
--> statement-breakpoint
DELETE FROM `assessment_sessions`
WHERE `id` IN (
  SELECT `assessment_id` FROM `passport_versions`
  WHERE `id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9'
);
--> statement-breakpoint
DELETE FROM `passport_versions`
WHERE `id` = 'psp_d95d4fe0c8eb4d8d887390ea2d02dbd9';
--> statement-breakpoint
UPDATE `league_refresh_state`
SET `refreshed_at` = '1970-01-01T00:00:00.000Z'
WHERE `id` = 'global';
