import {
  users,
  vouchers,
  expenses,
  type User,
  type InsertUser,
  type Voucher,
  type InsertVoucher,
  type Expense,
  type InsertExpense,
  type VoucherWithExpenses,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum } from "drizzle-orm";

export interface IStorage {
  // User operations for email/password auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Voucher operations
  getVouchersByUserId(userId: string): Promise<VoucherWithExpenses[]>;
  getVoucherById(
    id: string,
    userId: string
  ): Promise<VoucherWithExpenses | undefined>;
  createVoucher(voucher: InsertVoucher & { userId: string }): Promise<Voucher>;
  updateVoucher(
    id: string,
    voucher: Partial<InsertVoucher>,
    userId: string
  ): Promise<Voucher | undefined>;
  deleteVoucher(id: string, userId: string): Promise<boolean>;

  // Expense operations
  getExpensesByVoucherId(voucherId: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(
    id: string,
    expense: Partial<InsertExpense>,
    userId: string
  ): Promise<Expense | undefined>;
  deleteExpense(id: string, userId: string): Promise<boolean>;

  // Utility operations
  updateVoucherTotal(voucherId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createOrUpdateUser(userData: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    department: string;
  }): Promise<User> {
    // Try to update first, then insert if not exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, userData.id));
    
    if (existingUser) {
      const [updatedUser] = await db
        .update(users)
        .set({
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          department: userData.department,
          updated_at: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updatedUser;
    } else {
      const [newUser] = await db.insert(users).values(userData).returning();
      return newUser;
    }
  }

  // Voucher operations
  async getVouchersByUserId(userId: string): Promise<VoucherWithExpenses[]> {
    const vouchersWithExpenses = await db
      .select({
        id: vouchers.id,
        userId: vouchers.user_id,
        name: vouchers.name,
        department: vouchers.department,
        description: vouchers.description,
        startDate: vouchers.start_date,
        endDate: vouchers.end_date,
        status: vouchers.status,
        totalAmount: vouchers.total_amount,
        createdAt: vouchers.created_at,
        updatedAt: vouchers.updated_at,
        expenses: expenses,
      })
      .from(vouchers)
      .leftJoin(expenses, eq(vouchers.id, expenses.voucher_id))
      .where(eq(vouchers.user_id, userId))
      .orderBy(desc(vouchers.created_at));

    // Group expenses by voucher
    const voucherMap = new Map<string, VoucherWithExpenses>();

    for (const row of vouchersWithExpenses) {
      if (!voucherMap.has(row.id)) {
        voucherMap.set(row.id, {
          id: row.id,
          userId: row.userId,
          name: row.name,
          department: row.department,
          description: row.description,
          startDate: row.startDate,
          endDate: row.endDate,
          status: row.status,
          totalAmount: row.totalAmount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          expenses: [],
          expenseCount: 0,
        });
      }

      if (row.expenses) {
        voucherMap.get(row.id)!.expenses.push(row.expenses);
      }
    }

    return Array.from(voucherMap.values()).map((voucher) => ({
      ...voucher,
      expenseCount: voucher.expenses.length,
    }));
  }

  async getVoucherById(
    id: string,
    userId: string
  ): Promise<VoucherWithExpenses | undefined> {
    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.userId, userId)));

    if (!voucher) return undefined;

    const voucherExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.voucherId, id))
      .orderBy(desc(expenses.datetime));

    return {
      ...voucher,
      expenses: voucherExpenses,
      expenseCount: voucherExpenses.length,
    };
  }

  async createVoucher(
    voucherData: InsertVoucher & { userId: string }
  ): Promise<Voucher> {
    const [voucher] = await db.insert(vouchers).values(voucherData).returning();
    return voucher;
  }

  async updateVoucher(
    id: string,
    voucherData: Partial<InsertVoucher>,
    userId: string
  ): Promise<Voucher | undefined> {
    const [voucher] = await db
      .update(vouchers)
      .set({ ...voucherData, updatedAt: new Date() })
      .where(and(eq(vouchers.id, id), eq(vouchers.userId, userId)))
      .returning();
    return voucher;
  }

  async deleteVoucher(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.userId, userId)))
      .returning({ id: vouchers.id });
    return (result.length ?? 0) > 0;
  }

  // Expense operations
  async getExpensesByVoucherId(voucherId: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.voucherId, voucherId))
      .orderBy(desc(expenses.datetime));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();

    // Update voucher total
    await this.updateVoucherTotal(expenseData.voucherId);

    return expense;
  }

  async updateExpense(
    id: string,
    expenseData: Partial<InsertExpense>,
    userId: string
  ): Promise<Expense | undefined> {
    // First verify the expense belongs to the user's voucher
    const [expense] = await db
      .select({ id: expenses.id, voucherId: expenses.voucherId })
      .from(expenses)
      .innerJoin(vouchers, eq(expenses.voucherId, vouchers.id))
      .where(and(eq(expenses.id, id), eq(vouchers.userId, userId)));

    if (!expense) return undefined;

    const [updatedExpense] = await db
      .update(expenses)
      .set(expenseData)
      .where(eq(expenses.id, id))
      .returning();

    // Update voucher total
    await this.updateVoucherTotal(expense.voucherId);

    return updatedExpense;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    // First get the voucher ID and verify ownership
    const [expense] = await db
      .select({ id: expenses.id, voucherId: expenses.voucherId })
      .from(expenses)
      .innerJoin(vouchers, eq(expenses.voucherId, vouchers.id))
      .where(and(eq(expenses.id, id), eq(vouchers.userId, userId)));

    if (!expense) return false;

    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });

    if ((result.length ?? 0) > 0) {
      // Update voucher total
      await this.updateVoucherTotal(expense.voucherId);
      return true;
    }

    return false;
  }

  // Utility operations
  async updateVoucherTotal(voucherId: string): Promise<void> {
    const [result] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(eq(expenses.voucherId, voucherId));

    const total = result?.total || "0";

    await db
      .update(vouchers)
      .set({ totalAmount: total, updatedAt: new Date() })
      .where(eq(vouchers.id, voucherId));
  }
}

export const storage = new DatabaseStorage();
