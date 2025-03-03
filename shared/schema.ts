import { pgTable, text, uuid, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(), // Custom URL segment
  logo: text("logo"), // URL to the uploaded logo
  ssoEnabled: boolean("sso_enabled").default(false),
  ssoSettings: jsonb("sso_settings"), // Store SSO configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  password: text("password"), // Optional for SSO users
  role: text("role").notNull(), // 'super_admin', 'admin', 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessUnits = pgTable("business_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  label: text("label"), // Made optional: 'Business Unit', 'Project', 'Division', 'Department', 'Custom'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emissions = pgTable("emissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  scope: text("scope").notNull(), // 'Scope 1', 'Scope 2', 'Scope 3'
  emissionSource: text("emission_source").notNull(),
  amount: decimal("amount").notNull(),
  unit: text("unit").notNull(), // 'kg', 'tCO2e'
  date: timestamp("date").defaultNow().notNull(),
  details: jsonb("details"),
});

export const processingTransactions = pgTable("processing_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  detectedCategory: text("detected_category").notNull(),
  status: text("status").notNull(), // 'processed', 'failed', 'pending'
  errorType: text("error_type"), // 'missing_value', 'invalid_format', 'ambiguous_data', 'none'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for registration
export const insertOrganizationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Schema for business unit creation
export const insertBusinessUnitSchema = createInsertSchema(businessUnits)
  .pick({
    name: true,
    description: true,
  })
  .extend({
    label: z.string().optional(),
  });

// Schema for emission data
export const insertEmissionSchema = createInsertSchema(emissions)
  .pick({
    businessUnitId: true,
    scope: true,
    emissionSource: true,
    amount: true,
    unit: true,
    details: true,
  })
  .extend({
    date: z.string(), // Accept string date that will be converted to Date
  });

// Export types
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Emission = typeof emissions.$inferSelect;
export type ProcessingTransaction = typeof processingTransactions.$inferSelect;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type InsertEmission = z.infer<typeof insertEmissionSchema>;