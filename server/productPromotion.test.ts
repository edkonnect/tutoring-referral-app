import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllProducts: vi.fn(),
    getProductById: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    sendProductPromotion: vi.fn(),
    getProductPromotionsByPromoter: vi.fn(),
    getAllProductPromotions: vi.fn(),
    getProductPromotionById: vi.fn(),
    confirmProductEnrollment: vi.fn(),
    getProductEnrollmentsByPromoter: vi.fn(),
    getAllProductEnrollments: vi.fn(),
    getProductEnrollmentByPromotionId: vi.fn(),
    markProductEnrollmentPaid: vi.fn(),
    getPromoterProductEarningsSummary: vi.fn(),
    getParentById: vi.fn(),
    getUserById: vi.fn(),
  };
});

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";

function makeAdminCtx(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-1", name: "Admin", email: "admin@test.com", role: "admin", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(id = 2): TrpcContext {
  return {
    user: { id, openId: `promoter-${id}`, name: "Promoter", email: "promoter@test.com", role: "promoter", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("products router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin can create a product", async () => {
    vi.mocked(db.createProduct).mockResolvedValue({} as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.create({ name: "Math Tutoring", description: "Advanced math", price: "120.00", category: "Math" });
    expect(result.success).toBe(true);
    expect(db.createProduct).toHaveBeenCalledWith({ name: "Math Tutoring", description: "Advanced math", price: "120.00", category: "Math" });
  });

  it("promoter cannot create a product", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.create({ name: "Test" })).rejects.toThrow("Admin access required");
  });

  it("admin can update a product", async () => {
    vi.mocked(db.updateProduct).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 1, name: "Updated Math", active: false });
    expect(result.success).toBe(true);
    expect(db.updateProduct).toHaveBeenCalledWith(1, { name: "Updated Math", active: false });
  });

  it("admin can delete a product", async () => {
    vi.mocked(db.deleteProduct).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("promoter cannot delete a product", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.delete({ id: 1 })).rejects.toThrow("Admin access required");
  });
});

describe("productPromotions router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("promoter can send a product promotion to their own parent", async () => {
    vi.mocked(db.getParentById).mockResolvedValue({ id: 10, promoterId: 2, name: "Jane Doe", email: "jane@test.com", phone: null, notes: null, createdAt: new Date() } as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 5, name: "Math Tutoring", active: true, description: null, price: "120.00", category: "Math", createdAt: new Date() } as any);
    vi.mocked(db.sendProductPromotion).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.productPromotions.send({ parentId: 10, productId: 5, message: "Check this out!" });
    expect(result.success).toBe(true);
    expect(db.sendProductPromotion).toHaveBeenCalledWith({ promoterId: 2, parentId: 10, productId: 5, message: "Check this out!" });
  });

  it("promoter cannot send promotion to another promoter's parent", async () => {
    vi.mocked(db.getParentById).mockResolvedValue({ id: 10, promoterId: 99, name: "Jane Doe", email: "jane@test.com", phone: null, notes: null, createdAt: new Date() } as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 5, name: "Math Tutoring", active: true, description: null, price: "120.00", category: "Math", createdAt: new Date() } as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await expect(caller.productPromotions.send({ parentId: 10, productId: 5 })).rejects.toThrow("Parent does not belong to you");
  });

  it("promoter cannot send promotion for inactive product", async () => {
    vi.mocked(db.getParentById).mockResolvedValue({ id: 10, promoterId: 2, name: "Jane Doe", email: "jane@test.com", phone: null, notes: null, createdAt: new Date() } as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 5, name: "Old Product", active: false, description: null, price: null, category: null, createdAt: new Date() } as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await expect(caller.productPromotions.send({ parentId: 10, productId: 5 })).rejects.toThrow("Product not found or inactive");
  });

  it("admin can confirm product enrollment and issue $25 credit", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue({ id: 1, promoterId: 2, parentId: 10, productId: 5, message: null, sentAt: new Date() } as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
    vi.mocked(db.getUserById).mockResolvedValue({ id: 2, name: "Promoter", email: "promoter@test.com", role: "promoter", openId: "p2", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 5, name: "Math Tutoring", active: true, description: null, price: "120.00", category: "Math", createdAt: new Date() } as any);
    vi.mocked(db.getParentById).mockResolvedValue({ id: 10, promoterId: 2, name: "Jane Doe", email: "jane@test.com", phone: null, notes: null, createdAt: new Date() } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.confirmEnrollment({ promotionId: 1 });
    expect(result.success).toBe(true);
    expect(db.confirmProductEnrollment).toHaveBeenCalledWith({ promotionId: 1, promoterId: 2, parentId: 10, productId: 5 });
  });

  it("admin cannot confirm enrollment twice for the same promotion", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue({ id: 1, promoterId: 2, parentId: 10, productId: 5, message: null, sentAt: new Date() } as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue({ id: 1, status: "pending", creditAmount: "25.00" } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.productPromotions.confirmEnrollment({ promotionId: 1 })).rejects.toThrow("Already enrolled");
  });

  it("promoter cannot confirm product enrollment", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.productPromotions.confirmEnrollment({ promotionId: 1 })).rejects.toThrow("Admin access required");
  });

  it("admin can mark product enrollment credit as paid", async () => {
    vi.mocked(db.markProductEnrollmentPaid).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.markPaid({ enrollmentId: 1 });
    expect(result.success).toBe(true);
    expect(db.markProductEnrollmentPaid).toHaveBeenCalledWith(1);
  });
});
