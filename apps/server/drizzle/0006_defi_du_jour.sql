CREATE TABLE `daily_scores` (
	`day` text NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`moves` integer NOT NULL,
	`game_id` text NOT NULL,
	`finished_at` integer NOT NULL,
	PRIMARY KEY(`day`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `daily_scores_day_idx` ON `daily_scores` (`day`,`duration_ms`);--> statement-breakpoint
ALTER TABLE `games` ADD `daily_day` text;