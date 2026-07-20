UPDATE `profiles`
SET `current_passport_id` = NULL,
    `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `handle` = 'ngmptdz';
--> statement-breakpoint
DELETE FROM `passport_metric_evidence`
WHERE `passport_id` IN (
  SELECT pv.`id`
  FROM `passport_versions` pv
  JOIN `profiles` p ON p.`id` = pv.`profile_id`
  WHERE p.`handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `sample_proofs`
WHERE `assessment_id` IN (
  SELECT a.`id`
  FROM `assessment_sessions` a
  JOIN `profiles` p ON p.`id` = a.`profile_id`
  WHERE p.`handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `benchmark_runs`
WHERE `assessment_id` IN (
  SELECT a.`id`
  FROM `assessment_sessions` a
  JOIN `profiles` p ON p.`id` = a.`profile_id`
  WHERE p.`handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `evidence_commitments`
WHERE `assessment_id` IN (
  SELECT a.`id`
  FROM `assessment_sessions` a
  JOIN `profiles` p ON p.`id` = a.`profile_id`
  WHERE p.`handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `passport_versions`
WHERE `profile_id` IN (
  SELECT `id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `assessment_sessions`
WHERE `profile_id` IN (
  SELECT `id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `idempotency_keys`
WHERE `route` = 'assessment:create'
  AND `actor_key` IN (
    SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
  );
--> statement-breakpoint
DELETE FROM `rate_limit_buckets`
WHERE EXISTS (
  SELECT 1
  FROM `profiles` p
  WHERE p.`handle` = 'ngmptdz'
    AND substr(
      `rate_limit_buckets`.`bucket_key`,
      1,
      length('assessment:create:' || p.`user_id` || ':')
    ) = 'assessment:create:' || p.`user_id` || ':'
);
--> statement-breakpoint
DELETE FROM `passkey_challenges`
WHERE `credential_id` IN (
  SELECT pc.`credential_id`
  FROM `passkey_credentials` pc
  JOIN `profiles` p ON p.`user_id` = pc.`user_id`
  WHERE p.`handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `passkey_credentials`
WHERE `user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `browser_sessions`
WHERE `user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `api_tokens`
WHERE `user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `auth_device_sessions`
WHERE `user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `auth_identities`
WHERE `user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `audit_events`
WHERE `actor_user_id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `profile_handle_history`
WHERE `profile_id` IN (
  SELECT `id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `users`
WHERE `id` IN (
  SELECT `user_id` FROM `profiles` WHERE `handle` = 'ngmptdz'
);
--> statement-breakpoint
DELETE FROM `profiles`
WHERE `handle` = 'ngmptdz';
--> statement-breakpoint
DELETE FROM `passports`
WHERE `nickname` = 'ngmptdz';
--> statement-breakpoint
UPDATE `league_refresh_state`
SET `refreshed_at` = '1970-01-01T00:00:00.000Z'
WHERE `id` = 'global';
