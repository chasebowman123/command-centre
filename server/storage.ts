import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { holdings, tasks, type Holding, type InsertHolding, type Task, type InsertTask } from "@shared/schema";
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
}

export const storage = new SqliteStorage();
