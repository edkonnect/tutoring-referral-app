import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as dbModule from "./db";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
    getUserByReferralToken: vi.fn(),
    logReferralVisit: vi.fn(),
    getReferralVisitStats: vi.fn(),
    getAllPromoterVisitStats: vi.fn(),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makePublicCtx(userAgent = "Mozilla/5.0 TestAgent"): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "user-agent": userAgent },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(id = 10): TrpcContext {
  return {
    user: {
      id,
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

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin User",
      email: "admin@example.com",
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

const mockPromoter = {
  id: 10,
  openId: "promoter-open-id",
  name: "Alice Promoter",
  email: "alice@example.com",
  loginMethod: "manus",
  role: "promoter" as const,
  referralToken: "valid-token-123",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("referralLink.logVisit (public)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs a visit for a valid token and returns success", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue(mockPromoter);
    vi.mocked(dbModule.logReferralVisit).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.referralLink.logVisit({ token: "valid-token-123" });

    expect(result.success).toBe(true);
    expect(dbModule.logReferralVisit).toHaveBeenCalledWith(
      expect.objectContaining({ promoterId: 10 })
    );
  });

  it("captures user-agent from request headers", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue(mockPromoter);
    vi.mocked(dbModule.logReferralVisit).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx("Safari/537.36"));
    await caller.referralLink.logVisit({ token: "valid-token-123" });

    expect(dbModule.logReferralVisit).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: "Safari/537.36" })
    );
  });

  it("returns success:false (no error) for an invalid token", async () => {
    vi.mocked(dbModule.getUserByReferralToken).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.referralLink.logVisit({ token: "bad-token" });

    expect(result.success).toBe(false);
    expect(dbModule.logReferralVisit).not.toHaveBeenCalled();
  });
});

describe("referralLink.getVisitStats (promoter)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns visit stats for the logged-in promoter", async () => {
    vi.mocked(dbModule.getReferralVisitStats).mockResolvedValue({
      total: 42,
      thisWeek: 10,
      today: 3,
    });

    const caller = appRouter.createCaller(makePromoterCtx(10));
    const result = await caller.referralLink.getVisitStats();

    expect(result.total).toBe(42);
    expect(result.thisWeek).toBe(10);
    expect(result.today).toBe(3);
    expect(dbModule.getReferralVisitStats).toHaveBeenCalledWith(10);
  });

  it("returns zero stats when there are no visits", async () => {
    vi.mocked(dbModule.getReferralVisitStats).mockResolvedValue({
      total: 0,
      thisWeek: 0,
      today: 0,
    });

    const caller = appRouter.createCaller(makePromoterCtx(10));
    const result = await caller.referralLink.getVisitStats();

    expect(result.total).toBe(0);
    expect(result.thisWeek).toBe(0);
    expect(result.today).toBe(0);
  });
});

describe("referralLink.getAllVisitStats (admin)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns aggregated visit stats for all promoters", async () => {
    vi.mocked(dbModule.getAllPromoterVisitStats).mockResolvedValue([
      { promoterId: 10, total: 42 },
      { promoterId: 11, total: 7 },
    ]);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.referralLink.getAllVisitStats();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ promoterId: 10, total: 42 });
    expect(result[1]).toEqual({ promoterId: 11, total: 7 });
  });

  it("throws FORBIDDEN when called by a non-admin", async () => {
    const caller = appRouter.createCaller(makePromoterCtx(10));
    await expect(caller.referralLink.getAllVisitStats()).rejects.toThrow();
  });
});
