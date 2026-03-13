import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllProducts: vi.fn().mockResolvedValue([
      { id: 1, name: "Math Tutoring", description: "Advanced math", price: "120.00", category: "Math", active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "Science Lab", description: null, price: null, category: "Science", active: false, createdAt: new Date(), updatedAt: new Date() },
    ]),
    getProductById: vi.fn().mockResolvedValue({
      id: 1, name: "Math Tutoring", description: "Advanced math", price: "120.00", category: "Math", active: true, createdAt: new Date(), updatedAt: new Date(),
    }),
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Context factories ────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-1", name: "Admin", email: "admin@test.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), referralToken: null },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(): TrpcContext {
  return {
    user: { id: 2, openId: "promoter-1", name: "Promoter", email: "promoter@test.com", loginMethod: "email", role: "promoter", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), referralToken: "abc123" },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("products.listAll", () => {
  it("allows admin to list all products", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.listAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.listAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("products.list", () => {
  it("allows promoters to list active products", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.products.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(caller.products.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("products.create", () => {
  it("allows admin to create a product", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.create({ name: "New Course", category: "English" });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from creating a product", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.create({ name: "Hack" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects empty product name", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.products.create({ name: "" })).rejects.toThrow();
  });
});

describe("products.update", () => {
  it("allows admin to update a product", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 1, name: "Updated Math", active: false });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to toggle active status", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 1, active: true });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from updating a product", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.update({ id: 1, name: "Hack" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("products.delete", () => {
  it("allows admin to delete a product", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from deleting a product", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.products.delete({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("products.getById", () => {
  it("allows promoter to get a product by id", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    const result = await caller.products.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Math Tutoring");
  });
});
