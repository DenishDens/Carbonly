import { Pool } from "@neondatabase/serverless";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { organizations, users, businessUnits, emissions, processingTransactions, auditLogs, teams, incidents, incidentTypes } from "@shared/schema";
import type { Organization, User, BusinessUnit, Emission, ProcessingTransaction, AuditLog, InsertAuditLog, Team, Incident, IncidentType } from "@shared/schema";
import crypto from 'crypto';

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;

  // Organization operations
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationById(id: string): Promise<Organization | undefined>;
  createOrganization(org: Omit<Organization, "id">): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  updateOrganizationLogo(id: string, logoUrl: string): Promise<Organization>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;

  // Team operations
  getTeams(organizationId: string): Promise<Team[]>;
  createTeam(team: Omit<Team, "id">): Promise<Team>;
  updateTeam(team: Team): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  getBusinessUnitTeam(businessUnitId: string): Promise<Team | undefined>;
  updateBusinessUnitTeam(businessUnitId: string, teamId: string): Promise<BusinessUnit>;

  // Business unit operations
  getBusinessUnits(organizationId: string): Promise<BusinessUnit[]>;
  createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit>;

  // Emission operations
  getEmissions(businessUnitId: string): Promise<Emission[]>;
  getEmissionById(id: string): Promise<Emission | undefined>;
  createEmission(emission: Omit<Emission, "id">): Promise<Emission>;
  updateEmission(emission: Emission): Promise<Emission>;

  // Transaction logging
  createTransaction(transaction: Omit<ProcessingTransaction, "id">): Promise<ProcessingTransaction>;
  updateTransactionStatus(id: string, status: string, errorType?: string | null): Promise<ProcessingTransaction>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(organizationId: string, filters?: {
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]>;

  // Incident operations
  getIncidents(organizationId: string): Promise<Incident[]>;
  getIncidentById(id: string): Promise<Incident | undefined>;
  createIncident(incident: Omit<Incident, "id">): Promise<Incident>;
  updateIncident(incident: Incident): Promise<Incident>;

  //Incident Type operations
  getIncidentTypes(organizationId: string): Promise<IncidentType[]>;
  createIncidentType(type: Omit<IncidentType, "id" | "createdAt">): Promise<IncidentType>;
  updateIncidentType(type: IncidentType): Promise<IncidentType>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // Organization operations
  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: Omit<Organization, "id">): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const [updatedOrg] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrg;
  }

  async updateOrganizationLogo(id: string, logoUrl: string): Promise<Organization> {
    return this.updateOrganization(id, { logo: logoUrl });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Team operations
  async getTeams(organizationId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.organizationId, organizationId));
  }

  async createTeam(team: Omit<Team, "id">): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(team: Team): Promise<Team> {
    const [updatedTeam] = await db
      .update(teams)
      .set(team)
      .where(eq(teams.id, team.id))
      .returning();
    return updatedTeam;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async getBusinessUnitTeam(businessUnitId: string): Promise<Team | undefined> {
    const [unit] = await db.select().from(businessUnits).where(eq(businessUnits.id, businessUnitId));
    if (!unit?.teamId) return undefined;
    const [team] = await db.select().from(teams).where(eq(teams.id, unit.teamId));
    return team;
  }

  async updateBusinessUnitTeam(businessUnitId: string, teamId: string): Promise<BusinessUnit> {
    const [updatedUnit] = await db
      .update(businessUnits)
      .set({ teamId })
      .where(eq(businessUnits.id, businessUnitId))
      .returning();
    return updatedUnit;
  }

  // Business unit operations
  async getBusinessUnits(organizationId: string): Promise<BusinessUnit[]> {
    return db.select().from(businessUnits).where(eq(businessUnits.organizationId, organizationId));
  }

  async createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit> {
    // Generate project email
    const tempId = crypto.randomUUID(); // Temporary ID for email generation
    const projectEmail = generateProjectEmail(tempId, unit.organizationId);

    const [newUnit] = await db.insert(businessUnits).values({
      ...unit,
      projectEmail,
      createdAt: new Date(),
    }).returning();

    // Update with the actual ID
    const updatedProjectEmail = generateProjectEmail(newUnit.id, unit.organizationId);
    const [finalUnit] = await db
      .update(businessUnits)
      .set({ projectEmail: updatedProjectEmail })
      .where(eq(businessUnits.id, newUnit.id))
      .returning();

    return finalUnit;
  }

  // Emission operations
  async getEmissions(businessUnitId: string): Promise<Emission[]> {
    return db.select().from(emissions).where(eq(emissions.businessUnitId, businessUnitId));
  }

  async getEmissionById(id: string): Promise<Emission | undefined> {
    const [emission] = await db.select().from(emissions).where(eq(emissions.id, id));
    return emission;
  }

  async createEmission(emission: Omit<Emission, "id">): Promise<Emission> {
    const [newEmission] = await db.insert(emissions).values(emission).returning();
    return newEmission;
  }

  async updateEmission(emission: Emission): Promise<Emission> {
    const [updatedEmission] = await db
      .update(emissions)
      .set(emission)
      .where(eq(emissions.id, emission.id))
      .returning();
    return updatedEmission;
  }

  // Transaction logging
  async createTransaction(transaction: Omit<ProcessingTransaction, "id">): Promise<ProcessingTransaction> {
    const [newTransaction] = await db.insert(processingTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransactionStatus(id: string, status: string, errorType: string | null = null): Promise<ProcessingTransaction> {
    const [updatedTransaction] = await db
      .update(processingTransactions)
      .set({ status, errorType })
      .where(eq(processingTransactions.id, id))
      .returning();
    return updatedTransaction;
  }

  // Audit logging implementation
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(organizationId: string, filters?: {
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let conditions = [eq(auditLogs.organizationId, organizationId)];

    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.startDate) {
      conditions.push(eq(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(eq(auditLogs.createdAt, filters.endDate));
    }

    return db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt));
  }

  // Implement incident methods
  async getIncidents(organizationId: string): Promise<Incident[]> {
    // Get all incidents ordered by creation date
    return db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.createdAt));
  }

  async getIncidentById(id: string): Promise<Incident | undefined> {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id));
    return incident;
  }

  async getNextIncidentSequenceNumber(): Promise<string> {
    const [result] = await db
      .select({ maxNum: sql`MAX(sequence_number)` })
      .from(incidents);

    const nextNum = (parseInt(result?.maxNum?.toString() || "0") + 1).toString();
    return nextNum;
  }

  async createIncident(incident: Omit<Incident, "id">): Promise<Incident> {
    // Get next sequence number
    const sequenceNumber = await this.getNextIncidentSequenceNumber();

    const [newIncident] = await db
      .insert(incidents)
      .values({
        ...incident,
        sequenceNumber,
      })
      .returning();

    return newIncident;
  }

  async updateIncident(incident: Incident): Promise<Incident> {
    const [updatedIncident] = await db
      .update(incidents)
      .set(incident)
      .where(eq(incidents.id, incident.id))
      .returning();
    return updatedIncident;
  }

  async getIncidentTypes(organizationId: string): Promise<IncidentType[]> {
    return db
      .select()
      .from(incidentTypes)
      .where(eq(incidentTypes.organizationId, organizationId))
      .orderBy(incidentTypes.name);
  }

  async createIncidentType(type: Omit<IncidentType, "id" | "createdAt">): Promise<IncidentType> {
    const [newType] = await db
      .insert(incidentTypes)
      .values({
        ...type,
        createdAt: new Date(),
      })
      .returning();
    return newType;
  }

  async updateIncidentType(type: IncidentType): Promise<IncidentType> {
    const [updatedType] = await db
      .update(incidentTypes)
      .set(type)
      .where(eq(incidentTypes.id, type.id))
      .returning();
    return updatedType;
  }
}

//Helper function - needs implementation based on your requirements.
const generateProjectEmail = (id: string, organizationId: string): string => {
  // Generate a consistent, encrypted-looking project email
  const projectId = id.slice(0, 8); // Take first 8 chars of UUID
  const orgId = organizationId.slice(0, 4); // Take first 4 chars of org UUID
  return `project-${projectId}-${orgId}@carbontrack.io`; // Use a consistent domain
}

// Export a single instance
export const storage = new DatabaseStorage();