import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userApps = sqliteTable("user_apps", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull().default(""),
  tone: text("tone").notNull().default("blue"),
  website: text("website"),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Other"),
  status: text("status").notNull().default("Needs Review"),
  monthlyCostCents: integer("monthly_cost_cents").notNull().default(0),
  billingFrequency: text("billing_frequency"),
  renewalDate: text("renewal_date"),
  trialStartDate: text("trial_start_date"),
  trialEndDate: text("trial_end_date"),
  cancellationDate: text("cancellation_date"),
  accessEndDate: text("access_end_date"),
  projectsJson: text("projects_json").notNull().default("[]"),
  sourcesJson: text("sources_json").notNull().default("[\"Manual\"]"),
  lastActivity: text("last_activity"),
  confidence: integer("confidence").notNull().default(100),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("user_apps_user_name_unique").on(table.userEmail, table.name),
  index("user_apps_user_status_idx").on(table.userEmail, table.status),
  index("user_apps_user_updated_idx").on(table.userEmail, table.updatedAt),
]);

export const userProjects = sqliteTable("user_projects", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  accent: text("accent").notNull().default("cobalt"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("user_projects_user_name_unique").on(table.userEmail, table.name),
]);

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  serviceName: text("service_name").notNull(),
  domain: text("domain"),
  category: text("category").notNull().default("Other"),
  planName: text("plan_name"),
  costCents: integer("cost_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  billingInterval: text("billing_interval").notNull().default("monthly"),
  nextRenewalDate: text("next_renewal_date"),
  trialEndDate: text("trial_end_date"),
  cancelUrl: text("cancel_url"),
  status: text("status").notNull().default("active"),
  projectId: text("project_id").references(() => userProjects.id, { onDelete: "set null" }),
  appId: text("app_id").references(() => userApps.id, { onDelete: "set null" }),
  lastDetectedAt: text("last_detected_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("subscriptions_user_service_unique").on(table.userEmail, table.serviceName),
  index("subscriptions_user_renewal_idx").on(table.userEmail, table.nextRenewalDate),
  index("subscriptions_user_trial_idx").on(table.userEmail, table.trialEndDate),
  index("subscriptions_user_project_idx").on(table.userEmail, table.projectId),
]);

/** One structured signal per parsed email. Only extracted metadata is stored — never the message body. */
export const subscriptionSignals = sqliteTable("subscription_signals", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  source: text("source").notNull().default("gmail"),
  messageHash: text("message_hash").notNull(),
  senderDomain: text("sender_domain"),
  subject: text("subject").notNull().default(""),
  amountCents: integer("amount_cents"),
  currency: text("currency"),
  billingInterval: text("billing_interval"),
  renewalDate: text("renewal_date"),
  trialEndDate: text("trial_end_date"),
  cancelUrl: text("cancel_url"),
  confidence: integer("confidence").notNull().default(0),
  detectedAt: text("detected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("subscription_signals_user_hash_unique").on(table.userEmail, table.messageHash),
  index("subscription_signals_user_sub_idx").on(table.userEmail, table.subscriptionId),
]);
