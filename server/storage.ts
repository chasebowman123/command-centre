import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  holdings, tasks, pensionFunds, properties,
  type Holding, type InsertHolding,
  type Task, type InsertTask,
  type PensionFund, type InsertPensionFund,
  type Property, type InsertProperty,
} from "@shared/schema";
import { eq } from "drizzle-orm";

const dbPath = process.env.DATABASE_URL || "data.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

export interface IStorage {
  // Holdings
  getHoldings(): Holding[];
  createHolding(data: InsertHolding): Holding;
  updateHolding(id: number, data: Partial<InsertHolding>): Holding | undefined;
  deleteHolding(id: number): void;
  // Tasks
  getTasks(): Task[];
  createTask(data: InsertTask): Task;
  updateTask(id: number, data: Partial<InsertTask>): Task | undefined;
  deleteTask(id: number): void;
  // Pension Funds
  getPensionFunds(): PensionFund[];
  createPensionFund(data: InsertPensionFund): PensionFund;
  updatePensionFund(id: number, data: Partial<InsertPensionFund>): PensionFund | undefined;
  deletePensionFund(id: number): void;
  // Properties
  getProperties(): Property[];
  createProperty(data: InsertProperty): Property;
  updateProperty(id: number, data: Partial<InsertProperty>): Property | undefined;
  deleteProperty(id: number): void;
}

class SqliteStorage implements IStorage {
  // === Holdings ===
  getHoldings(): Holding[] {
    return db.select().from(holdings).all();
  }

  createHolding(data: InsertHolding): Holding {
    return db.insert(holdings).values(data).returning().get()!;
  }

  updateHolding(id: number, data: Partial<InsertHolding>): Holding | undefined {
    return db.update(holdings).set(data).where(eq(holdings.id, id)).returning().get();
  }

  deleteHolding(id: number): void {
    db.delete(holdings).where(eq(holdings.id, id)).run();
  }

  // === Tasks ===
  getTasks(): Task[] {
    return db.select().from(tasks).all();
  }

  createTask(data: InsertTask): Task {
    return db.insert(tasks).values(data).returning().get()!;
  }

  updateTask(id: number, data: Partial<InsertTask>): Task | undefined {
    return db.update(tasks).set(data).where(eq(tasks.id, id)).returning().get();
  }

  deleteTask(id: number): void {
    db.delete(tasks).where(eq(tasks.id, id)).run();
  }

  // === Pension Funds ===
  getPensionFunds(): PensionFund[] {
    return db.select().from(pensionFunds).all();
  }

  createPensionFund(data: InsertPensionFund): PensionFund {
    return db.insert(pensionFunds).values(data).returning().get()!;
  }

  updatePensionFund(id: number, data: Partial<InsertPensionFund>): PensionFund | undefined {
    return db.update(pensionFunds).set(data).where(eq(pensionFunds.id, id)).returning().get();
  }

  deletePensionFund(id: number): void {
    db.delete(pensionFunds).where(eq(pensionFunds.id, id)).run();
  }

  // === Properties ===
  getProperties(): Property[] {
    return db.select().from(properties).all();
  }

  createProperty(data: InsertProperty): Property {
    return db.insert(properties).values(data).returning().get()!;
  }

  updateProperty(id: number, data: Partial<InsertProperty>): Property | undefined {
    return db.update(properties).set(data).where(eq(properties.id, id)).returning().get();
  }

  deleteProperty(id: number): void {
    db.delete(properties).where(eq(properties.id, id)).run();
  }
}

export const storage = new SqliteStorage();
