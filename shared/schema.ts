import { pgTable, text, uuid, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  ADMIN: 'admin',
  BUSINESS_UNIT_MANAGER: 'business_unit_manager',
  TEAM_MEMBER: 'team_member',
  AUDITOR: 'auditor'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(), // Custom URL segment
  logo: text("logo"), // URL to the uploaded logo
  ssoEnabled: boolean("sso_enabled").default(false),
  ssoSettings: jsonb("sso_settings"), // Store SSO configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: text("role", { enum: Object.values(UserRole) }).notNull(),
  status: text("status").notNull().default('pending'), // pending, accepted, expired
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  password: text("password"), // Optional for SSO users
  role: text("role", { enum: Object.values(UserRole) }).notNull(),
  businessUnitId: uuid("business_unit_id").references(() => businessUnits.id), // For Business Unit Manager role
  teamId: uuid("team_id").references(() => teams.id), // For Team Member role
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  members: text("members").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessUnits = pgTable("business_units", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  projectCode: text("project_code").unique(), // Add project code field
  label: text("label"), // Made optional: 'Business Unit', 'Project', 'Division', 'Department', 'Custom'
  description: text("description"),
  location: text("location"), // For tracking by state/region
  category: text("category"), // For additional categorization
  managerId: uuid("manager_id").references(() => users.id),
  teamId: uuid("team_id").references(() => teams.id), // Reference to assigned team
  status: text("status"), // active, inactive, archived
  budget: decimal("budget"), // For tracking financial aspects
  targetEmission: decimal("target_emission"), // Emission reduction target
  projectEmail: text("project_email"), // Encrypted project-specific email
  metadata: jsonb("metadata"), // For flexible additional data
  protocolSettings: jsonb("protocol_settings").$type<{
    version: string;
    emissionFactors: {
      electricity: string;
      naturalGas: string;
      diesel: string;
      gasoline: string;
    };
  }>(),
  integrations: jsonb("integrations").$type<{
    storage?: {
      onedrive?: { status: "connected" | "disconnected"; path: string };
      googledrive?: { status: "connected" | "disconnected"; path: string };
      sharepoint?: { status: "connected" | "disconnected"; path: string };
    };
    accounting?: {
      xero?: { status: "connected" | "disconnected"; clientId: string };
      myob?: { status: "connected" | "disconnected"; clientId: string };
    };
    electricity?: {
      provider: string;
      status: "connected" | "disconnected";
      apiKey: string;
    };
    custom?: Array<{
      name: string;
      status: "connected" | "disconnected";
      baseUrl: string;
      apiToken: string;
    }>;
  }>(),
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
  details: jsonb("details").$type<{
    fuelType?: "diesel" | "gasoline";
    rawAmount?: string;
    rawUnit?: "liters" | "gallons";
    notes?: string;
    category?: string;
  }>(), // Explicitly type the details column
});

export const processingTransactions = pgTable("processing_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  detectedCategory: text("detected_category").notNull(),
  status: text("status").notNull(), // 'processed', 'failed', 'pending'
  errorType: text("error_type"), // 'missing_value', 'invalid_format', 'ambiguous_data', 'none'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  actionType: text("action_type").notNull(), // CREATE, UPDATE, DELETE
  entityType: text("entity_type").notNull(), // organization, user, business_unit, emission
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes"), // Store before/after state
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceNumber: decimal("sequence_number").notNull(),  
  businessUnitId: uuid("business_unit_id").notNull().references(() => businessUnits.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull(), // 'open', 'in_progress', 'resolved', 'closed'
  type: text("type").notNull(), // 'spill', 'leak', 'equipment_failure', 'power_outage', 'other'
  location: text("location"),
  reportedBy: uuid("reported_by").references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolutionDetails: text("resolution_details"),
  incidentDate: timestamp("incident_date").notNull(),
  environmentalImpact: jsonb("environmental_impact").$type<{
    impactType: string;
    estimatedEmissions: number;
    mitigationSteps: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Add incident type configuration
export const incidentTypes = pgTable("incident_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type Emission = typeof emissions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ProcessingTransaction = typeof processingTransactions.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type IncidentType = typeof incidentTypes.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type InsertAuditLog = Omit<AuditLog, "id" | "createdAt">;

// Add at the appropriate location in the schema
export const insertIncidentTypeSchema = createInsertSchema(incidentTypes)
  .pick({
    name: true,
    description: true,
    active: true,
    organizationId: true,
  });

export type InsertIncidentType = z.infer<typeof insertIncidentTypeSchema>;


export const insertOrganizationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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

export const updateBusinessUnitSchema = insertBusinessUnitSchema.partial();

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

// Update the insertIncidentSchema to use dynamic types
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
  })
  .extend({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
    type: z.string(), // Changed from enum to string to support custom types
    incidentDate: z.string().transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return date;
    }),
    resolutionComments: z.string().optional(),
    environmentalImpact: z.object({
      impactType: z.string(),
      estimatedEmissions: z.number(),
      mitigationSteps: z.array(z.string()),
    }).optional(),
  });

export const updateIncidentSchema = insertIncidentSchema
  .extend({
    resolutionDetails: z.string().optional(),
    resolvedAt: z.string().optional(), // Will be converted to Date
  })
  .partial();

export const insertUserSchema = createInsertSchema(users)
  .pick({
    firstName: true,
    lastName: true,
    email: true,
    password: true,
    role: true,
    businessUnitId: true,
    teamId: true,
  })
  .extend({
    role: z.enum(Object.values(UserRole)),
    password: z.string().min(8, "Password must be at least 8 characters"),
    email: z.string().email("Invalid email address"),
  });

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertBusinessUnit = z.infer<typeof insertBusinessUnitSchema>;
export type InsertEmission = z.infer<typeof insertEmissionSchema>;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type UpdateIncident = z.infer<typeof updateIncidentSchema>;
export type UpdateBusinessUnit = z.infer<typeof updateBusinessUnitSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export const insertInvitationSchema = createInsertSchema(invitations)
  .pick({
    email: true,
    role: true,
    organizationId: true,
  })
  .extend({
    role: z.enum(Object.values(UserRole)),
    email: z.string().email("Invalid email address"),
  });

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Add these lines after the existing incident schema
export const updateIncidentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  resolutionDetails: z.string().optional(),
  resolvedAt: z.date().optional(),
});

export type UpdateIncidentStatus = z.infer<typeof updateIncidentStatusSchema>;

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

export type { InsertIncidentType, InsertInvitation };