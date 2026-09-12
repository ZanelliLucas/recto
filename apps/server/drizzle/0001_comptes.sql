CREATE TABLE `email_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `email_tokens_user_idx` ON `email_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `personal_bests` (
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`best_time_ms` integer NOT NULL,
	`record_moves` integer NOT NULL,
	`best_moves` integer NOT NULL,
	`best_accuracy` real NOT NULL,
	`game_id` text NOT NULL,
	`obtained_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `category_id`, `difficulty`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`pseudo` text NOT NULL,
	`pseudo_key` text NOT NULL,
	`avatar` text NOT NULL,
	`role` text DEFAULT 'joueur' NOT NULL,
	`email_verified_at` integer,
	`token_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_pseudo_key_unique` ON `users` (`pseudo_key`);--> statement-breakpoint
CREATE INDEX `games_user_idx` ON `games` (`user_id`);