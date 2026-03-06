import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, parents, referrals, students, users } from "../drizzle/schema";
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

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

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

export async function getAllPromoters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "promoter")).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Parents ──────────────────────────────────────────────────────────────────

export async function getParentsByPromoter(promoterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parents).where(eq(parents.promoterId, promoterId)).orderBy(desc(parents.createdAt));
}

export async function getAllParents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parents).orderBy(desc(parents.createdAt));
}

export async function getParentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(parents).where(eq(parents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createParent(data: {
  promoterId: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(parents).values(data);
  return result;
}

export async function updateParent(
  id: number,
  data: { name?: string; email?: string; phone?: string; notes?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(parents).set(data).where(eq(parents.id, id));
}

export async function deleteParent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(parents).where(eq(parents.id, id));
}

// ─── Students ─────────────────────────────────────────────────────────────────

export async function getStudentsByParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.parentId, parentId)).orderBy(desc(students.createdAt));
}

export async function getAllStudents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).orderBy(desc(students.createdAt));
}

export async function getStudentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStudent(data: {
  parentId: number;
  name: string;
  age?: number;
  gradeLevel?: string;
  subjects?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(students).values(data);
  return result;
}

export async function updateStudent(
  id: number,
  data: { name?: string; age?: number; gradeLevel?: string; subjects?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(students).set(data).where(eq(students.id, id));
}

export async function deleteStudent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(students).where(eq(students.id, id));
}

export async function enrollStudent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(students)
    .set({ enrolled: true, enrolledAt: new Date() })
    .where(eq(students.id, id));
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export async function getReferralsByPromoter(promoterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).where(eq(referrals.promoterId, promoterId)).orderBy(desc(referrals.createdAt));
}

export async function getAllReferrals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).orderBy(desc(referrals.createdAt));
}

export async function getReferralByStudentId(studentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referrals).where(eq(referrals.studentId, studentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createReferral(data: {
  promoterId: number;
  parentId: number;
  studentId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(referrals).values({ ...data, creditAmount: "50.00", status: "pending" });
}

export async function markReferralPaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referrals).set({ status: "paid", paidAt: new Date() }).where(eq(referrals.id, id));
}

export async function getPromoterEarningsSummary(promoterId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, paid: 0, count: 0 };
  const all = await db.select().from(referrals).where(eq(referrals.promoterId, promoterId));
  const pending = all.filter((r) => r.status === "pending").length;
  const paid = all.filter((r) => r.status === "paid").length;
  return {
    total: all.length * 50,
    pending: pending * 50,
    paid: paid * 50,
    count: all.length,
  };
}

export async function getPendingReferrals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).where(eq(referrals.status, "pending")).orderBy(desc(referrals.createdAt));
}

export async function getStudentsByPromoter(promoterId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all parents for this promoter, then get students for those parents
  const promoterParents = await db.select().from(parents).where(eq(parents.promoterId, promoterId));
  if (promoterParents.length === 0) return [];
  const parentIds = promoterParents.map((p) => p.id);
  const allStudents = await db.select().from(students);
  return allStudents.filter((s) => parentIds.includes(s.parentId));
}
