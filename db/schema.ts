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
