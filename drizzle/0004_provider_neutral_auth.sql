CREATE TABLE `passkey_credentials` (
	`credential_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key_spki` text NOT NULL,
	`algorithm` integer NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE INDEX `passkey_credentials_user_idx` ON `passkey_credentials` (`user_id`);
--> statement-breakpoint
CREATE TABLE `passkey_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`challenge` text NOT NULL,
	`credential_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `passkey_challenges_expiry_idx` ON `passkey_challenges` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `browser_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_used_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `browser_sessions_token_hash_unique` ON `browser_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `browser_sessions_user_idx` ON `browser_sessions` (`user_id`);
