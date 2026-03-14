import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
  getSetting: vi.fn().mockResolvedValue(50),
  getAllSettings: vi.fn().mockResolvedValue({ referralFee: "50.00", productReferralFee: "25.00" }),
  upsertSetting: vi.fn().mockResolvedValue(undefined),
  SETTING_KEYS: {
    referralFee: "referralFee",
    productReferralFee: "productReferralFee",
  },
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
    getProductWithTemplate: vi.fn().mockResolvedValue(null),
    getPromotionByEnrollmentToken: vi.fn(),
  };
});

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";
import * as emailModule from "./_core/email";

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

const mockParent = (id: number, promoterId: number, email?: string) => ({
  id, promoterId, name: `Parent ${id}`, email: email ?? `parent${id}@test.com`,
  phone: null, notes: null, createdAt: new Date(),
});

const mockProduct = (active = true) => ({
  id: 5, name: "Math Tutoring", active, description: "Expert-led math tutoring",
  price: "120.00", category: "Math", createdAt: new Date(), templateId: null,
});

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

describe("productPromotions router — send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProductWithTemplate).mockResolvedValue(null as any);
    vi.mocked(db.sendProductPromotion).mockResolvedValue({} as any);
  });

  it("promoter can send a promotion to a single parent", async () => {
    vi.mocked(db.getParentById).mockResolvedValue(mockParent(10, 2) as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.productPromotions.send({ parentIds: [10], productId: 5, message: "Check this out!" });
    expect(result.success).toBe(true);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(db.sendProductPromotion).toHaveBeenCalledWith(
      expect.objectContaining({ promoterId: 2, parentId: 10, productId: 5, message: "Check this out!", enrollmentToken: expect.any(String) })
    );
  });

  it("promoter can send a promotion to multiple parents", async () => {
    vi.mocked(db.getParentById)
      .mockResolvedValueOnce(mockParent(10, 2) as any)
      .mockResolvedValueOnce(mockParent(11, 2) as any)
      .mockResolvedValueOnce(mockParent(12, 2) as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.productPromotions.send({ parentIds: [10, 11, 12], productId: 5 });
    expect(result.success).toBe(true);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
    expect(db.sendProductPromotion).toHaveBeenCalledTimes(3);
  });

  it("generates a unique enrollment token per parent", async () => {
    vi.mocked(db.getParentById)
      .mockResolvedValueOnce(mockParent(10, 2) as any)
      .mockResolvedValueOnce(mockParent(11, 2) as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await caller.productPromotions.send({ parentIds: [10, 11], productId: 5 });

    const calls = vi.mocked(db.sendProductPromotion).mock.calls;
    const token1 = calls[0][0].enrollmentToken;
    const token2 = calls[1][0].enrollmentToken;
    expect(token1).toBeTruthy();
    expect(token2).toBeTruthy();
    expect(token1).not.toBe(token2);
  });

  it("sends one email per parent", async () => {
    vi.mocked(db.getParentById)
      .mockResolvedValueOnce(mockParent(10, 2, "parent10@test.com") as any)
      .mockResolvedValueOnce(mockParent(11, 2, "parent11@test.com") as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await caller.productPromotions.send({ parentIds: [10, 11], productId: 5 });

    expect(emailModule.sendEmail).toHaveBeenCalledTimes(2);
    const emailCalls = vi.mocked(emailModule.sendEmail).mock.calls.map((c) => c[0].to);
    expect(emailCalls).toContain("parent10@test.com");
    expect(emailCalls).toContain("parent11@test.com");
  });

  it("skips email for parents without an email address", async () => {
    const noEmailParent = (id: number, promoterId: number) => ({
      id, promoterId, name: `Parent ${id}`, email: null,
      phone: null, notes: null, createdAt: new Date(),
    });
    vi.mocked(db.getParentById)
      .mockResolvedValueOnce(noEmailParent(10, 2) as any)
      .mockResolvedValueOnce(noEmailParent(11, 2) as any);
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.productPromotions.send({ parentIds: [10, 11], productId: 5 });

    // Promotion records are still created, just no email
    expect(result.sent).toBe(2);
    expect(emailModule.sendEmail).not.toHaveBeenCalled();
  });

  it("partial failure: skips parents that don't belong to the promoter", async () => {
    vi.mocked(db.getParentById)
      .mockResolvedValueOnce(mockParent(10, 2) as any)   // belongs to promoter 2
      .mockResolvedValueOnce(mockParent(11, 99) as any);  // belongs to promoter 99
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    const result = await caller.productPromotions.send({ parentIds: [10, 11], productId: 5 });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results.find((r) => r.parentId === 11)?.error).toBe("Parent does not belong to you");
  });

  it("throws NOT_FOUND when product is inactive", async () => {
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct(false) as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await expect(
      caller.productPromotions.send({ parentIds: [10], productId: 5 })
    ).rejects.toThrow("Product not found or inactive");
  });

  it("rejects empty parentIds array", async () => {
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makePromoterCtx(2));
    await expect(
      caller.productPromotions.send({ parentIds: [], productId: 5 })
    ).rejects.toThrow();
  });

  it("admin can send promotion to any parent regardless of promoterId", async () => {
    vi.mocked(db.getParentById).mockResolvedValue(mockParent(10, 99) as any); // belongs to another promoter
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.send({ parentIds: [10], productId: 5 });
    expect(result.sent).toBe(1);
  });
});

describe("productPromotions router — enrollment management", () => {
  beforeEach(() => vi.clearAllMocks());

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
    expect(db.confirmProductEnrollment).toHaveBeenCalledWith({ promotionId: 1, promoterId: 2, parentId: 10, productId: 5, creditAmount: "50.00" });
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
