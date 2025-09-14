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

export interface ISupabaseStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createOrUpdateUser(userData: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    department: string;
  }): Promise<User>;

  // Voucher operations
  getVouchersByUserId(userId: string): Promise<VoucherWithExpenses[]>;
  getVoucherById(
    id: string,
    userId: string
  ): Promise<VoucherWithExpenses | undefined>;
  createVoucher(voucher: InsertVoucher & { user_id: string }): Promise<Voucher>;
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

export class SupabaseStorage implements ISupabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
        user_id: vouchers.user_id,
        name: vouchers.name,
        department: vouchers.department,
        description: vouchers.description,
        start_date: vouchers.start_date,
        end_date: vouchers.end_date,
        status: vouchers.status,
        total_amount: vouchers.total_amount,
        created_at: vouchers.created_at,
        updated_at: vouchers.updated_at,
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
          user_id: row.user_id,
          name: row.name,
          department: row.department,
          description: row.description,
          start_date: row.start_date,
          end_date: row.end_date,
          status: row.status,
          total_amount: row.total_amount,
          created_at: row.created_at,
          updated_at: row.updated_at,
          // Add camelCase aliases for backward compatibility
          userId: row.user_id,
          startDate: row.start_date,
          endDate: row.end_date,
          totalAmount: row.total_amount,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          expenses: [],
          expenseCount: 0,
        });
      }

      if (row.expenses) {
        const expenseWithAliases = {
          ...row.expenses,
          voucherId: row.expenses.voucher_id,
          transportType: row.expenses.transport_type,
          createdAt: row.expenses.created_at,
        };
        voucherMap.get(row.id)!.expenses.push(expenseWithAliases as any);
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
      .where(and(eq(vouchers.id, id), eq(vouchers.user_id, userId)));

    if (!voucher) return undefined;

    const voucherExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.voucher_id, id))
      .orderBy(desc(expenses.datetime));

    const expensesWithAliases = voucherExpenses.map(expense => ({
      ...expense,
      voucherId: expense.voucher_id,
      transportType: expense.transport_type,
      createdAt: expense.created_at,
    }));

    return {
      ...voucher,
      // Add camelCase aliases for backward compatibility
      userId: voucher.user_id,
      startDate: voucher.start_date,
      endDate: voucher.end_date,
      totalAmount: voucher.total_amount,
      createdAt: voucher.created_at,
      updatedAt: voucher.updated_at,
      expenses: expensesWithAliases as any,
      expenseCount: expensesWithAliases.length,
    };
  }

  async createVoucher(
    voucherData: InsertVoucher & { user_id: string }
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
      .set({ ...voucherData, updated_at: new Date() })
      .where(and(eq(vouchers.id, id), eq(vouchers.user_id, userId)))
      .returning();
    return voucher;
  }

  async deleteVoucher(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.user_id, userId)))
      .returning({ id: vouchers.id });
    return (result.length ?? 0) > 0;
  }

  // Expense operations
  async getExpensesByVoucherId(voucherId: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.voucher_id, voucherId))
      .orderBy(desc(expenses.datetime));
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();

    // Update voucher total
    await this.updateVoucherTotal(expenseData.voucher_id);

    return expense;
  }

  async updateExpense(
    id: string,
    expenseData: Partial<InsertExpense>,
    userId: string
  ): Promise<Expense | undefined> {
    // First verify the expense belongs to the user's voucher
    const [expense] = await db
      .select({ id: expenses.id, voucher_id: expenses.voucher_id })
      .from(expenses)
      .innerJoin(vouchers, eq(expenses.voucher_id, vouchers.id))
      .where(and(eq(expenses.id, id), eq(vouchers.user_id, userId)));

    if (!expense) return undefined;

    const [updatedExpense] = await db
      .update(expenses)
      .set(expenseData)
      .where(eq(expenses.id, id))
      .returning();

    // Update voucher total
    await this.updateVoucherTotal(expense.voucher_id);

    return updatedExpense;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    // First get the voucher ID and verify ownership
    const [expense] = await db
      .select({ id: expenses.id, voucher_id: expenses.voucher_id })
      .from(expenses)
      .innerJoin(vouchers, eq(expenses.voucher_id, vouchers.id))
      .where(and(eq(expenses.id, id), eq(vouchers.user_id, userId)));

    if (!expense) return false;

    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });

    if ((result.length ?? 0) > 0) {
      // Update voucher total
      await this.updateVoucherTotal(expense.voucher_id);
      return true;
    }

    return false;
  }

  // Utility operations
  async updateVoucherTotal(voucherId: string): Promise<void> {
    const [result] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(eq(expenses.voucher_id, voucherId));

    const total = result?.total || "0";

    await db
      .update(vouchers)
      .set({ total_amount: total, updated_at: new Date() })
      .where(eq(vouchers.id, voucherId));
  }
}

export const supabaseStorage = new SupabaseStorage();
