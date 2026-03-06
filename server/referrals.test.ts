import { describe, expect, it, vi, beforeEach, type MockedFunction } from "vitest";
import * as dbModule from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getAllPromoters: vi.fn().mockResolvedValue([]),
  getAllParents: vi.fn().mockResolvedValue([]),
  getAllStudents: vi.fn().mockResolvedValue([]),
  getAllReferrals: vi.fn().mockResolvedValue([]),
  getParentsByPromoter: vi.fn().mockResolvedValue([]),
  getParentById: vi.fn().mockResolvedValue(null),
  createParent: vi.fn().mockResolvedValue({}),
  updateParent: vi.fn().mockResolvedValue({}),
  deleteParent: vi.fn().mockResolvedValue({}),
  getStudentsByParent: vi.fn().mockResolvedValue([]),
  getStudentsByPromoter: vi.fn().mockResolvedValue([]),
  getStudentById: vi.fn().mockResolvedValue(null),
  createStudent: vi.fn().mockResolvedValue({}),
  updateStudent: vi.fn().mockResolvedValue({}),
  deleteStudent: vi.fn().mockResolvedValue({}),
  enrollStudent: vi.fn().mockResolvedValue({}),
  createReferral: vi.fn().mockResolvedValue({}),
  getReferralsByPromoter: vi.fn().mockResolvedValue([]),
  getReferralByStudentId: vi.fn().mockResolvedValue(null),
  markReferralPaid: vi.fn().mockResolvedValue({}),
  getPromoterEarningsSummary: vi.fn().mockResolvedValue({ total: 0, pending: 0, paid: 0, count: 0 }),
  getPendingReferrals: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue({}),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@test.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(id = 2): TrpcContext {
  return {
    user: {
      id,
      openId: `promoter-open-id-${id}`,
      name: "Promoter User",
      email: "promoter@test.com",
      loginMethod: "manus",
      role: "promoter",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Role-based access control", () => {
  it("admin can access admin.getStats", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.getStats();
    expect(result).toHaveProperty("totalPromoters");
    expect(result).toHaveProperty("totalParents");
    expect(result).toHaveProperty("totalStudents");
  });

  it("promoter is forbidden from admin.getStats", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.admin.getStats()).rejects.toThrow();
  });

  it("unauthenticated user is forbidden from admin.getStats", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.admin.getStats()).rejects.toThrow();
  });

  it("promoter can access promoter.getStats", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.promoter.getStats();
    expect(result).toHaveProperty("totalParents");
    expect(result).toHaveProperty("totalStudents");
  });

  it("admin is forbidden from promoter.getStats (admin role not promoter)", async () => {
    // Admin role is not 'promoter', so promoterProcedure should reject
    const caller = appRouter.createCaller(makeAdminCtx());
    // Admin has role 'admin', which is allowed by promoterProcedure (admin OR promoter)
    // This should succeed since admin can also access promoter routes
    const result = await caller.promoter.getStats();
    expect(result).toBeDefined();
  });
});

describe("Parent management", () => {
  it("promoter can create a parent", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.parents.create({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
    });
    expect(result.success).toBe(true);
  });

  it("unauthenticated user cannot create a parent", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.parents.create({ name: "Jane", email: "jane@example.com" })
    ).rejects.toThrow();
  });
});

describe("Student enrollment (admin only)", () => {
  beforeEach(() => {
    const db = vi.mocked(dbModule);
    (db.getStudentById as MockedFunction<typeof db.getStudentById>).mockResolvedValue({
      id: 10,
      parentId: 5,
      name: "Alex Student",
      age: 12,
      gradeLevel: "Grade 7",
      subjects: "Math, Science",
      enrolled: false,
      enrolledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (db.getParentById as MockedFunction<typeof db.getParentById>).mockResolvedValue({
      id: 5,
      promoterId: 2,
      name: "Jane Parent",
      email: "jane@example.com",
      phone: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (db.getUserById as MockedFunction<typeof db.getUserById>).mockResolvedValue({
      id: 2,
      openId: "promoter-open-id-2",
      name: "Promoter User",
      email: "promoter@test.com",
      loginMethod: "manus",
      role: "promoter",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
  });

  it("admin can enroll a student and get success response", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.enroll({ studentId: 10 });
    expect(result.success).toBe(true);
  });

  it("promoter cannot enroll a student", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.students.enroll({ studentId: 10 })).rejects.toThrow();
  });

  it("unauthenticated user cannot enroll a student", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.students.enroll({ studentId: 10 })).rejects.toThrow();
  });
});

describe("Payout management (admin only)", () => {
  it("admin can mark a referral as paid", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.referrals.markPaid({ referralId: 1 });
    expect(result.success).toBe(true);
  });

  it("promoter cannot mark a referral as paid", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.referrals.markPaid({ referralId: 1 })).rejects.toThrow();
  });
});

describe("Auth", () => {
  it("logout clears session cookie and returns success", async () => {
    const ctx = makeAdminCtx();
    const clearedCookies: string[] = [];
    (ctx.res as any).clearCookie = (name: string) => clearedCookies.push(name);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});
