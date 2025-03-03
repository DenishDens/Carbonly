import createMemoryStore from "memorystore";
import session from "express-session";
import { User, Organization, BusinessUnit, Emission, ProcessingTransaction } from "@shared/schema";
import * as crypto from 'crypto';

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

export class MemStorage implements IStorage {
  private organizations: Map<string, Organization>;
  private users: Map<string, User>;
  private businessUnits: Map<string, BusinessUnit>;
  private emissions: Map<string, Emission>;
  private transactions: Map<string, ProcessingTransaction>;
  sessionStore: session.Store;

  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.businessUnits = new Map();
    this.emissions = new Map();
    this.transactions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(
      (org) => org.slug === slug
    );
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(org: Omit<Organization, "id">): Promise<Organization> {
    const id = this.generateUUID();
    const newOrg = { ...org, id };
    this.organizations.set(id, newOrg);
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const org = await this.getOrganizationById(id);
    if (!org) throw new Error("Organization not found");
    const updatedOrg = { ...org, ...updates };
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  async updateOrganizationLogo(id: string, logoUrl: string): Promise<Organization> {
    return this.updateOrganization(id, { logo: logoUrl });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.generateUUID();
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getBusinessUnits(organizationId: string): Promise<BusinessUnit[]> {
    return Array.from(this.businessUnits.values()).filter(
      (unit) => unit.organizationId === organizationId
    );
  }

  async createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit> {
    const id = this.generateUUID();
    const newUnit = { ...unit, id };
    this.businessUnits.set(id, newUnit);
    return newUnit;
  }

  async getEmissions(businessUnitId: string): Promise<Emission[]> {
    return Array.from(this.emissions.values()).filter(
      (emission) => emission.businessUnitId === businessUnitId
    );
  }

  async createEmission(emission: Omit<Emission, "id">): Promise<Emission> {
    const id = this.generateUUID();
    const newEmission = { ...emission, id };
    this.emissions.set(id, newEmission);
    return newEmission;
  }

  async createTransaction(transaction: Omit<ProcessingTransaction, "id">): Promise<ProcessingTransaction> {
    const id = this.generateUUID();
    const newTransaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransactionStatus(id: string, status: string, errorType: string | null = null): Promise<ProcessingTransaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) throw new Error("Transaction not found");
    const updatedTransaction = { ...transaction, status, errorType };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
}

export const storage = new MemStorage();