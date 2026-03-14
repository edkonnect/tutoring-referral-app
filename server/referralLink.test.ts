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
    getUserById: vi.fn(),
    getUserByReferralToken: vi.fn(),
    setReferralToken: vi.fn(),
    createParent: vi.fn(),
  };
});

// ─── Mock nanoid ──────────────────────────────────────────────────────────────
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-token-abc123"),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────
function makePromoterCtx(): TrpcContext {
  return {
    user: {
      id: 10,
      openId: "promoter-open-id",
      name: "Alice Promoter",
      email: "alice@example.com",
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

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("referralLink.getMyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing token if promoter already has one", async () => {
    vi.mocked(dbModule.getUserById).mockResolvedValue({
      id: 10,
      openId: "promoter-open-id",
      name: "Alice Promoter",
      email: "alice@example.com",
      loginMethod: "manus",
      role: "promoter",
      referralToken: "existing-token-xyz",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.referralLink.getMyToken();

    expect(result.token).toBe("existing-token-xyz");
    expect(dbModule.setReferralToken).not.toHaveBeenCalled();
  });

  it("generates and stores a new token if promoter has none", async () => {
    vi.mocked(dbModule.getUserById).mockResolvedValue({
      id: 10,
      openId: "promoter-open-id",
      name: "Alice Promoter",
      email: "alice@example.com",
      loginMethod: "manus",
      role: "promoter",
      referralToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(dbModule.setReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.referralLink.getMyToken();

    expect(result.token).toBe("test-token-abc123");
    expect(dbModule.setReferralToken).toHaveBeenCalledWith(10, "test-token-abc123");
  });
});

describe("referralLink.regenerateToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbModule.setReferralToken).mockResolvedValue(undefined);
  });

  it("generates a new token and stores it", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.referralLink.regenerateToken();

    expect(result.token).toBe("test-token-abc123");
    expect(dbModule.setReferralToken).toHaveBeenCalledWith(10, "test-token-abc123");
  });
});

describe("referralLink.resolveToken (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns promoter info for a valid token", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue({
      id: 10,
      openId: "promoter-open-id",
      name: "Alice Promoter",
      email: "alice@example.com",
      loginMethod: "manus",
      role: "promoter",
      referralToken: "valid-token-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.referralLink.resolveToken({ token: "valid-token-123" });

    expect(result.promoterId).toBe(10);
    expect(result.promoterName).toBe("Alice Promoter");
  });

  it("throws NOT_FOUND for an invalid token", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.referralLink.resolveToken({ token: "bad-token" })
    ).rejects.toThrow();
  });
});

describe("referralLink.registerParent (public)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a parent linked to the promoter for a valid token", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue({
      id: 10,
      openId: "promoter-open-id",
      name: "Alice Promoter",
      email: "alice@example.com",
      loginMethod: "manus",
      role: "promoter",
      referralToken: "valid-token-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(dbModule.createParent).mockResolvedValue({} as never);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.referralLink.registerParent({
      token: "valid-token-123",
      name: "Bob Parent",
      email: "bob@example.com",
      phone: "555-1234",
    });

    expect(result.success).toBe(true);
    expect(result.promoterName).toBe("Alice Promoter");
    expect(dbModule.createParent).toHaveBeenCalledWith(
      expect.objectContaining({
        promoterId: 10,
        name: "Bob Parent",
        email: "bob@example.com",
        phone: "555-1234",
      })
    );
  });

  it("throws NOT_FOUND when registering with an invalid token", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.referralLink.registerParent({
        token: "bad-token",
        name: "Bob Parent",
        email: "bob@example.com",
      })
    ).rejects.toThrow();
  });

  it("rejects registration with an invalid email", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.referralLink.registerParent({
        token: "valid-token-123",
        name: "Bob Parent",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });
});
