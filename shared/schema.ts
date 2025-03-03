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

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'admin' or 'user'
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessUnits = pgTable("business_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  label: text("label").notNull(), // 'Business Unit', 'Project', 'Division', 'Department', 'Custom'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Main emissions table for overview
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

// Scope 1 detailed tables
export const fuelCombustion = pgTable("fuel_combustion", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  fuelType: text("fuel_type").notNull(),
  quantity: decimal("quantity").notNull(),
  unit: text("unit").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const industrialProcesses = pgTable("industrial_processes", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  processType: text("process_type").notNull(),
  emissions: decimal("emissions").notNull(),
  unit: text("unit").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Transaction logging
export const processingTransactions = pgTable("processing_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  detectedCategory: text("detected_category").notNull(),
  status: text("status").notNull(), // 'processed', 'failed', 'pending'
  errorType: text("error_type"), // 'missing_value', 'invalid_format', 'ambiguous_data', 'none'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for organization creation (registration)
export const insertOrganizationSchema = createInsertSchema(organizations)
  .pick({
    name: true,
  })
  .extend({
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
  });

// Schema for business unit creation
export const insertBusinessUnitSchema = createInsertSchema(businessUnits)
  .pick({
    name: true,
    label: true,
    description: true,
  });

// Schema for emission data
export const insertEmissionSchema = createInsertSchema(emissions)
  .pick({
    businessUnitId: true,
    scope: true,
    emissionSource: true,
    amount: true,
    unit: true,
    date: true,
    details: true,
  });

// Schema for user invitations
export const insertInvitationSchema = createInsertSchema(invitations)
  .pick({
    email: true,
    role: true,
  });

// Export types
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Emission = typeof emissions.$inferSelect;
export type ProcessingTransaction = typeof processingTransactions.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type InsertEmission = z.infer<typeof insertEmissionSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;