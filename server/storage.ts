import { Pool } from "@neondatabase/serverless";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { organizations, users, businessUnits, emissions } from "@shared/schema";
import type { Organization, User, BusinessUnit, Emission } from "@shared/schema";

const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getUsersByOrganization(organizationId?: string): Promise<User[]>;

  // Organization operations
  getOrganizationById(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  updateOrganizationLogo(id: string, logoUrl: string): Promise<Organization>;

  // Business Unit operations
  getBusinessUnits(organizationId: string): Promise<BusinessUnit[]>;
  createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit>;
  getBusinessUnitTeam(businessUnitId: string): Promise<any>;
  updateBusinessUnitTeam(businessUnitId: string, teamId: string): Promise<BusinessUnit>;

  // Emission operations
  getEmissions(businessUnitId: string): Promise<Emission[]>;
  getEmissionById(id: string): Promise<Emission | undefined>;
  createEmission(emission: Omit<Emission, "id">): Promise<Emission>;
  updateEmission(emission: Emission): Promise<Emission>;

  // Other operations
  createAuditLog(log: any): Promise<any>;
  getAuditLogs(organizationId: string, filters?: any): Promise<any[]>;
  createTransaction(transaction: any): Promise<any>;
  updateTransactionStatus(id: string, status: string, errorType?: string): Promise<any>;
  getTeams(organizationId: string): Promise<any[]>;
  createTeam(team: any): Promise<any>;
  updateTeam(team: any): Promise<any>;
  deleteTeam(id: string): Promise<void>;
  getIncidents(organizationId: string): Promise<any[]>;
  getIncidentById(id: string): Promise<any>;
  createIncident(incident: any): Promise<any>;
  updateIncident(incident: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: false // Disable SSL for local development
      },
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User methods with improved error handling
  async getUserById(id: string): Promise<User | undefined> {
    try {
      console.log("Getting user by ID:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));

      console.log("User found:", user?.email || "not found");
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log("Getting user by email:", email);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      console.log("User found:", user?.email || "not found");
      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    try {
      console.log("Creating user:", user.email);
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          emailVerified: false,
          role: "user",
          createdAt: new Date()
        })
        .returning();

      console.log("User created successfully:", newUser.email);
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      console.log("Updating user:", id);
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      console.log("User updated successfully:", updatedUser.email);
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async getUsersByOrganization(organizationId?: string): Promise<User[]> {
    try {
      if (!organizationId) {
        return db.select().from(users);
      }
      return db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId));
    } catch (error) {
      console.error("Error getting users by organization:", error);
      throw error;
    }
  }

  // Organization methods
  async getOrganizationById(id: string): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
      return organization;
    } catch (error) {
      console.error("Error getting organization by ID:", error);
      throw error;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    try {
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug));
      return organization;
    } catch (error) {
      console.error("Error getting organization by slug:", error);
      throw error;
    }
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    try {
      const [updatedOrg] = await db
        .update(organizations)
        .set(updates)
        .where(eq(organizations.id, id))
        .returning();
      return updatedOrg;
    } catch (error) {
      console.error("Error updating organization:", error);
      throw error;
    }
  }

  async updateOrganizationLogo(id: string, logoUrl: string): Promise<Organization> {
    try {
      const [updatedOrg] = await db
        .update(organizations)
        .set({ logoUrl })
        .where(eq(organizations.id, id))
        .returning();
      return updatedOrg;
    } catch (error) {
      console.error("Error updating organization logo:", error);
      throw error;
    }
  }

  // Business Unit methods
  async getBusinessUnits(organizationId: string): Promise<BusinessUnit[]> {
    try {
      return db
        .select()
        .from(businessUnits)
        .where(eq(businessUnits.organizationId, organizationId));
    } catch (error) {
      console.error("Error getting business units:", error);
      throw error;
    }
  }

  async createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit> {
    try {
      const [newUnit] = await db
        .insert(businessUnits)
        .values(unit)
        .returning();
      return newUnit;
    } catch (error) {
      console.error("Error creating business unit:", error);
      throw error;
    }
  }

  async getBusinessUnitTeam(businessUnitId: string): Promise<any> {
    try {
      const [unit] = await db
        .select()
        .from(businessUnits)
        .where(eq(businessUnits.id, businessUnitId));
      
      if (!unit || !unit.teamId) {
        return null;
      }
      
      // This would need to be implemented with teams table
      // For now returning a placeholder
      return { id: unit.teamId, name: "Team" };
    } catch (error) {
      console.error("Error getting business unit team:", error);
      throw error;
    }
  }

  async updateBusinessUnitTeam(businessUnitId: string, teamId: string): Promise<BusinessUnit> {
    try {
      const [updatedUnit] = await db
        .update(businessUnits)
        .set({ teamId })
        .where(eq(businessUnits.id, businessUnitId))
        .returning();
      return updatedUnit;
    } catch (error) {
      console.error("Error updating business unit team:", error);
      throw error;
    }
  }

  // Emission methods
  async getEmissions(businessUnitId: string): Promise<Emission[]> {
    try {
      return db
        .select()
        .from(emissions)
        .where(eq(emissions.businessUnitId, businessUnitId));
    } catch (error) {
      console.error("Error getting emissions:", error);
      throw error;
    }
  }

  async getEmissionById(id: string): Promise<Emission | undefined> {
    try {
      const [emission] = await db
        .select()
        .from(emissions)
        .where(eq(emissions.id, id));
      return emission;
    } catch (error) {
      console.error("Error getting emission by ID:", error);
      throw error;
    }
  }

  async createEmission(emission: Omit<Emission, "id">): Promise<Emission> {
    try {
      const [newEmission] = await db
        .insert(emissions)
        .values(emission)
        .returning();
      return newEmission;
    } catch (error) {
      console.error("Error creating emission:", error);
      throw error;
    }
  }

  async updateEmission(emission: Emission): Promise<Emission> {
    try {
      const [updatedEmission] = await db
        .update(emissions)
        .set(emission)
        .where(eq(emissions.id, emission.id))
        .returning();
      return updatedEmission;
    } catch (error) {
      console.error("Error updating emission:", error);
      throw error;
    }
  }

  // Placeholder methods for other required operations
  async createAuditLog(log: any): Promise<any> {
    // Implement audit log creation
    console.log("Creating audit log:", log);
    return { id: "placeholder", ...log };
  }

  async getAuditLogs(organizationId: string, filters?: any): Promise<any[]> {
    // Implement audit log fetching
    console.log("Getting audit logs for organization:", organizationId);
    return [];
  }

  async createTransaction(transaction: any): Promise<any> {
    // Implement transaction creation
    console.log("Creating transaction:", transaction);
    return { id: "placeholder", ...transaction };
  }

  async updateTransactionStatus(id: string, status: string, errorType?: string): Promise<any> {
    // Implement transaction status update
    console.log("Updating transaction status:", id, status, errorType);
    return { id, status, errorType };
  }

  async getTeams(organizationId: string): Promise<any[]> {
    // Implement teams fetching
    console.log("Getting teams for organization:", organizationId);
    return [];
  }

  async createTeam(team: any): Promise<any> {
    // Implement team creation
    console.log("Creating team:", team);
    return { id: "placeholder", ...team };
  }

  async updateTeam(team: any): Promise<any> {
    // Implement team update
    console.log("Updating team:", team);
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    // Implement team deletion
    console.log("Deleting team:", id);
  }

  async getIncidents(organizationId: string): Promise<any[]> {
    // Implement incidents fetching
    console.log("Getting incidents for organization:", organizationId);
    return [];
  }

  async getIncidentById(id: string): Promise<any> {
    // Implement incident fetching by ID
    console.log("Getting incident by ID:", id);
    return { id };
  }

  async createIncident(incident: any): Promise<any> {
    // Implement incident creation
    console.log("Creating incident:", incident);
    return { id: "placeholder", ...incident };
  }

  async updateIncident(incident: any): Promise<any> {
    // Implement incident update
    console.log("Updating incident:", incident);
    return incident;
  }
}

// Export a single instance
export const storage = new DatabaseStorage();