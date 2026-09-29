import { int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const otpChallenges = mysqlTable("otp_challenges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  phoneHash: varchar("phoneHash", { length: 64 }).notNull(),
  codeHash: varchar("codeHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  trackingId: varchar("trackingId", { length: 32 }).notNull().unique(),
  anonymous: int("anonymous").default(0).notNull(),
  phoneHash: varchar("phoneHash", { length: 64 }),
  agencyIndex: int("agencyIndex").notNull(),
  agencyName: varchar("agencyName", { length: 255 }).notNull(),
  stateOrUt: varchar("stateOrUt", { length: 128 }),
  payload: text("payload").notNull(),
  status: varchar("status", { length: 32 }).default("received").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
