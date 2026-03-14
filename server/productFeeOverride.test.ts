import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getSetting: vi.fn().mockResolvedValue(25), // global default = $25
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
    updateParent: vi.fn(),
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

const mockPromotion = (productId = 5) => ({
  id: 1, promoterId: 2, parentId: 10, productId, message: null, sentAt: new Date(),
});

const mockParent = () => ({
  id: 10, promoterId: 2, name: "Jane Doe", email: "jane@test.com",
  phone: null, notes: null, createdAt: new Date(),
});

const mockPromoter = () => ({
  id: 2, name: "Promoter", email: "promoter@test.com", role: "promoter",
  openId: "p2", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
});

// Product with no override — should use global fee
const mockProductNoOverride = () => ({
  id: 5, name: "Math Tutoring", active: true, description: null,
  price: "120.00", category: "Math", createdAt: new Date(), templateId: null,
  referralFeeOverride: null,
});

// Product with a custom override fee
const mockProductWithOverride = (fee: string) => ({
  id: 5, name: "Premium Tutoring", active: true, description: null,
  price: "200.00", category: "Premium", createdAt: new Date(), templateId: null,
  referralFeeOverride: fee,
});

describe("per-product referral fee override — confirmEnrollment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses global fee when product has no override", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue(mockPromotion() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.getProductById).mockResolvedValue(mockProductNoOverride() as any);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.confirmEnrollment({ promotionId: 1 });

    expect(result.success).toBe(true);
    // getSetting returns 25 (global default)
    expect(db.confirmProductEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ creditAmount: "25.00" })
    );
  });

  it("uses product override fee instead of global fee", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue(mockPromotion() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.getProductById).mockResolvedValue(mockProductWithOverride("75.00") as any);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.productPromotions.confirmEnrollment({ promotionId: 1 });

    expect(result.success).toBe(true);
    // Should use override $75, not global $25
    expect(db.confirmProductEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ creditAmount: "75.00" })
    );
  });

  it("uses override fee of $0 when explicitly set to zero", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue(mockPromotion() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.getProductById).mockResolvedValue(mockProductWithOverride("0.00") as any);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.productPromotions.confirmEnrollment({ promotionId: 1 });

    // $0 override is valid and should be used (not fall back to global)
    expect(db.confirmProductEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ creditAmount: "0.00" })
    );
  });

  it("uses a high override fee correctly", async () => {
    vi.mocked(db.getProductPromotionById).mockResolvedValue(mockPromotion() as any);
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.getProductById).mockResolvedValue(mockProductWithOverride("150.00") as any);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter() as any);
    vi.mocked(db.getParentById).mockResolvedValue(mockParent() as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await caller.productPromotions.confirmEnrollment({ promotionId: 1 });

    expect(db.confirmProductEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ creditAmount: "150.00" })
    );
  });
});

describe("per-product referral fee override — admin products CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin can create a product with referralFeeOverride", async () => {
    vi.mocked(db.createProduct).mockResolvedValue({} as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.create({
      name: "Premium Tutoring",
      price: "200.00",
      referralFeeOverride: "75.00",
    });
    expect(result.success).toBe(true);
    expect(db.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ referralFeeOverride: "75.00" })
    );
  });

  it("admin can create a product without referralFeeOverride (uses global default)", async () => {
    vi.mocked(db.createProduct).mockResolvedValue({} as any);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.create({ name: "Standard Tutoring" });
    expect(result.success).toBe(true);
    // referralFeeOverride should be null/undefined (not set)
    expect(db.createProduct).toHaveBeenCalledWith(
      expect.not.objectContaining({ referralFeeOverride: expect.any(String) })
    );
  });

  it("admin can update a product to set a referralFeeOverride", async () => {
    vi.mocked(db.updateProduct).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 5, referralFeeOverride: "60.00" });
    expect(result.success).toBe(true);
    expect(db.updateProduct).toHaveBeenCalledWith(5, expect.objectContaining({ referralFeeOverride: "60.00" }));
  });

  it("admin can clear a product's referralFeeOverride (set to null)", async () => {
    vi.mocked(db.updateProduct).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 5, referralFeeOverride: null });
    expect(result.success).toBe(true);
    expect(db.updateProduct).toHaveBeenCalledWith(5, expect.objectContaining({ referralFeeOverride: null }));
  });

  it("promoter cannot update a product's referralFeeOverride", async () => {
    const caller = appRouter.createCaller({
      user: { id: 2, openId: "p2", name: "Promoter", email: "p@test.com", role: "promoter", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    });
    await expect(caller.products.update({ id: 5, referralFeeOverride: "100.00" })).rejects.toThrow("Admin access required");
  });
});
