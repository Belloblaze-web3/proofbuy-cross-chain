import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const proofbuyPolicies = mysqlTable("proofbuy_policies", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  maxSpendCents: int("maxSpendCents").notNull().default(5000),
  allowedRecipients: json("allowedRecipients").$type<string[]>().notNull(),
  destinationNetwork: varchar("destinationNetwork", { length: 32 }).notNull().default("base-sepolia"),
  requireHumanApproval: boolean("requireHumanApproval").notNull().default(true),
  version: int("version").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("proofbuy_policies_workspace_unique").on(table.workspaceId)]);

export const proofbuyProposals = mysqlTable("proofbuy_proposals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  vendor: varchar("vendor", { length: 120 }).notNull(),
  recipient: varchar("recipient", { length: 96 }).notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 12 }).notNull().default("USDC"),
  destinationNetwork: varchar("destinationNetwork", { length: 32 }).notNull(),
  purpose: text("purpose").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  decision: varchar("decision", { length: 16 }).notNull(),
  policyVersion: int("policyVersion").notNull(),
  policySnapshot: json("policySnapshot").$type<Record<string, unknown>>().notNull(),
  ruleResults: json("ruleResults").$type<Array<{ key: string; label: string; passed: boolean; detail: string }>>().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: varchar("approvedBy", { length: 80 }),
  executionReference: varchar("executionReference", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const proofbuyEvents = mysqlTable("proofbuy_events", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  proposalId: varchar("proposalId", { length: 36 }).notNull(),
  eventType: varchar("eventType", { length: 48 }).notNull(),
  message: text("message").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProofbuyPolicy = typeof proofbuyPolicies.$inferSelect;
export type ProofbuyProposal = typeof proofbuyProposals.$inferSelect;
export type ProofbuyEvent = typeof proofbuyEvents.$inferSelect;
