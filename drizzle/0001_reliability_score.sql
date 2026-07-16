CREATE TABLE `__new_passports` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT '' NOT NULL,
	`contact_opt_in` integer DEFAULT false NOT NULL,
	`primary_domain` text NOT NULL,
	`subfields_json` text NOT NULL,
	`summary` text NOT NULL,
	`scores_json` text NOT NULL,
	`reliability_score` real NOT NULL,
	`benchmark_score` real NOT NULL,
	`confidence` real NOT NULL,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`evidence_root` text,
	`protocol_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_passports` (
	`id`, `nickname`, `country`, `timezone`, `contact_opt_in`, `primary_domain`,
	`subfields_json`, `summary`, `scores_json`, `reliability_score`, `benchmark_score`,
	`confidence`, `evidence_count`, `evidence_root`, `protocol_version`, `created_at`
)
SELECT
	`id`, `nickname`, `country`, `timezone`, `contact_opt_in`, `primary_domain`,
	`subfields_json`, `summary`, `scores_json`,
	CASE `witness_level`
		WHEN 'W4' THEN 86.4
		WHEN 'W3' THEN 78.2
		WHEN 'W2' THEN 70.7
		WHEN 'W1' THEN 55.0
		ELSE 50.0
	END,
	CAST(`benchmark_score` AS real), `confidence`, `evidence_count`, `evidence_root`,
	`protocol_version`, `created_at`
FROM `passports`;
--> statement-breakpoint
DROP TABLE `passports`;
--> statement-breakpoint
ALTER TABLE `__new_passports` RENAME TO `passports`;
--> statement-breakpoint
CREATE UNIQUE INDEX `passports_nickname_unique` ON `passports` (`nickname`);
