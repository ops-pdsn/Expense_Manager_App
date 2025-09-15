import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabaseStorage } from "./supabaseStorage";
import { verifySupabaseToken } from "./supabaseAuth";
import { insertVoucherSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User profile endpoint
  app.get('/api/user/profile', verifySupabaseToken, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        department: user.department,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, department } = req.body;

      const updatedUser = await supabaseStorage.createOrUpdateUser({
        id: userId,
        email: req.user.email,
        first_name: firstName,
        last_name: lastName,
        department: department || req.user.department,
      });

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        department: updatedUser.department,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Voucher routes
  app.get('/api/vouchers', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const vouchers = await supabaseStorage.getVouchersByUserId(userId);
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: "Failed to fetch vouchers" });
    }
  });

  app.get('/api/vouchers/:id', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const voucher = await supabaseStorage.getVoucherById(id, userId);
      
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching voucher:", error);
      res.status(500).json({ message: "Failed to fetch voucher" });
    }
  });

  app.post('/api/vouchers', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await supabaseStorage.getUser(userId);
      
      if (!user || !user.department) {
        return res.status(400).json({ message: "User department not found. Please update your profile." });
      }

      const voucherData = insertVoucherSchema.parse({
        ...req.body,
        start_date: new Date(req.body.startDate),
        end_date: new Date(req.body.endDate),
      });

      const voucher = await supabaseStorage.createVoucher({
        ...voucherData,
        user_id: userId,
        department: user.department,
      });

      res.status(201).json(voucher);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating voucher:", error);
      res.status(500).json({ message: "Failed to create voucher" });
    }
  });

  app.patch('/api/vouchers/:id', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const voucherData = insertVoucherSchema.partial().parse({
        ...req.body,
        start_date: req.body.startDate ? new Date(req.body.startDate) : undefined,
        end_date: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });

      const voucher = await supabaseStorage.updateVoucher(id, voucherData, userId);
      
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      res.json(voucher);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating voucher:", error);
      res.status(500).json({ message: "Failed to update voucher" });
    }
  });

  app.delete('/api/vouchers/:id', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const success = await supabaseStorage.deleteVoucher(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      res.json({ message: "Voucher deleted successfully" });
    } catch (error) {
      console.error("Error deleting voucher:", error);
      res.status(500).json({ message: "Failed to delete voucher" });
    }
  });

  // Expense routes
  app.post('/api/vouchers/:voucherId/expenses', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voucherId } = req.params;
      
      // Verify voucher belongs to user
      const voucher = await supabaseStorage.getVoucherById(voucherId, userId);
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }

      // Only allow adding expenses to draft vouchers
      if (voucher.status !== 'draft') {
        return res.status(400).json({ message: "Cannot add expenses to a submitted voucher" });
      }

      console.log("Expense request body:", req.body);
      
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        voucher_id: voucherId,
        datetime: new Date(req.body.datetime),
      });

      console.log("Final expense data:", expenseData);

      const expense = await supabaseStorage.createExpense(expenseData);
      
      // Update voucher total
      await supabaseStorage.updateVoucherTotal(voucherId);
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch('/api/expenses/:id', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const expenseData = insertExpenseSchema.partial().parse({
        ...req.body,
        datetime: req.body.datetime ? new Date(req.body.datetime) : undefined,
      });

      const expense = await supabaseStorage.updateExpense(id, expenseData, userId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Update voucher total
      await supabaseStorage.updateVoucherTotal(expense.voucher_id);
      
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', verifySupabaseToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const success = await supabaseStorage.deleteExpense(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
