CREATE TABLE `user_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`accent` text DEFAULT 'cobalt' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_projects_user_name_unique` ON `user_projects` (`user_email`,`name`);