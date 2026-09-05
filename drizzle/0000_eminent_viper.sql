CREATE TABLE `user_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`name` text NOT NULL,
	`initials` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'blue' NOT NULL,
	`website` text,
	`description` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'Other' NOT NULL,
	`status` text DEFAULT 'Needs Review' NOT NULL,
	`monthly_cost_cents` integer DEFAULT 0 NOT NULL,
	`billing_frequency` text,
	`renewal_date` text,
	`trial_start_date` text,
	`trial_end_date` text,
	`cancellation_date` text,
	`access_end_date` text,
	`projects_json` text DEFAULT '[]' NOT NULL,
	`sources_json` text DEFAULT '["Manual"]' NOT NULL,
	`last_activity` text,
	`confidence` integer DEFAULT 100 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_apps_user_name_unique` ON `user_apps` (`user_email`,`name`);--> statement-breakpoint
CREATE INDEX `user_apps_user_status_idx` ON `user_apps` (`user_email`,`status`);--> statement-breakpoint
CREATE INDEX `user_apps_user_updated_idx` ON `user_apps` (`user_email`,`updated_at`);