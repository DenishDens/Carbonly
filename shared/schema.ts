import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // Custom URL segment
  logo: text("logo"), // URL to the uploaded logo
  ssoEnabled: boolean("sso_enabled").default(false),
  ssoSettings: jsonb("sso_settings"), // Store SSO configuration
  createdAt: text("created_at").notNull(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'admin' or 'user'
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  username: text("username").notNull(),
  password: text("password"),  // Optional for SSO users
  email: text("email").notNull(),
  role: text("role").notNull(), // 'super_admin', 'admin', 'user'
  createdAt: text("created_at").notNull(),
});

export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const emissions = pgTable("emissions", {
  id: serial("id").primaryKey(),
  businessUnitId: integer("business_unit_id").notNull(),
  date: text("date").notNull(),
  scope1: integer("scope1").notNull(),
  scope2: integer("scope2").notNull(),
  scope3: integer("scope3").notNull(),
  source: text("source"),
  details: jsonb("details"),
});

export const insertOrganizationSchema = createInsertSchema(organizations)
  .pick({
    name: true,
    slug: true,
  })
  .extend({
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
    logo: z.string().optional(), // Assuming logo is a URL string
  });

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    username: true,
    password: true,
  });

export const insertInvitationSchema = createInsertSchema(invitations)
  .pick({
    email: true,
    role: true,
  });

export const insertBusinessUnitSchema = createInsertSchema(businessUnits)
  .pick({
    name: true,
    description: true,
  });

export const insertEmissionSchema = createInsertSchema(emissions)
  .pick({
    businessUnitId: true,
    date: true,
    scope1: true,
    scope2: true,
    scope3: true,
    source: true,
    details: true,
  });

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Emission = typeof emissions.$inferSelect;