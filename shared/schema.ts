import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organization table schema
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User table schema
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;

// Registration schema with validation
export const insertUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationId: z.string().uuid(),
  role: z.enum(["admin", "user"]).default("user"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Organization registration schema
export const insertOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  members: text("members").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;

export const businessUnits = pgTable("business_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  projectCode: text("project_code").unique(), 
  label: text("label"), 
  description: text("description"),
  location: text("location"), 
  category: text("category"), 
  managerId: uuid("manager_id").references(() => users.id),
  teamId: uuid("team_id").references(() => teams.id), 
  status: text("status"), 
  budget: text("budget"), 
  targetEmission: text("target_emission"), 
  projectEmail: text("project_email"), 
  metadata: text("metadata"), 
  protocolSettings: text("protocol_settings"),
  integrations: text("integrations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BusinessUnit = typeof businessUnits.$inferSelect;

export const emissions = pgTable("emissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  scope: text("scope").notNull(), 
  emissionSource: text("emission_source").notNull(),
  amount: text("amount").notNull(),
  unit: text("unit").notNull(), 
  date: timestamp("date").defaultNow().notNull(),
  details: text("details"), 
});

export type Emission = typeof emissions.$inferSelect;

export const processingTransactions = pgTable("processing_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  detectedCategory: text("detected_category").notNull(),
  status: text("status").notNull(), 
  errorType: text("error_type"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProcessingTransaction = typeof processingTransactions.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  actionType: text("action_type").notNull(), 
  entityType: text("entity_type").notNull(), 
  entityId: text("entity_id").notNull(),
  changes: text("changes"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = Omit<AuditLog, "id" | "createdAt">;

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), 
  status: text("status").notNull(), 
  type: text("type").notNull(), 
  location: text("location"),
  reportedBy: uuid("reported_by").references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolutionDetails: text("resolution_details"),
  incidentDate: timestamp("incident_date").notNull(), 
  environmentalImpact: text("environmental_impact"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export type Incident = typeof incidents.$inferSelect;

export const insertTeamSchema = createInsertSchema(teams)
  .pick({
    name: true,
    description: true,
    members: true,
  });

export const insertBusinessUnitSchema = createInsertSchema(businessUnits)
  .pick({
    name: true,
    projectCode: true,
    description: true,
    label: true,
    location: true,
    category: true,
    managerId: true,
    teamId: true,
    status: true,
    budget: true,
    targetEmission: true,
    metadata: true,
    protocolSettings: true,
    integrations: true,
    projectEmail: true,
  })
  .extend({
    projectCode: z.string()
      .min(2, "Project code must be at least 2 characters")
      .max(10, "Project code cannot exceed 10 characters")
      .regex(/^[A-Z0-9-]+$/, "Project code must contain only uppercase letters, numbers, and hyphens"),
    label: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    protocolSettings: z.object({
      version: z.string(),
      emissionFactors: z.object({
        electricity: z.string(),
        naturalGas: z.string(),
        diesel: z.string(),
        gasoline: z.string(),
      }),
    }).optional(),
    integrations: z.object({
      storage: z.object({
        onedrive: z.object({
          status: z.enum(["connected", "disconnected"]),
          path: z.string(),
        }).optional(),
        googledrive: z.object({
          status: z.enum(["connected", "disconnected"]),
          path: z.string(),
        }).optional(),
        sharepoint: z.object({
          status: z.enum(["connected", "disconnected"]),
          path: z.string(),
        }).optional(),
      }).optional(),
      accounting: z.object({
        xero: z.object({
          status: z.enum(["connected", "disconnected"]),
          clientId: z.string(),
        }).optional(),
        myob: z.object({
          status: z.enum(["connected", "disconnected"]),
          clientId: z.string(),
        }).optional(),
      }).optional(),
      electricity: z.object({
        provider: z.string(),
        status: z.enum(["connected", "disconnected"]),
        apiKey: z.string(),
      }).optional(),
      custom: z.array(z.object({
        name: z.string(),
        status: z.enum(["connected", "disconnected"]),
        baseUrl: z.string(),
        apiToken: z.string(),
      })).optional(),
    }).optional(),
  });

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
    date: z.string(), 
  });

export const insertIncidentSchema = createInsertSchema(incidents)
  .pick({
    businessUnitId: true,
    title: true,
    description: true,
    severity: true,
    status: true,
    type: true,
    location: true,
    reportedBy: true,
    assignedTo: true,
    environmentalImpact: true,
    incidentDate: true,
  })
  .extend({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    type: z.enum(['spill', 'leak', 'equipment_failure', 'power_outage', 'other']),
    incidentDate: z.string(), 
    environmentalImpact: z.object({
      impactType: z.string(),
      estimatedEmissions: z.number(),
      mitigationSteps: z.array(z.string()),
    }).optional(),
  });

export const updateIncidentSchema = insertIncidentSchema
  .extend({
    resolutionDetails: z.string().optional(),
    resolvedAt: z.string().optional(), 
  })
  .partial();


export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type InsertEmission = z.infer<typeof insertEmissionSchema>;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type UpdateIncident = z.infer<typeof updateIncidentSchema>;

export interface FuelData {
  businessUnitId: string;
  fuelType: "diesel" | "gasoline";
  amount: string;
  unit: "liters" | "gallons";
  date: string;
  notes?: string;
}

export type EmissionDetails = {
  fuelType?: "diesel" | "gasoline";
  rawAmount?: string;
  rawUnit?: "liters" | "gallons";
  notes?: string;
  category?: string;
};