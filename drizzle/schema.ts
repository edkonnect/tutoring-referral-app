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
  name: varchar("name", { length: 255 }).notNull(),
  age: int("age"),
  gradeLevel: varchar("gradeLevel", { length: 100 }),
  subjects: text("subjects"), // comma-separated list
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
