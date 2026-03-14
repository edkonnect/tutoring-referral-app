import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbModule from "./db";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
  getSetting: vi.fn().mockResolvedValue(50),
  getAllSettings: vi.fn().mockResolvedValue({ referralFee: "50.00", productReferralFee: "25.00" }),
  upsertSetting: vi.fn().mockResolvedValue(undefined),
  SETTING_KEYS: {
    referralFee: "referralFee",
    productReferralFee: "productReferralFee",
  },
    getParentById: vi.fn(),
    updateParent: vi.fn(),
    getStudentById: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    createStudent: vi.fn(),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeCtx(role: "promoter" | "admin", id = 10): TrpcContext {
  return {
    user: {
      id,
      openId: `open-id-${id}`,
      name: role === "admin" ? "Admin User" : "Promoter User",
      email: `${role}@example.com`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeParent(promoterId: number) {
  return {
    id: 42,
    name: "Jane Smith",
    email: "jane@example.com",
    phone: null,
    notes: null,
    promoterId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeStudent(parentId: number, enrolled = false) {
  return {
    id: 99,
    name: "Alex Smith",
    age: 12,
    gradeLevel: "Grade 7",
    subjects: "Mathematics",
    parentId,
    enrolled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── parents.update tests ─────────────────────────────────────────────────────

describe("parents.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a promoter to update their own parent", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(10));
    vi.mocked(dbModule.updateParent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    const result = await caller.parents.update({
      id: 42,
      name: "Jane Updated",
      email: "jane.updated@example.com",
    });

    expect(result.success).toBe(true);
    expect(dbModule.updateParent).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ name: "Jane Updated" })
    );
  });

  it("forbids a promoter from updating another promoter's parent", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(99)); // belongs to promoter 99

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    await expect(
      caller.parents.update({ id: 42, name: "Hacked" })
    ).rejects.toThrow();
    expect(dbModule.updateParent).not.toHaveBeenCalled();
  });

  it("allows admin to update any parent", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(99));
    vi.mocked(dbModule.updateParent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx("admin", 1));
    const result = await caller.parents.update({ id: 42, name: "Admin Updated" });

    expect(result.success).toBe(true);
    expect(dbModule.updateParent).toHaveBeenCalled();
  });

  it("throws NOT_FOUND when parent does not exist", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    await expect(
      caller.parents.update({ id: 9999, name: "Ghost" })
    ).rejects.toThrow();
  });
});

// ─── students.update tests ────────────────────────────────────────────────────

describe("students.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a promoter to update a student under their own parent", async () => {
    vi.mocked(dbModule.getStudentById).mockResolvedValue(makeStudent(42));
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(10));
    vi.mocked(dbModule.updateStudent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    const result = await caller.students.update({
      id: 99,
      name: "Alex Updated",
      gradeLevel: "Grade 8",
    });

    expect(result.success).toBe(true);
    expect(dbModule.updateStudent).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ name: "Alex Updated", gradeLevel: "Grade 8" })
    );
  });

  it("forbids a promoter from updating a student under another promoter's parent", async () => {
    vi.mocked(dbModule.getStudentById).mockResolvedValue(makeStudent(42));
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(99)); // different promoter

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    await expect(
      caller.students.update({ id: 99, name: "Hacked" })
    ).rejects.toThrow();
    expect(dbModule.updateStudent).not.toHaveBeenCalled();
  });
});

// ─── students.delete tests ────────────────────────────────────────────────────

describe("students.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a promoter to delete a non-enrolled student", async () => {
    vi.mocked(dbModule.getStudentById).mockResolvedValue(makeStudent(42, false));
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(10));
    vi.mocked(dbModule.deleteStudent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    const result = await caller.students.delete({ id: 99 });

    expect(result.success).toBe(true);
    expect(dbModule.deleteStudent).toHaveBeenCalledWith(99);
  });

  it("forbids deleting a student from another promoter's parent", async () => {
    vi.mocked(dbModule.getStudentById).mockResolvedValue(makeStudent(42));
    vi.mocked(dbModule.getParentById).mockResolvedValue(makeParent(99));

    const caller = appRouter.createCaller(makeCtx("promoter", 10));
    await expect(caller.students.delete({ id: 99 })).rejects.toThrow();
    expect(dbModule.deleteStudent).not.toHaveBeenCalled();
  });
});
