import { Pool } from "@neondatabase/serverless";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { organizations, users, businessUnits } from "@shared/schema";
import type { Organization, User, BusinessUnit } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt">): Promise<User>;

  // Organization operations
  getOrganizationById(id: string): Promise<Organization | undefined>;
  createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization>;

  // Business unit operations
  getBusinessUnits(organizationId: string): Promise<BusinessUnit[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
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

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      createdAt: new Date(),
    }).returning();
    return newUser;
  }

  // Organization operations
  async getOrganizationById(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values({
      ...org,
      createdAt: new Date(),
    }).returning();
    return newOrg;
  }

  // Business unit operations
  async getBusinessUnits(organizationId: string): Promise<BusinessUnit[]> {
    return db.select().from(businessUnits).where(eq(businessUnits.organizationId, organizationId));
  }
}

// Helper function - needs implementation based on your requirements.
const generateProjectEmail = (id: string, organizationId: string): string => {
  // Generate a consistent, encrypted-looking project email
  const projectId = id.slice(0, 8); // Take first 8 chars of UUID
  const orgId = organizationId.slice(0, 4); // Take first 4 chars of org UUID
  return `project-${projectId}-${orgId}@carbontrack.io`; // Use a consistent domain
};

// Export a single instance
export const storage = new DatabaseStorage();
