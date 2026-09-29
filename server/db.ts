import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { complaints, InsertUser, otpChallenges, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOtpChallenge(value: typeof otpChallenges.$inferInsert) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(otpChallenges).values(value);
  return true;
}

export async function findOtpChallenge(id: string, phoneHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(otpChallenges)
    .where(and(eq(otpChallenges.id, id), eq(otpChallenges.phoneHash, phoneHash), gt(otpChallenges.expiresAt, new Date())))
    .limit(1);
  return result[0];
}

export async function updateOtpChallenge(id: string, values: Partial<typeof otpChallenges.$inferInsert>) {
  const db = await getDb();
  if (!db) return false;
  await db.update(otpChallenges).set(values).where(eq(otpChallenges.id, id));
  return true;
}

export async function createComplaint(value: typeof complaints.$inferInsert) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(complaints).values(value);
  return true;
}

export async function findComplaint(trackingId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(complaints)
    .where(eq(complaints.trackingId, trackingId))
    .orderBy(desc(complaints.createdAt))
    .limit(1);
  return result[0];
}
