import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db ─────────────────────────────────────────────────────────────────

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
    getUserById: vi.fn(),
    getUserByReferralToken: vi.fn(),
    setReferralToken: vi.fn(),
  };
});

import * as db from "./db";

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@example.com",
      name: "Admin",
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

function makePromoterCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "promoter-openid",
      email: "promoter@example.com",
      name: "Promoter",
      loginMethod: "email",
      role: "promoter",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockPromoter = (id = 10) => ({
  id,
  openId: `promoter-${id}`,
  name: "Test Promoter",
  email: "promoter@test.com",
  role: "promoter" as const,
  loginMethod: "email" as const,
  referralToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("admin.setPromoterReferralToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows admin to set a custom referral token", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter(10) as any);
    vi.mocked(db.getUserByReferralToken).mockResolvedValue(null as any);
    vi.mocked(db.setReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.setPromoterReferralToken({
      promoterId: 10,
      token: "sarah-johnson",
    });

    expect(result.success).toBe(true);
    expect(result.token).toBe("sarah-johnson");
    expect(db.setReferralToken).toHaveBeenCalledWith(10, "sarah-johnson");
  });

  it("auto-generates a token when none is provided", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter(10) as any);
    vi.mocked(db.getUserByReferralToken).mockResolvedValue(null as any);
    vi.mocked(db.setReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.setPromoterReferralToken({ promoterId: 10 });

    expect(result.success).toBe(true);
    expect(result.token).toBeTruthy();
    expect(result.token.length).toBeGreaterThan(4);
    expect(db.setReferralToken).toHaveBeenCalledWith(10, result.token);
  });

  it("rejects a token already used by a different promoter", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(mockPromoter(10) as any);
    // Another promoter (id=99) already owns this token
    vi.mocked(db.getUserByReferralToken).mockResolvedValue({ ...mockPromoter(99), referralToken: "taken-token" } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "taken-token" })
    ).rejects.toThrow("already in use");
  });

  it("allows re-saving the same token for the same promoter", async () => {
    const promoterWithToken = { ...mockPromoter(10), referralToken: "my-token" };
    vi.mocked(db.getUserById).mockResolvedValue(promoterWithToken as any);
    // getUserByReferralToken returns the same promoter (id=10) — no conflict
    vi.mocked(db.getUserByReferralToken).mockResolvedValue(promoterWithToken as any);
    vi.mocked(db.setReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.setPromoterReferralToken({
      promoterId: 10,
      token: "my-token",
    });

    expect(result.success).toBe(true);
    expect(db.setReferralToken).toHaveBeenCalledWith(10, "my-token");
  });

  it("throws NOT_FOUND when promoter does not exist", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 999, token: "some-token" })
    ).rejects.toThrow("Promoter not found");
  });

  it("throws NOT_FOUND when the user is not a promoter (e.g. admin role)", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ ...mockPromoter(1), role: "admin" } as any);

    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 1, token: "some-token" })
    ).rejects.toThrow("Promoter not found");
  });

  it("validates token format — rejects special characters", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "bad token!" })
    ).rejects.toThrow();
  });

  it("validates token minimum length (< 4 chars)", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "ab" })
    ).rejects.toThrow();
  });

  it("validates token maximum length (> 32 chars)", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "a".repeat(33) })
    ).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "some-token" })
    ).rejects.toThrow("Admin access required");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.admin.setPromoterReferralToken({ promoterId: 10, token: "some-token" })
    ).rejects.toThrow();
  });
});
