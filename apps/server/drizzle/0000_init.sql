CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`thumbnail_image_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`max_difficulty` text DEFAULT 'difficile' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`player_key` text NOT NULL,
	`user_id` text,
	`category_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`seed` integer NOT NULL,
	`image_ids` text NOT NULL,
	`deck` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`paused_at` integer,
	`paused_ms` integer DEFAULT 0 NOT NULL,
	`finished_at` integer,
	`duration_ms` integer,
	`moves` integer
);
--> statement-breakpoint
CREATE INDEX `games_player_idx` ON `games` (`player_key`);--> statement-breakpoint
CREATE INDEX `games_created_idx` ON `games` (`created_at`);--> statement-breakpoint
CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`title` text NOT NULL,
	`caption` text,
	`date` text,
	`place` text,
	`author` text NOT NULL,
	`source_url` text NOT NULL,
	`licence` text NOT NULL,
	`licence_url` text,
	`retrieved_at` text NOT NULL,
	`visual_group` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `images_category_idx` ON `images` (`category_id`);--> statement-breakpoint
CREATE TABLE `last_draws` (
	`draw_key` text PRIMARY KEY NOT NULL,
	`image_ids` text NOT NULL,
	`updated_at` integer NOT NULL
);
