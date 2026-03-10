import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeCtx(role: "admin" | "user" | "promoter"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-openid`,
      email: `${role}@example.com`,
      name: `${role} User`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("admin.createPromoter", () => {
  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("promoter"));
    await expect(
      caller.admin.createPromoter({ name: "Test", email: "test@example.com" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.admin.createPromoter({ name: "Test", email: "test@example.com" })
    ).rejects.toThrow();
  });

  it("validates required name field", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.admin.createPromoter({ name: "", email: "test@example.com" })
    ).rejects.toThrow();
  });

  it("validates email format", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.admin.createPromoter({ name: "Test", email: "not-an-email" })
    ).rejects.toThrow();
  });
});

describe("admin.updatePromoter", () => {
  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.admin.updatePromoter({ id: 1, name: "Updated" })
    ).rejects.toThrow();
  });

  it("validates email format when provided", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.admin.updatePromoter({ id: 1, email: "bad-email" })
    ).rejects.toThrow();
  });

  it("accepts valid partial update (name only) without throwing on schema", async () => {
    // updatePromoter does a best-effort DB update (no NOT_FOUND guard),
    // so a valid payload should resolve successfully even for unknown IDs.
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.updatePromoter({ id: 99999, name: "New Name" });
    expect(result).toEqual({ success: true });
  });
});

describe("admin.deletePromoter", () => {
  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("promoter"));
    await expect(caller.admin.deletePromoter({ id: 1 })).rejects.toThrow();
  });

  it("requires a numeric id", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // @ts-expect-error intentional bad input
    await expect(caller.admin.deletePromoter({ id: "abc" })).rejects.toThrow();
  });
});

describe("admin.getPromoterById", () => {
  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("promoter"));
    await expect(caller.admin.getPromoterById({ id: 1 })).rejects.toThrow();
  });

  it("returns NOT_FOUND for unknown id", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(caller.admin.getPromoterById({ id: 99999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("admin.listPromoters", () => {
  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.admin.listPromoters()).rejects.toThrow();
  });

  it("returns an array for admin", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.admin.listPromoters();
    expect(Array.isArray(result)).toBe(true);
  });
});
