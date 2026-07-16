CREATE TABLE `passports` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`timezone` text DEFAULT '' NOT NULL,
	`contact_opt_in` integer DEFAULT false NOT NULL,
	`primary_domain` text NOT NULL,
	`subfields_json` text NOT NULL,
	`summary` text NOT NULL,
	`scores_json` text NOT NULL,
	`witness_level` text NOT NULL,
	`benchmark_score` integer NOT NULL,
	`confidence` real NOT NULL,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`evidence_root` text,
	`protocol_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passports_nickname_unique` ON `passports` (`nickname`);