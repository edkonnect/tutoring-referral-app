import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
// NOTE: vi.mock is hoisted to the top of the file, so all data must be defined
// inside the factory function (no top-level variable references allowed).
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();

  const t1 = {
    id: 1,
    name: "Math Promo Template",
    subject: "{{promoterName}} recommends {{productName}}",
    htmlBody: "<html><body>Hello {{parentName}}</body></html>",
    textBody: "Hello {{parentName}}",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };
  const t2 = {
    id: 2,
    name: "Science Promo Template",
    subject: "Science offer from {{promoterName}}",
    htmlBody: "<html><body>Science for {{parentName}}</body></html>",
    textBody: null,
    createdAt: new Date("2025-01-02"),
    updatedAt: new Date("2025-01-02"),
  };

  return {
    ...actual,
    getAllPromoTemplates: vi.fn().mockResolvedValue([t1, t2]),
    getPromoTemplateById: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return t1;
      if (id === 2) return t2;
      return undefined;
    }),
    createPromoTemplate: vi.fn().mockResolvedValue(undefined),
    updatePromoTemplate: vi.fn().mockResolvedValue(undefined),
    deletePromoTemplate: vi.fn().mockResolvedValue(undefined),
    associateTemplateToProduct: vi.fn().mockResolvedValue(undefined),
    getProductWithTemplate: vi.fn().mockResolvedValue({
      id: 10,
      name: "Math Tutoring",
      description: "Advanced math",
      price: "120.00",
      category: "Math",
      active: true,
      templateId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      template: t1,
    }),
    // Also mock product helpers used by other procedures
    getAllProducts: vi.fn().mockResolvedValue([]),
    getProductById: vi.fn().mockResolvedValue(undefined),
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
  };
});

// ─── Context factories ────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-1",
      name: "Admin",
      email: "admin@test.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      referralToken: null,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makePromoterCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "promoter-1",
      name: "Promoter",
      email: "promoter@test.com",
      loginMethod: "email",
      role: "promoter",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      referralToken: "abc123",
    },
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

describe("promoTemplates.list", () => {
  it("allows admin to list all templates", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Math Promo Template");
  });

  it("rejects promoter from listing templates", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.promoTemplates.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated users from listing templates", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(caller.promoTemplates.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("promoTemplates.getById", () => {
  it("allows admin to get a template by id", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Math Promo Template");
    expect(result.subject).toContain("promoterName");
  });

  it("throws NOT_FOUND for non-existent template", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.promoTemplates.getById({ id: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects promoter from getting a template", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.promoTemplates.getById({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("promoTemplates.create", () => {
  it("allows admin to create a template", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.create({
      name: "New Template",
      subject: "Hello {{parentName}}",
      htmlBody: "<html><body>Hello {{parentName}}</body></html>",
      textBody: "Hello {{parentName}}",
    });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to create a template without textBody", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.create({
      name: "Minimal Template",
      subject: "Subject line",
      htmlBody: "<p>Body</p>",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.promoTemplates.create({ name: "", subject: "Subject", htmlBody: "<p>Body</p>" })
    ).rejects.toThrow();
  });

  it("rejects empty subject", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.promoTemplates.create({ name: "Name", subject: "", htmlBody: "<p>Body</p>" })
    ).rejects.toThrow();
  });

  it("rejects empty htmlBody", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.promoTemplates.create({ name: "Name", subject: "Subject", htmlBody: "" })
    ).rejects.toThrow();
  });

  it("rejects promoter from creating a template", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(
      caller.promoTemplates.create({ name: "Hack", subject: "Sub", htmlBody: "<p>x</p>" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("promoTemplates.update", () => {
  it("allows admin to update a template name", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.update({ id: 1, name: "Updated Name" });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to update all template fields", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.update({
      id: 1,
      name: "Updated",
      subject: "New Subject",
      htmlBody: "<p>New body</p>",
      textBody: "New text",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from updating a template", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(
      caller.promoTemplates.update({ id: 1, name: "Hack" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("promoTemplates.delete", () => {
  it("allows admin to delete a template", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from deleting a template", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(caller.promoTemplates.delete({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated users from deleting a template", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(caller.promoTemplates.delete({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("promoTemplates.associate", () => {
  it("allows admin to associate a template with a product", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.associate({ productId: 10, templateId: 1 });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to remove template association (set null)", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.associate({ productId: 10, templateId: null });
    expect(result).toEqual({ success: true });
  });

  it("rejects promoter from associating templates", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(
      caller.promoTemplates.associate({ productId: 10, templateId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("promoTemplates.getProductWithTemplate", () => {
  it("allows admin to get a product with its associated template", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.promoTemplates.getProductWithTemplate({ productId: 10 });
    expect(result).toBeDefined();
    expect(result?.id).toBe(10);
    expect(result?.templateId).toBe(1);
    expect(result?.template?.name).toBe("Math Promo Template");
  });

  it("rejects promoter from getting product with template", async () => {
    const caller = appRouter.createCaller(makePromoterCtx());
    await expect(
      caller.promoTemplates.getProductWithTemplate({ productId: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("products.update with templateId", () => {
  it("allows admin to set a templateId on a product", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 10, templateId: 1 });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to remove templateId from a product (set null)", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.products.update({ id: 10, templateId: null });
    expect(result).toEqual({ success: true });
  });
});
