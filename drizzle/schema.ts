import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "promoter"]).default("promoter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  referralToken: varchar("referralToken", { length: 32 }).unique(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Parents referred by promoters
export const parents = mysqlTable("parents", {
  id: int("id").autoincrement().primaryKey(),
  promoterId: int("promoterId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Parent = typeof parents.$inferSelect;
export type InsertParent = typeof parents.$inferInsert;

// Students belonging to parents
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),   // first name
  lastName: varchar("lastName", { length: 255 }),     // last name (added for enrollment form)
  age: int("age"),
  gradeLevel: varchar("gradeLevel", { length: 100 }),
  subjects: text("subjects"), // comma-separated list
  educationGoals: text("educationGoals"),              // parent-provided education goals
  enrolled: boolean("enrolled").default(false).notNull(),
  enrolledAt: timestamp("enrolledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// Referral credits: one record per enrolled student
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  promoterId: int("promoterId").notNull(),
  parentId: int("parentId").notNull(),
  studentId: int("studentId").notNull(),
  creditAmount: decimal("creditAmount", { precision: 10, scale: 2 }).default("50.00").notNull(),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// Visit log: one record per page load of /refer/:token
export const referralLinkVisits = mysqlTable("referral_link_visits", {
  id: int("id").autoincrement().primaryKey(),
  promoterId: int("promoterId").notNull(),
  visitedAt: timestamp("visitedAt").defaultNow().notNull(),
  userAgent: varchar("userAgent", { length: 512 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
});

export type ReferralLinkVisit = typeof referralLinkVisits.$inferSelect;
export type InsertReferralLinkVisit = typeof referralLinkVisits.$inferInsert;

// Invite tokens sent to new promoters so they can set up their account
export const promoterInvites = mysqlTable("promoter_invites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),          // references users.id
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromoterInvite = typeof promoterInvites.$inferSelect;
export type InsertPromoterInvite = typeof promoterInvites.$inferInsert;

// Email + hashed password for promoters who log in with credentials
export const promoterCredentials = mysqlTable("promoter_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // references users.id
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromoterCredential = typeof promoterCredentials.$inferSelect;
export type InsertPromoterCredential = typeof promoterCredentials.$inferInsert;

// Promotional email templates created by admin and associated with products
export const promoTemplates = mysqlTable("promo_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  textBody: text("textBody"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromoTemplate = typeof promoTemplates.$inferSelect;
export type InsertPromoTemplate = typeof promoTemplates.$inferInsert;

// Products that promoters can promote to parents
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  category: varchar("category", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  templateId: int("templateId"),  // FK to promo_templates.id (nullable)
  referralFeeOverride: decimal("referralFeeOverride", { precision: 10, scale: 2 }),  // nullable; overrides global productReferralFee when set
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Records of a promoter sending a product promotion to a parent
export const productPromotions = mysqlTable("product_promotions", {
  id: int("id").autoincrement().primaryKey(),
  promoterId: int("promoterId").notNull(),   // references users.id
  parentId: int("parentId").notNull(),       // references parents.id
  productId: int("productId").notNull(),     // references products.id
  message: text("message"),                  // optional personal message
  enrollmentToken: varchar("enrollmentToken", { length: 64 }).unique(), // unique token for parent self-enrollment link
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductPromotion = typeof productPromotions.$inferSelect;
export type InsertProductPromotion = typeof productPromotions.$inferInsert;

// When a parent enrolls in a promoted product — triggers $25 credit
export const productEnrollments = mysqlTable("product_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  promotionId: int("promotionId").notNull(), // references product_promotions.id
  promoterId: int("promoterId").notNull(),   // denormalized for easy querying
  parentId: int("parentId").notNull(),
  productId: int("productId").notNull(),
  creditAmount: decimal("creditAmount", { precision: 10, scale: 2 }).default("25.00").notNull(),
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductEnrollment = typeof productEnrollments.$inferSelect;
export type InsertProductEnrollment = typeof productEnrollments.$inferInsert;

// ─── App Settings ─────────────────────────────────────────────────────────────
// Key-value store for admin-configurable settings.
// Known keys:
//   referralFee        – credit (USD) issued per enrolled student via referral link
//   productReferralFee – credit (USD) issued per enrolled parent via product promotion
export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;
