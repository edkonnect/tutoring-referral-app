import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createPromoter: vi.fn().mockResolvedValue(undefined),
    getAllPromoters: vi.fn().mockResolvedValue([
      { id: 10, name: "Jane Doe", email: "jane@example.com", role: "promoter", openId: "jane-open-id", referralToken: null, createdAt: new Date() },
    ]),
    getUserById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 10) return { id: 10, name: "Jane Doe", email: "jane@example.com", role: "promoter", openId: "jane-open-id" };
      return undefined;
    }),
    createInvite: vi.fn().mockResolvedValue(undefined),
    getInviteByToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === "valid-token") {
        return { id: 1, userId: 10, token: "valid-token", expiresAt: new Date(Date.now() + 86400000), usedAt: null };
      }
      if (token === "used-token") {
        return { id: 2, userId: 10, token: "used-token", expiresAt: new Date(Date.now() + 86400000), usedAt: new Date() };
      }
      if (token === "expired-token") {
        return { id: 3, userId: 10, token: "expired-token", expiresAt: new Date(Date.now() - 86400000), usedAt: null };
      }
      return undefined;
    }),
    markInviteUsed: vi.fn().mockResolvedValue(undefined),
    createCredentials: vi.fn().mockResolvedValue(undefined),
    getCredentialsByEmail: vi.fn().mockImplementation(async (email: string) => {
      if (email === "taken@example.com") {
        return { id: 1, userId: 99, email: "taken@example.com", passwordHash: "hash" };
      }
      return undefined;
    }),
  };
});

// ─── Mock bcryptjs ────────────────────────────────────────────────────────────

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockImplementation(async (plain: string) => plain === "correct-password"),
  },
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn().mockImplementation(async (plain: string) => plain === "correct-password"),
}));

// ─── Mock sdk ────────────────────────────────────────────────────────────────

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

// ─── Mock email ───────────────────────────────────────────────────────────────

vi.mock("./_core/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeAdminCtx(): TrpcContext {
  const cookies: Record<string, string> = {};
  return {
    user: {
      id: 1, openId: "admin-open-id", name: "Admin", email: "admin@example.com",
      loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext & { cookies: Record<string, string> } {
  const cookies: Record<string, string> = {};
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { cookies[name] = value; },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    cookies,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("invite.resolve", () => {
  it("returns promoter name/email for a valid token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.resolve({ token: "valid-token" });
    expect(result.name).toBe("Jane Doe");
    expect(result.email).toBe("jane@example.com");
  });

  it("throws NOT_FOUND for an unknown token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.invite.resolve({ token: "unknown-token" })).rejects.toThrow("Invalid or expired invite link");
  });

  it("throws BAD_REQUEST for an already-used token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.invite.resolve({ token: "used-token" })).rejects.toThrow("already been used");
  });

  it("throws BAD_REQUEST for an expired token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.invite.resolve({ token: "expired-token" })).rejects.toThrow("expired");
  });
});

describe("invite.setupAccount", () => {
  it("creates credentials and sets session cookie for a valid token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.setupAccount({
      token: "valid-token",
      email: "jane@example.com",
      password: "securepassword123",
    });
    expect(result.success).toBe(true);
    expect(result.name).toBe("Jane Doe");
    // Session cookie is set (name comes from COOKIE_NAME constant)
    expect(Object.keys(ctx.cookies).length).toBeGreaterThan(0);
  });

  it("throws CONFLICT if email is already taken", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.invite.setupAccount({ token: "valid-token", email: "taken@example.com", password: "securepassword123" })
    ).rejects.toThrow("already in use");
  });

  it("throws BAD_REQUEST for a used token", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.invite.setupAccount({ token: "used-token", email: "jane@example.com", password: "securepassword123" })
    ).rejects.toThrow("already been used");
  });
});

describe("invite.login", () => {
  beforeEach(async () => {
    const db = await import("./db");
    vi.mocked(db.getCredentialsByEmail).mockImplementation(async (email: string) => {
      if (email === "jane@example.com") {
        return { id: 1, userId: 10, email: "jane@example.com", passwordHash: "hashed-password" };
      }
      return undefined;
    });
  });

  it("sets session cookie for valid credentials", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invite.login({ email: "jane@example.com", password: "correct-password" });
    expect(result.success).toBe(true);
    expect(result.role).toBe("promoter");
    // Session cookie is set (name comes from COOKIE_NAME constant)
    expect(Object.keys(ctx.cookies).length).toBeGreaterThan(0);
  });

  it("throws UNAUTHORIZED for wrong password", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.invite.login({ email: "jane@example.com", password: "wrong-password" })
    ).rejects.toThrow("Invalid email or password");
  });

  it("throws UNAUTHORIZED for unknown email", async () => {
    const ctx = makePublicCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.invite.login({ email: "nobody@example.com", password: "any-password" })
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("admin.createPromoter (invite flow)", () => {
  it("requires admin role", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 5, openId: "promoter-open-id", name: "Bob", email: "bob@example.com",
        loginMethod: "manus", role: "promoter", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.createPromoter({ name: "Test", email: "test@example.com", origin: "https://example.com" })
    ).rejects.toThrow("Admin access required");
  });

  it("creates promoter and sends invite email as admin", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.createPromoter({
      name: "Jane Doe",
      email: "jane@example.com",
      origin: "https://example.com",
    });
    expect(result.success).toBe(true);
  });
});
