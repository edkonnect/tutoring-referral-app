import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSetting: vi.fn().mockResolvedValue(25),
    getAllSettings: vi.fn().mockResolvedValue({ referralFee: "50.00", productReferralFee: "25.00" }),
    upsertSetting: vi.fn().mockResolvedValue(undefined),
    SETTING_KEYS: { referralFee: "referralFee", productReferralFee: "productReferralFee" },
    getStudentById: vi.fn(),
    getParentById: vi.fn(),
    updateStudent: vi.fn().mockResolvedValue(undefined),
    createStudent: vi.fn(),
    deleteStudent: vi.fn(),
    getStudentsByParent: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-1", name: "Admin", email: "admin@test.com",
      role: "admin", loginMethod: "manus", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(id = 2): TrpcContext {
  return {
    user: {
      id, openId: `promoter-${id}`, name: "Promoter", email: "promoter@test.com",
      role: "promoter", loginMethod: "email", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockStudent = (overrides = {}) => ({
  id: 42, parentId: 10, name: "Alice", lastName: "Doe",
  gradeLevel: "Grade 5", educationGoals: "Improve math",
  subjects: null, age: null, enrolled: false, createdAt: new Date(),
  ...overrides,
});

const mockParent = (promoterId = 2) => ({
  id: 10, promoterId, name: "Jane Doe", email: "jane@test.com",
  phone: null, notes: null, createdAt: new Date(),
});

describe("students.update — admin inline edit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows admin to update student first name", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.update({ id: 42, name: "Alicia" });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledWith(42, expect.objectContaining({ name: "Alicia" }));
  });

  it("allows admin to update student last name", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.update({ id: 42, lastName: "Smith" });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledWith(42, expect.objectContaining({ lastName: "Smith" }));
  });

  it("allows admin to update grade level", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.update({ id: 42, gradeLevel: "Grade 7" });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledWith(42, expect.objectContaining({ gradeLevel: "Grade 7" }));
  });

  it("allows admin to update education goals", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.update({ id: 42, educationGoals: "Prepare for SAT exams" });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledWith(42, expect.objectContaining({ educationGoals: "Prepare for SAT exams" }));
  });

  it("allows admin to update all fields at once", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.students.update({
      id: 42,
      name: "Bob",
      lastName: "Johnson",
      gradeLevel: "Grade 9",
      educationGoals: "College prep and AP courses",
    });
    expect(result.success).toBe(true);
    expect(db.updateStudent).toHaveBeenCalledWith(42, {
      name: "Bob",
      lastName: "Johnson",
      gradeLevel: "Grade 9",
      educationGoals: "College prep and AP courses",
    });
  });

  it("throws NOT_FOUND when student does not exist", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(null as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.students.update({ id: 999, name: "Ghost" })).rejects.toThrow("NOT_FOUND");
  });

  it("allows the owning promoter to update their student", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent(2) as any);
    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.students.update({ id: 42, name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("rejects a promoter trying to edit another promoter's student", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent(99) as any); // owned by promoter 99
    const caller = appRouter.createCaller(makePromoterCtx(2)); // logged in as promoter 2
    await expect(caller.students.update({ id: 42, name: "Hacked" })).rejects.toThrow("FORBIDDEN");
  });

  it("rejects empty first name", async () => {
    vi.mocked(db.getStudentById).mockResolvedValue(mockStudent() as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.students.update({ id: 42, name: "" })).rejects.toThrow();
  });
});
