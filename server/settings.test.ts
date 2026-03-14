import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getAllSettings: vi.fn(),
  upsertSetting: vi.fn(),
  getSetting: vi.fn(),
  SETTING_KEYS: {
    referralFee: "referralFee",
    productReferralFee: "productReferralFee",
  },
  // Provide no-op stubs for everything else used by appRouter
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllPromoters: vi.fn().mockResolvedValue([]),
  getAllParents: vi.fn().mockResolvedValue([]),
  getAllStudents: vi.fn().mockResolvedValue([]),
  getAllReferrals: vi.fn().mockResolvedValue([]),
  getAllProducts: vi.fn().mockResolvedValue([]),
  getAllPromoTemplates: vi.fn().mockResolvedValue([]),
  getAllProductPromotions: vi.fn().mockResolvedValue([]),
  getAllProductEnrollments: vi.fn().mockResolvedValue([]),
  getAllPromoterVisitStats: vi.fn().mockResolvedValue([]),
  getPromoterEarningsSummary: vi.fn().mockResolvedValue({ total: 0, pending: 0, paid: 0, count: 0 }),
  getPromoterProductEarningsSummary: vi.fn().mockResolvedValue({ total: 0, pending: 0, paid: 0, count: 0 }),
  getUserById: vi.fn(),
  getParentById: vi.fn(),
  getStudentById: vi.fn(),
  getProductById: vi.fn(),
  getPromoTemplateById: vi.fn(),
  createPromoter: vi.fn(),
  updatePromoter: vi.fn(),
  deletePromoter: vi.fn(),
  createParent: vi.fn(),
  updateParent: vi.fn(),
  deleteParent: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  enrollStudent: vi.fn(),
  createReferral: vi.fn(),
  markReferralPaid: vi.fn(),
  getPendingReferrals: vi.fn().mockResolvedValue([]),
  getReferralsByPromoter: vi.fn().mockResolvedValue([]),
  getReferralByStudentId: vi.fn(),
  getPromoterReferralCount: vi.fn().mockResolvedValue(0),
  getUserByReferralToken: vi.fn(),
  setReferralToken: vi.fn(),
  logReferralVisit: vi.fn(),
  getReferralVisitStats: vi.fn().mockResolvedValue({ totalVisits: 0, uniqueDays: 0, recentVisits: [] }),
  getAllPromoterVisitStats: vi.fn().mockResolvedValue([]),
  createInvite: vi.fn(),
  getInviteByToken: vi.fn(),
  markInviteUsed: vi.fn(),
  createCredentials: vi.fn(),
  getCredentialsByEmail: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  sendProductPromotion: vi.fn(),
  getProductPromotionsByPromoter: vi.fn().mockResolvedValue([]),
  getProductPromotionById: vi.fn(),
  confirmProductEnrollment: vi.fn(),
  getProductEnrollmentsByPromoter: vi.fn().mockResolvedValue([]),
  getProductEnrollmentByPromotionId: vi.fn(),
  markProductEnrollmentPaid: vi.fn(),
  createPromoTemplate: vi.fn(),
  updatePromoTemplate: vi.fn(),
  deletePromoTemplate: vi.fn(),
  associateTemplateToProduct: vi.fn(),
  getProductWithTemplate: vi.fn(),
  getPromotionByEnrollmentToken: vi.fn(),
  getStudentsByParent: vi.fn().mockResolvedValue([]),
  getStudentsByPromoter: vi.fn().mockResolvedValue([]),
  getParentsByPromoter: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));
vi.mock("./_core/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./_core/sdk", () => ({ sdk: { auth: { getSession: vi.fn() } } }));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const adminCtx = {
  user: { id: 1, openId: "admin-1", role: "admin" as const, name: "Admin", email: "admin@test.com", loginMethod: "manus" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as never,
  res: {} as never,
};

const userCtx = {
  user: { id: 2, openId: "user-2", role: "user" as const, name: "User", email: "user@test.com", loginMethod: "manus" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as never,
  res: {} as never,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("admin.getSettings", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns all settings for admin", async () => {
    const { getAllSettings } = await import("./db");
    vi.mocked(getAllSettings).mockResolvedValue({ referralFee: "50.00", productReferralFee: "25.00" });

    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.admin.getSettings();
    expect(result).toEqual({ referralFee: "50.00", productReferralFee: "25.00" });
    expect(getAllSettings).toHaveBeenCalledOnce();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.admin.getSettings()).rejects.toThrow("Admin access required");
  });

  it("throws UNAUTHORIZED for unauthenticated requests", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.admin.getSettings()).rejects.toThrow();
  });
});

describe("admin.updateReferralFee", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates the referral fee for admin", async () => {
    const { upsertSetting } = await import("./db");
    vi.mocked(upsertSetting).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.admin.updateReferralFee({ fee: 75 });
    expect(result).toEqual({ success: true, fee: 75 });
    expect(upsertSetting).toHaveBeenCalledWith("referralFee", "75.00");
  });

  it("stores fee with 2 decimal places", async () => {
    const { upsertSetting } = await import("./db");
    vi.mocked(upsertSetting).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(adminCtx);
    await caller.admin.updateReferralFee({ fee: 42.5 });
    expect(upsertSetting).toHaveBeenCalledWith("referralFee", "42.50");
  });

  it("rejects zero or negative fees", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(caller.admin.updateReferralFee({ fee: 0 })).rejects.toThrow();
    await expect(caller.admin.updateReferralFee({ fee: -10 })).rejects.toThrow();
  });

  it("rejects fees above $10,000", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(caller.admin.updateReferralFee({ fee: 10001 })).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.admin.updateReferralFee({ fee: 50 })).rejects.toThrow("Admin access required");
  });
});

describe("admin.updateProductReferralFee", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates the product referral fee for admin", async () => {
    const { upsertSetting } = await import("./db");
    vi.mocked(upsertSetting).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(adminCtx);
    const result = await caller.admin.updateProductReferralFee({ fee: 30 });
    expect(result).toEqual({ success: true, fee: 30 });
    expect(upsertSetting).toHaveBeenCalledWith("productReferralFee", "30.00");
  });

  it("rejects zero or negative fees", async () => {
    const caller = appRouter.createCaller(adminCtx);
    await expect(caller.admin.updateProductReferralFee({ fee: 0 })).rejects.toThrow();
    await expect(caller.admin.updateProductReferralFee({ fee: -5 })).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(userCtx);
    await expect(caller.admin.updateProductReferralFee({ fee: 30 })).rejects.toThrow("Admin access required");
  });
});
