import createMemoryStore from "memorystore";
import session from "express-session";
import { User, BusinessUnit, Emission } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  getBusinessUnits(userId: number): Promise<BusinessUnit[]>;
  createBusinessUnit(unit: Omit<BusinessUnit, "id">): Promise<BusinessUnit>;
  getEmissions(businessUnitId: number): Promise<Emission[]>;
  createEmission(emission: Omit<Emission, "id">): Promise<Emission>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businessUnits: Map<number, BusinessUnit>;
  private emissions: Map<number, Emission>;
  sessionStore: session.Store;
  private currentUserId: number;
  private currentBusinessUnitId: number;
  private currentEmissionId: number;

  constructor() {
    this.users = new Map();
    this.businessUnits = new Map();
    this.emissions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.currentUserId = 1;
    this.currentBusinessUnitId = 1;
    this.currentEmissionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getBusinessUnits(userId: number): Promise<BusinessUnit[]> {
    return Array.from(this.businessUnits.values()).filter(
      (unit) => unit.userId === userId,
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
      (emission) => emission.businessUnitId === businessUnitId,
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
