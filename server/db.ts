import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, parents, promoterCredentials, promoterInvites, referralLinkVisits, referrals, students, users } from "../drizzle/schema";
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

export async function createPromoter(data: { name: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Insert a new user row with role=promoter and a placeholder openId
  // The user will claim their account on first OAuth login via email match
  const openId = `invite_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    role: "promoter",
    lastSignedIn: new Date(),
  });
}

export async function updatePromoter(id: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deletePromoter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

export async function getPromoterReferralCount(promoterId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ cnt: count() }).from(referrals).where(eq(referrals.promoterId, promoterId));
  return Number(rows[0]?.cnt ?? 0);
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

// ─── Referral Tokens ─────────────────────────────────────────────────────────

export async function getUserByReferralToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.referralToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setReferralToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ referralToken: token }).where(eq(users.id, userId));
}

// ─── Referral Link Visits ────────────────────────────────────────────────────

export async function logReferralVisit(data: {
  promoterId: number;
  userAgent?: string;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(referralLinkVisits).values(data);
}

export async function getReferralVisitStats(promoterId: number) {
  const db = await getDb();
  if (!db) return { total: 0, thisWeek: 0, today: 0, registrations: 0, conversionRate: 0 };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Sunday

  const [totalRows, weekRows, todayRows, registrationRows] = await Promise.all([
    db
      .select({ cnt: count() })
      .from(referralLinkVisits)
      .where(eq(referralLinkVisits.promoterId, promoterId)),
    db
      .select({ cnt: count() })
      .from(referralLinkVisits)
      .where(
        and(
          eq(referralLinkVisits.promoterId, promoterId),
          gte(referralLinkVisits.visitedAt, startOfWeek)
        )
      ),
    db
      .select({ cnt: count() })
      .from(referralLinkVisits)
      .where(
        and(
          eq(referralLinkVisits.promoterId, promoterId),
          gte(referralLinkVisits.visitedAt, startOfToday)
        )
      ),
    // Count parents registered via this promoter's referral link
    db
      .select({ cnt: count() })
      .from(parents)
      .where(eq(parents.promoterId, promoterId)),
  ]);

  const totalVisits = Number(totalRows[0]?.cnt ?? 0);
  const registrations = Number(registrationRows[0]?.cnt ?? 0);
  const conversionRate =
    totalVisits > 0 ? Math.round((registrations / totalVisits) * 100 * 10) / 10 : 0;

  return {
    total: totalVisits,
    thisWeek: Number(weekRows[0]?.cnt ?? 0),
    today: Number(todayRows[0]?.cnt ?? 0),
    registrations,
    conversionRate,
  };
}

export async function getAllPromoterVisitStats() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      promoterId: referralLinkVisits.promoterId,
      total: count(),
    })
    .from(referralLinkVisits)
    .groupBy(referralLinkVisits.promoterId);

  return rows.map((r) => ({ promoterId: r.promoterId, total: Number(r.total) }));
}

// ─── Promoter Invites ────────────────────────────────────────────────────────

export async function createInvite(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidate any existing unused invite for this user
  await db.delete(promoterInvites).where(eq(promoterInvites.userId, userId));
  await db.insert(promoterInvites).values({ userId, token, expiresAt });
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promoterInvites).where(eq(promoterInvites.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markInviteUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promoterInvites).set({ usedAt: new Date() }).where(eq(promoterInvites.id, id));
}

// ─── Promoter Credentials ────────────────────────────────────────────────────

export async function createCredentials(userId: number, email: string, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(promoterCredentials).values({ userId, email, passwordHash });
  // Also update the users table email
  await db.update(users).set({ email, loginMethod: "email" }).where(eq(users.id, userId));
}

export async function getCredentialsByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promoterCredentials).where(eq(promoterCredentials.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
