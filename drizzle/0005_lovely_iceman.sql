CREATE TABLE `league_refresh_state` (
	`id` text PRIMARY KEY NOT NULL,
	`refreshed_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `league_refresh_state` (`id`, `refreshed_at`) VALUES ('global', '1970-01-01T00:00:00.000Z');
--> statement-breakpoint
ALTER TABLE `profiles` ADD `preferred_category` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `profiles_preferred_category_idx` ON `profiles` (`preferred_category`);
