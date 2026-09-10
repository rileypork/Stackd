CREATE TABLE `subscription_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`subscription_id` text NOT NULL,
	`kind` text NOT NULL,
	`source` text DEFAULT 'gmail' NOT NULL,
	`message_hash` text NOT NULL,
	`sender_domain` text,
	`subject` text DEFAULT '' NOT NULL,
	`amount_cents` integer,
	`currency` text,
	`billing_interval` text,
	`renewal_date` text,
	`trial_end_date` text,
	`cancel_url` text,
	`confidence` integer DEFAULT 0 NOT NULL,
	`detected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_signals_user_hash_unique` ON `subscription_signals` (`user_email`,`message_hash`);--> statement-breakpoint
CREATE INDEX `subscription_signals_user_sub_idx` ON `subscription_signals` (`user_email`,`subscription_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`service_name` text NOT NULL,
	`domain` text,
	`category` text DEFAULT 'Other' NOT NULL,
	`plan_name` text,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`billing_interval` text DEFAULT 'monthly' NOT NULL,
	`next_renewal_date` text,
	`trial_end_date` text,
	`cancel_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`project_id` text,
	`app_id` text,
	`last_detected_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `user_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`app_id`) REFERENCES `user_apps`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_service_unique` ON `subscriptions` (`user_email`,`service_name`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_renewal_idx` ON `subscriptions` (`user_email`,`next_renewal_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_trial_idx` ON `subscriptions` (`user_email`,`trial_end_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_project_idx` ON `subscriptions` (`user_email`,`project_id`);