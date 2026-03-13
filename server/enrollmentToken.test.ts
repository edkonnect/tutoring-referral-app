import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();

  const mockPromotion = {
    id: 42,
    promoterId: 1,
    parentId: 10,
    productId: 5,
    message: "Check this out!",
    enrollmentToken: "test-token-abc123",
    sentAt: new Date("2025-06-01"),
    createdAt: new Date("2025-06-01"),
  };

  const mockProduct = {
    id: 5,
    name: "Math Tutoring",
    description: "Advanced math program",
    price: "120.00",
    category: "Math",
    active: true,
    templateId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParent = {
    id: 10,
    name: "Jane Doe",
    email: "jane@example.com",
    phone: null,
    promoterId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPromoter = {
    id: 1,
    name: "John Smith",
    email: "john@example.com",
    role: "user" as const,
    referralToken: "ref-token",
    inviteToken: null,
    inviteUsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...actual,
    // Promotion helpers
    sendProductPromotion: vi.fn().mockResolvedValue({ insertId: 42 }),
    getPromotionByEnrollmentToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === "test-token-abc123") return mockPromotion;
      return undefined;
    }),
    getProductPromotionById: vi.fn().mockResolvedValue(mockPromotion),
    getProductPromotionsByPromoter: vi.fn().mockResolvedValue([]),
    getAllProductPromotions: vi.fn().mockResolvedValue([]),

    // Product helpers
    getProductById: vi.fn().mockResolvedValue(mockProduct),
    getAllProducts: vi.fn().mockResolvedValue([mockProduct]),
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    getProductWithTemplate: vi.fn().mockResolvedValue({ ...mockProduct, template: null }),

    // Parent helpers
    getParentById: vi.fn().mockResolvedValue(mockParent),
    getParentsByPromoter: vi.fn().mockResolvedValue([mockParent]),
    updateParent: vi.fn().mockResolvedValue(undefined),
    createParent: vi.fn().mockResolvedValue(undefined),
    deleteParent: vi.fn().mockResolvedValue(undefined),
    getAllParents: vi.fn().mockResolvedValue([]),

    // User helpers
    getUserById: vi.fn().mockResolvedValue(mockPromoter),

    // Enrollment helpers
    getProductEnrollmentByPromotionId: vi.fn().mockResolvedValue(undefined), // no existing enrollment
    confirmProductEnrollment: vi.fn().mockResolvedValue(undefined),
    getProductEnrollmentsByPromoter: vi.fn().mockResolvedValue([]),
    getAllProductEnrollments: vi.fn().mockResolvedValue([]),
    markProductEnrollmentPaid: vi.fn().mockResolvedValue(undefined),
    getPromoterProductEarningsSummary: vi.fn().mockResolvedValue({ total: "0.00", paid: "0.00", pending: "0.00" }),

    // Promo template helpers
    getAllPromoTemplates: vi.fn().mockResolvedValue([]),
    getPromoTemplateById: vi.fn().mockResolvedValue(undefined),
    createPromoTemplate: vi.fn().mockResolvedValue(undefined),
    updatePromoTemplate: vi.fn().mockResolvedValue(undefined),
    deletePromoTemplate: vi.fn().mockResolvedValue(undefined),
    associateTemplateToProduct: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Mock email helper ────────────────────────────────────────────────────────
vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Shared contexts ──────────────────────────────────────────────────────────
const publicCtx: TrpcContext = { user: null, res: {} as any };
const promoterCtx: TrpcContext = {
  user: { id: 1, name: "John Smith", email: "john@example.com", role: "promoter" },
  res: {} as any,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("productPromotions.resolveEnrollmentToken (public)", () => {
  it("returns promotion details for a valid token", async () => {
    const caller = appRouter.createCaller(publicCtx);
    const result = await caller.productPromotions.resolveEnrollmentToken({ token: "test-token-abc123" });

    expect(result.promotionId).toBe(42);
    expect(result.alreadyEnrolled).toBe(false);
    expect(result.product?.name).toBe("Math Tutoring");
    expect(result.parent?.name).toBe("Jane Doe");
    expect(result.promoterName).toBe("John Smith");
  });

  it("throws NOT_FOUND for an invalid token", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.productPromotions.resolveEnrollmentToken({ token: "invalid-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns alreadyEnrolled=true when enrollment exists", async () => {
    const { getProductEnrollmentByPromotionId } = await import("./db");
    vi.mocked(getProductEnrollmentByPromotionId).mockResolvedValueOnce({
      id: 99,
      promotionId: 42,
      promoterId: 1,
      parentId: 10,
      productId: 5,
      creditAmount: "25.00",
      status: "pending",
      enrolledAt: new Date(),
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(publicCtx);
    const result = await caller.productPromotions.resolveEnrollmentToken({ token: "test-token-abc123" });
    expect(result.alreadyEnrolled).toBe(true);
  });

  it("does not expose sensitive promoter data (no email in response)", async () => {
    const caller = appRouter.createCaller(publicCtx);
    const result = await caller.productPromotions.resolveEnrollmentToken({ token: "test-token-abc123" });
    // promoterName is OK to expose, but the full promoter object should not be returned
    expect(result).not.toHaveProperty("promoter");
    expect(typeof result.promoterName).toBe("string");
  });
});

describe("productPromotions.selfEnroll (public)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset to default: no existing enrollment
    const db = await import("./db");
    vi.mocked(db.getPromotionByEnrollmentToken).mockImplementation(async (token: string) => {
      if (token === "test-token-abc123") return {
        id: 42, promoterId: 1, parentId: 10, productId: 5,
        message: null, enrollmentToken: "test-token-abc123",
        sentAt: new Date(), createdAt: new Date(),
      };
      return undefined;
    });
    vi.mocked(db.getProductEnrollmentByPromotionId).mockResolvedValue(undefined);
    vi.mocked(db.getProductById).mockResolvedValue({
      id: 5, name: "Math Tutoring", description: "Advanced math", price: "120.00",
      category: "Math", active: true, templateId: null, createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.getParentById).mockResolvedValue({
      id: 10, name: "Jane Doe", email: "jane@example.com", phone: null,
      promoterId: 1, createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 1, name: "John Smith", email: "john@example.com", role: "user" as const,
      referralToken: "ref-token", inviteToken: null, inviteUsed: false,
      createdAt: new Date(), updatedAt: new Date(),
    });
    vi.mocked(db.updateParent).mockResolvedValue(undefined);
    vi.mocked(db.confirmProductEnrollment).mockResolvedValue(undefined);
  });

  it("successfully enrolls a parent with valid token", async () => {
    const caller = appRouter.createCaller(publicCtx);
    const result = await caller.productPromotions.selfEnroll({
      token: "test-token-abc123",
      parentName: "Jane Doe",
      parentEmail: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("calls confirmProductEnrollment with correct data", async () => {
    const { confirmProductEnrollment } = await import("./db");
    const caller = appRouter.createCaller(publicCtx);
    await caller.productPromotions.selfEnroll({
      token: "test-token-abc123",
      parentName: "Jane Doe",
      parentEmail: "jane@example.com",
    });
    expect(vi.mocked(confirmProductEnrollment)).toHaveBeenCalledWith({
      promotionId: 42,
      promoterId: 1,
      parentId: 10,
      productId: 5,
    });
  });

  it("calls updateParent with the submitted name and email", async () => {
    const { updateParent } = await import("./db");
    const caller = appRouter.createCaller(publicCtx);
    await caller.productPromotions.selfEnroll({
      token: "test-token-abc123",
      parentName: "Updated Name",
      parentEmail: "updated@example.com",
    });
    expect(vi.mocked(updateParent)).toHaveBeenCalledWith(10, {
      name: "Updated Name",
      email: "updated@example.com",
    });
  });

  it("throws NOT_FOUND for an invalid token", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.productPromotions.selfEnroll({
        token: "invalid-token",
        parentName: "Jane",
        parentEmail: "jane@example.com",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws CONFLICT if already enrolled", async () => {
    const { getProductEnrollmentByPromotionId } = await import("./db");
    vi.mocked(getProductEnrollmentByPromotionId).mockResolvedValueOnce({
      id: 99, promotionId: 42, promoterId: 1, parentId: 10, productId: 5,
      creditAmount: "25.00", status: "pending",
      enrolledAt: new Date(), paidAt: null, createdAt: new Date(), updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.productPromotions.selfEnroll({
        token: "test-token-abc123",
        parentName: "Jane",
        parentEmail: "jane@example.com",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("validates parentName is non-empty", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.productPromotions.selfEnroll({
        token: "test-token-abc123",
        parentName: "",
        parentEmail: "jane@example.com",
      })
    ).rejects.toThrow();
  });

  it("validates parentEmail is a valid email", async () => {
    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.productPromotions.selfEnroll({
        token: "test-token-abc123",
        parentName: "Jane",
        parentEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

describe("productPromotions.send — enrollment token generation", () => {
  it("calls sendProductPromotion with an enrollmentToken field", async () => {
    const { sendProductPromotion } = await import("./db");
    const caller = appRouter.createCaller(promoterCtx);
    await caller.productPromotions.send({
      parentIds: [10],
      productId: 5,
      origin: "https://app.example.com",
    });
    expect(vi.mocked(sendProductPromotion)).toHaveBeenCalledWith(
      expect.objectContaining({ enrollmentToken: expect.any(String) })
    );
  });

  it("generates a non-empty enrollment token", async () => {
    const { sendProductPromotion } = await import("./db");
    const caller = appRouter.createCaller(promoterCtx);
    await caller.productPromotions.send({
      parentIds: [10],
      productId: 5,
      origin: "https://app.example.com",
    });
    const callArgs = vi.mocked(sendProductPromotion).mock.calls[0][0];
    expect(callArgs.enrollmentToken).toBeTruthy();
    expect(callArgs.enrollmentToken!.length).toBeGreaterThan(10);
  });
});
