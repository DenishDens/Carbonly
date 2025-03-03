import createMemoryStore from "memorystore";
import session from "express-session";
import { User, Organization, BusinessUnit, Emission, Invitation } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;

  // Organization operations
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: Omit<Organization, "id">): Promise<Organization>;
  updateOrganizationLogo(id: number, logoUrl: string): Promise<Organization>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string, orgId: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;

  // Invitation operations
  createInvitation(invitation: Omit<Invitation, "id">): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  deleteInvitation(id: number): Promise<void>;

  // Business unit operations
  getBusinessUnits(organizationId: number): Promise<BusinessUnit[]>;
  createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit>;

  // Emission operations
  getEmissions(businessUnitId: number): Promise<Emission[]>;
  createEmission(emission: Omit<Emission, "id">): Promise<Emission>;
}

export class MemStorage implements IStorage {
  private organizations: Map<number, Organization>;
  private users: Map<number, User>;
  private invitations: Map<number, Invitation>;
  private businessUnits: Map<number, BusinessUnit>;
  private emissions: Map<number, Emission>;
  sessionStore: session.Store;
  private currentOrgId: number;
  private currentUserId: number;
  private currentInvitationId: number;
  private currentBusinessUnitId: number;
  private currentEmissionId: number;

  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.invitations = new Map();
    this.businessUnits = new Map();
    this.emissions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.currentOrgId = 1;
    this.currentUserId = 1;
    this.currentInvitationId = 1;
    this.currentBusinessUnitId = 1;
    this.currentEmissionId = 1;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(
      (org) => org.slug === slug
    );
  }

  async createOrganization(org: Omit<Organization, "id">): Promise<Organization> {
    const id = this.currentOrgId++;
    const newOrg = { ...org, id };
    this.organizations.set(id, newOrg);
    return newOrg;
  }

  async updateOrganizationLogo(id: number, logoUrl: string): Promise<Organization> {
    const org = this.organizations.get(id);
    if (!org) throw new Error("Organization not found");
    const updatedOrg = { ...org, logo: logoUrl };
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string, orgId: number): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username && user.organizationId === orgId
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async createInvitation(invitation: Omit<Invitation, "id">): Promise<Invitation> {
    const id = this.currentInvitationId++;
    const newInvitation = { ...invitation, id };
    this.invitations.set(id, newInvitation);
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    return Array.from(this.invitations.values()).find(
      (invitation) => invitation.token === token
    );
  }

  async deleteInvitation(id: number): Promise<void> {
    this.invitations.delete(id);
  }

  async getBusinessUnits(organizationId: number): Promise<BusinessUnit[]> {
    return Array.from(this.businessUnits.values()).filter(
      (unit) => unit.organizationId === organizationId
    );
  }

  async createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit> {
    const id = this.currentBusinessUnitId++;
    const newUnit = { ...unit, id };
    this.businessUnits.set(id, newUnit);
    return newUnit;
  }

  async getEmissions(businessUnitId: number): Promise<Emission[]> {
    return Array.from(this.emissions.values()).filter(
      (emission) => emission.businessUnitId === businessUnitId
    );
  }

  async createEmission(emission: Omit<Emission, "id">): Promise<Emission> {
    const id = this.currentEmissionId++;
    const newEmission = { ...emission, id };
    this.emissions.set(id, newEmission);
    return newEmission;
  }
}

export const storage = new MemStorage();