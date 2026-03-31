import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === HOLDINGS ===
export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  avgPrice: real("avg_price").notNull(),
  assetType: text("asset_type").notNull().default("stock"), // stock | crypto
});

export const insertHoldingSchema = createInsertSchema(holdings).omit({ id: true });
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Holding = typeof holdings.$inferSelect;

// === LOCAL TASKS ===
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// === PENSION FUNDS ===
export const pensionFunds = sqliteTable("pension_funds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(), // "SJP" | "AustralianSuper"
  fundName: text("fund_name").notNull(),
  isin: text("isin"), // for SJP fund price tracking
  currentValue: real("current_value").notNull(),
  allocation: real("allocation"), // percentage e.g. 16.0
  currency: text("currency").notNull().default("GBP"),
});

export const insertPensionFundSchema = createInsertSchema(pensionFunds).omit({ id: true });
export type InsertPensionFund = z.infer<typeof insertPensionFundSchema>;
export type PensionFund = typeof pensionFunds.$inferSelect;

// === PROPERTY ===
export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // friendly label
  address: text("address").notNull(),
  postcode: text("postcode").notNull(),
  purchasePrice: real("purchase_price").notNull(),
  currentValue: real("current_value").notNull(),
  mortgageBalance: real("mortgage_balance").notNull(),
  currency: text("currency").notNull().default("GBP"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;
