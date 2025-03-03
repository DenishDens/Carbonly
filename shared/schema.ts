import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const businessUnits = pgTable("business_units", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBusinessUnitSchema = createInsertSchema(businessUnits).pick({
  name: true,
  description: true,
});

export const insertEmissionSchema = createInsertSchema(emissions).pick({
  businessUnitId: true,
  date: true,
  scope1: true,
  scope2: true,
  scope3: true,
  source: true,
  details: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Emission = typeof emissions.$inferSelect;
