import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertVoucherSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes are handled in auth.ts: /api/register, /api/login, /api/logout, /api/user

  // Voucher routes
  app.get('/api/vouchers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const vouchers = await storage.getVouchersByUserId(userId);
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: "Failed to fetch vouchers" });
    }
  });

  app.get('/api/vouchers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const voucher = await storage.getVoucherById(id, userId);
      
      if (!voucher) {
        return res.status(404).json({ message: "Voucher not found" });
      }
      
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching voucher:", error);
      res.status(500).json({ message: "Failed to fetch voucher" });
    }
  });

  app.post('/api/vouchers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.department) {
        return res.status(400).json({ message: "User department not found. Please update your profile." });
      }

      const voucherData = insertVoucherSchema.parse({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });

      const voucher = await storage.createVoucher({
        ...voucherData,
        userId,
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

  app.patch('/api/vouchers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const voucherData = insertVoucherSchema.partial().parse({
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });

      const voucher = await storage.updateVoucher(id, voucherData, userId);
      
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

  app.delete('/api/vouchers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const success = await storage.deleteVoucher(id, userId);
      
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
  app.post('/api/vouchers/:voucherId/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voucherId } = req.params;
      
      // Verify voucher belongs to user
      const voucher = await storage.getVoucherById(voucherId, userId);
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
        voucherId,
        datetime: new Date(req.body.datetime),
      });

      console.log("Final expense data:", expenseData);

      const expense = await storage.createExpense(expenseData);
      
      // Update voucher total
      await storage.updateVoucherTotal(voucherId);
      
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

  app.patch('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const expenseData = insertExpenseSchema.partial().parse({
        ...req.body,
        datetime: req.body.datetime ? new Date(req.body.datetime) : undefined,
      });

      const expense = await storage.updateExpense(id, expenseData, userId);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Update voucher total
      await storage.updateVoucherTotal(expense.voucherId);
      
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

  app.delete('/api/expenses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Get expense first to know the voucher ID
      const expenses = await storage.getExpensesByVoucherId(''); // We need a different approach
      const expense = expenses.find(e => e.id === id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const success = await storage.deleteExpense(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Update voucher total
      await storage.updateVoucherTotal(expense.voucherId);
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}