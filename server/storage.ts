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
}

// Export a single instance
export const storage = new DatabaseStorage();