UPDATE `passport_versions`
SET
	`status` = 'PUBLISHED',
	`published_at` = coalesce(`published_at`, `created_at`)
WHERE
	`status` = 'SUBMITTED'
	AND `evidence_level` IN ('E2', 'E3', 'E4', 'E5')
	AND `reliability_score` >= 60
	AND `is_demo` = 0;
--> statement-breakpoint
UPDATE `assessment_sessions`
SET
	`status` = 'PUBLISHED',
	`published_at` = coalesce(`published_at`, `submitted_at`, `created_at`),
	`updated_at` = coalesce(`published_at`, `submitted_at`, `created_at`)
WHERE
	`status` = 'SUBMITTED'
	AND EXISTS (
		SELECT 1 FROM `passport_versions` pv
		WHERE pv.`assessment_id` = `assessment_sessions`.`id`
			AND pv.`status` = 'PUBLISHED'
	);
--> statement-breakpoint
UPDATE `profiles`
SET
	`current_passport_id` = (
		SELECT pv.`id`
		FROM `passport_versions` pv
		WHERE pv.`profile_id` = `profiles`.`id`
			AND pv.`status` = 'PUBLISHED'
			AND pv.`revoked_at` IS NULL
		ORDER BY pv.`published_at` DESC, pv.`created_at` DESC
		LIMIT 1
	),
	`updated_at` = coalesce((
		SELECT pv.`published_at`
		FROM `passport_versions` pv
		WHERE pv.`profile_id` = `profiles`.`id`
			AND pv.`status` = 'PUBLISHED'
			AND pv.`revoked_at` IS NULL
		ORDER BY pv.`published_at` DESC, pv.`created_at` DESC
		LIMIT 1
	), `updated_at`)
WHERE EXISTS (
	SELECT 1 FROM `passport_versions` pv
	WHERE pv.`profile_id` = `profiles`.`id`
		AND pv.`status` = 'PUBLISHED'
		AND pv.`revoked_at` IS NULL
);
