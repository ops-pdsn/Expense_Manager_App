import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for user authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User profiles table - extends Supabase auth.users
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // This will be the auth.users.id from Supabase
  email: varchar("email").notNull().unique(),
  first_name: varchar("first_name"),
  last_name: varchar("last_name"),
  department: varchar("department").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Vouchers table
export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  department: varchar("department").notNull(),
  description: text("description"),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  status: varchar("status", { enum: ["draft", "submitted"] }).notNull().default("draft"),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  voucher_id: varchar("voucher_id").notNull().references(() => vouchers.id, { onDelete: "cascade" }),
  description: varchar("description").notNull(),
  transport_type: varchar("transport_type", { 
    enum: ["bus", "train", "cab", "auto", "fuel", "flight", "parking", "other"] 
  }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  distance: integer("distance"), // for fuel calculations
  datetime: timestamp("datetime").notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vouchers: many(vouchers),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  user: one(users, { fields: [vouchers.user_id], references: [users.id] }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  voucher: one(vouchers, { fields: [expenses.voucher_id], references: [vouchers.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.string().min(1, "Department is required"),
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  user_id: true,
  total_amount: true,
  created_at: true,
  updated_at: true,
}).extend({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  created_at: true,
}).extend({
  datetime: z.coerce.date(),
  amount: z.coerce.string(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;
export type Voucher = typeof vouchers.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Extended types for UI
export type VoucherWithExpenses = Voucher & {
  expenses: Expense[];
  expenseCount: number;
  // Add camelCase aliases for backward compatibility
  userId: string;
  startDate: Date | null;
  endDate: Date | null;
  totalAmount: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Extended types for Expense with camelCase aliases
export type ExpenseWithAliases = Expense & {
  voucherId: string;
  transportType: string;
  createdAt: Date;
};

// Extended types for User with camelCase aliases
export type UserWithAliases = User & {
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
};
