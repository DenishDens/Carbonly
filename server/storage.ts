import { Pool } from "@neondatabase/serverless";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { organizations, users, businessUnits, emissions, processingTransactions } from "@shared/schema";
import type { Organization, User, BusinessUnit, Emission, ProcessingTransaction } from "@shared/schema";

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

  // Business unit operations
  getBusinessUnits(organizationId: string): Promise<BusinessUnit[]>;
  createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit>;

  // Emission operations
  getEmissions(businessUnitId: string): Promise<Emission[]>;
  createEmission(emission: Omit<Emission, "id">): Promise<Emission>;

  // Transaction logging
  createTransaction(transaction: Omit<ProcessingTransaction, "id">): Promise<ProcessingTransaction>;
  updateTransactionStatus(id: string, status: string, errorType?: string | null): Promise<ProcessingTransaction>;
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

  // Business unit operations
  async getBusinessUnits(organizationId: string): Promise<BusinessUnit[]> {
    return db.select().from(businessUnits).where(eq(businessUnits.organizationId, organizationId));
  }

  async createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit> {
    const [newUnit] = await db.insert(businessUnits).values(unit).returning();
    return newUnit;
  }

  // Emission operations
  async getEmissions(businessUnitId: string): Promise<Emission[]> {
    return db.select().from(emissions).where(eq(emissions.businessUnitId, businessUnitId));
  }

  async createEmission(emission: Omit<Emission, "id">): Promise<Emission> {
    const [newEmission] = await db.insert(emissions).values(emission).returning();
    return newEmission;
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
}

// Export a single instance
export const storage = new DatabaseStorage();