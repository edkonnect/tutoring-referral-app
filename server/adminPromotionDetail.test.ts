import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSetting: vi.fn().mockResolvedValue(25),
    getAllSettings: vi.fn().mockResolvedValue({ referralFee: "50.00", productReferralFee: "25.00" }),
    upsertSetting: vi.fn().mockResolvedValue(undefined),
    SETTING_KEYS: { referralFee: "referralFee", productReferralFee: "productReferralFee" },
    getAllProductPromotions: vi.fn(),
    getProductById: vi.fn(),
    getParentById: vi.fn(),
    getUserById: vi.fn(),
    getProductEnrollmentByPromotionId: vi.fn(),
    getStudentsByParent: vi.fn(),
    getProductPromotionById: vi.fn(),
    confirmProductEnrollment: vi.fn(),
    getProductEnrollmentsByPromoter: vi.fn(),
    getAllProductEnrollments: vi.fn(),
    markProductEnrollmentPaid: vi.fn(),
    getPromoterProductEarningsSummary: vi.fn(),
    sendProductPromotion: vi.fn(),
    getProductPromotionsByPromoter: vi.fn(),
    getProductWithTemplate: vi.fn().mockResolvedValue(null),
    getPromotionByEnrollmentToken: vi.fn(),
    createStudent: vi.fn(),
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

function makePromoterCtx(): TrpcContext {
  return {
    user: {
      id: 2, openId: "promoter-2", name: "Promoter", email: "promoter@test.com",
      role: "promoter", loginMethod: "email", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockPromotion = (id: number) => ({
  id, productId: 5, parentId: 10, promoterId: 2,
  sentAt: new Date(), message: "Check this out!", enrollmentToken: `token-${id}`,
});

const mockProduct = () => ({
  id: 5, name: "Math Tutoring", active: true, description: "Advanced math",
  price: "120.00", category: "Math", createdAt: new Date(), templateId: null,
  referralFeeOverride: null,
});

const mockParent = () => ({
  id: 10, promoterId: 2, name: "Jane Doe", email: "jane@test.com",
  phone: null, notes: null, createdAt: new Date(),
});

const mockPromoter = () => ({
  id: 2, openId: "promoter-2", name: "Promoter", email: "promoter@test.com",
  role: "promoter", loginMethod: "email", createdAt: new Date(),
  updatedAt: new Date(), lastSignedIn: new Date(),
});

const mockStudents = () => [
  {
    id: 1, parentId: 10, name: "Alice", lastName: "Doe",
    gradeLevel: "Grade 5", educationGoals: "Improve math skills and build confidence",
    subjects: null, age: null, enrolled: false, createdAt: new Date(),
  },
];

describe("productPromotions.listAll — student info enrichment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes students array for each promotion", async () => {
    vi.mocked(db.getAllProductPromotions).mockResolvedValue([mockPromotion(1)] as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(null as any);
    vi.mocked(db.getStudentsByParent).mockResolvedValue(mockStudents() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.listAll();

    expect(result).toHaveLength(1);
    expect(result[0].students).toBeDefined();
    expect(result[0].students).toHaveLength(1);
    expect(db.getStudentsByParent).toHaveBeenCalledWith(10);
  });

  it("includes student first name, last name, grade level, and education goals", async () => {
    vi.mocked(db.getAllProductPromotions).mockResolvedValue([mockPromotion(1)] as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(null as any);
    vi.mocked(db.getStudentsByParent).mockResolvedValue(mockStudents() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.listAll();

    const student = result[0].students![0];
    expect(student.name).toBe("Alice");
    expect(student.lastName).toBe("Doe");
    expect(student.gradeLevel).toBe("Grade 5");
    expect(student.educationGoals).toBe("Improve math skills and build confidence");
  });

  it("returns empty students array when no students collected yet", async () => {
    vi.mocked(db.getAllProductPromotions).mockResolvedValue([mockPromotion(1)] as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(null as any);
    vi.mocked(db.getStudentsByParent).mockResolvedValue([] as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.listAll();

    expect(result[0].students).toEqual([]);
  });

  it("fetches students for each promotion independently", async () => {
    vi.mocked(db.getAllProductPromotions).mockResolvedValue([
      mockPromotion(1),
      { ...mockPromotion(2), parentId: 20 },
    ] as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(null as any);
    vi.mocked(db.getStudentsByParent)
      .mockResolvedValueOnce(mockStudents() as any)
      .mockResolvedValueOnce([] as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.listAll();

    expect(db.getStudentsByParent).toHaveBeenCalledTimes(2);
    expect(db.getStudentsByParent).toHaveBeenCalledWith(10);
    expect(db.getStudentsByParent).toHaveBeenCalledWith(20);
    expect(result[0].students).toHaveLength(1);
    expect(result[1].students).toHaveLength(0);
  });

  it("promoter cannot access listAll", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.productPromotions.listAll()).rejects.toThrow("Admin access required");
  });

  it("includes enrollment info alongside student info", async () => {
    const enrollment = {
      id: 99, promotionId: 1, promoterId: 2, parentId: 10, productId: 5,
      status: "pending", creditAmount: "25.00", enrolledAt: new Date(), paidAt: null,
    };
    vi.mocked(db.getAllProductPromotions).mockResolvedValue([mockPromotion(1)] as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(enrollment as any);
    vi.mocked(db.getStudentsByParent).mockResolvedValue(mockStudents() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.listAll();

    expect(result[0].enrollment).toBeDefined();
    expect(result[0].enrollment?.status).toBe("pending");
    expect(result[0].students).toHaveLength(1);
  });
});
