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
    createParent: vi.fn(),
    createStudent: vi.fn(),
    getParentById: vi.fn(),
    getParentsByPromoter: vi.fn(),
    deleteParent: vi.fn(),
    updateParent: vi.fn(),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makePromoterCtx(id = 5): TrpcContext {
  return {
    user: {
      id,
      openId: "promoter-open-id",
      name: "Bob Promoter",
      email: "bob@example.com",
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("parents.create (promoter)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a parent with required fields only", async () => {
    vi.mocked(dbModule.createParent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePromoterCtx(5));
    const result = await caller.parents.create({
      name: "Jane Smith",
      email: "jane@example.com",
    });

    expect(result.success).toBe(true);
    expect(dbModule.createParent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Smith",
        email: "jane@example.com",
        promoterId: 5,
      })
    );
  });

  it("creates a parent with all optional fields", async () => {
    vi.mocked(dbModule.createParent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePromoterCtx(5));
    const result = await caller.parents.create({
      name: "John Doe",
      email: "john@example.com",
      phone: "+1 555 000 1234",
      notes: "Interested in math tutoring",
    });

    expect(result.success).toBe(true);
    expect(dbModule.createParent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "John Doe",
        email: "john@example.com",
        phone: "+1 555 000 1234",
        notes: "Interested in math tutoring",
        promoterId: 5,
      })
    );
  });

  it("rejects an invalid email address", async () => {
    const caller = appRouter.createCaller(makePromoterCtx(5));
    await expect(
      caller.parents.create({ name: "Bad Email", email: "not-an-email" })
    ).rejects.toThrow();
    expect(dbModule.createParent).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const caller = appRouter.createCaller(makePromoterCtx(5));
    await expect(
      caller.parents.create({ name: "", email: "valid@example.com" })
    ).rejects.toThrow();
    expect(dbModule.createParent).not.toHaveBeenCalled();
  });

  it("throws UNAUTHORIZED when called without a session", async () => {
    const publicCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(publicCtx);
    await expect(
      caller.parents.create({ name: "Ghost", email: "ghost@example.com" })
    ).rejects.toThrow();
  });
});

describe("parents.delete (promoter)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a promoter to delete their own parent", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue({
      id: 10,
      name: "Jane",
      email: "jane@example.com",
      phone: null,
      notes: null,
      promoterId: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(dbModule.deleteParent).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makePromoterCtx(5));
    const result = await caller.parents.delete({ id: 10 });

    expect(result.success).toBe(true);
    expect(dbModule.deleteParent).toHaveBeenCalledWith(10);
  });

  it("forbids a promoter from deleting another promoter's parent", async () => {
    vi.mocked(dbModule.getParentById).mockResolvedValue({
      id: 20,
      name: "Other Parent",
      email: "other@example.com",
      phone: null,
      notes: null,
      promoterId: 99, // belongs to a different promoter
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makePromoterCtx(5));
    await expect(caller.parents.delete({ id: 20 })).rejects.toThrow();
    expect(dbModule.deleteParent).not.toHaveBeenCalled();
  });
});
