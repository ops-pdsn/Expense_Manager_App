import type express from "express";
import { createClient } from "@supabase/supabase-js";
import { verifySupabaseToken } from "./auth.js";

// Do not use path aliases in serverless runtime
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function registerRoutes(app: express.Express) {
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });


// Add this temporary debug endpoint
  app.get("/api/debug/env", (_req, res) => {
    res.json({
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_URL_VALUE: process.env.SUPABASE_URL?.substring(0, 20) + "...",
      SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SERVICE_ROLE_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
    });
  });

  // Environment configuration check
  app.get("/api/health/config", (_req, res) => {
    res.json({
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE: !!SERVICE_ROLE,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      timestamp: new Date().toISOString(),
    });
  });

  // Database health check
  app.get("/api/health/db", async (_req, res) => {
    try {
      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.json({
          ok: false,
          error: "Missing Supabase configuration",
          SUPABASE_URL: !!SUPABASE_URL,
          SERVICE_ROLE: !!SERVICE_ROLE,
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // Test database connection by querying a simple table
      const { data, error } = await admin
        .from("users")
        .select("count")
        .limit(1);

      if (error) {
        console.error("Database health check error:", error);
        return res.json({
          ok: false,
          error: "Database connection failed",
          details: error.message,
          code: error.code,
        });
      }

      res.json({
        ok: true,
        message: "Database connection successful",
        tables: ["users", "vouchers", "expenses"],
      });
    } catch (e) {
      console.error("Database health check error:", e);
      res.json({
        ok: false,
        error: "Database health check failed",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  });

  app.get("/api/user/profile", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware

      // If service role not provided, return auth-only payload so UI can render
      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.json({
          id: authUser.id,
          email: authUser.email,
          firstName: null,
          lastName: null,
          department: null,
          source: "auth-only",
          note: "SUPABASE_SERVICE_ROLE_KEY not set",
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // First, try to get existing user
      let { data, error } = await admin
        .from("users")
        .select("first_name, last_name, department")
        .eq("id", authUser.id)
        .maybeSingle();

      // If user doesn't exist, create them with default values
      if (error || !data) {
        console.log(
          "User not found in users table, creating new user:",
          authUser.id
        );
        console.log("Query error:", error);

        const { error: insertError } = await admin.from("users").insert({
          id: authUser.id,
          email: authUser.email,
          first_name: null,
          last_name: null,
          department: "Operations", // Default department
        });

        if (insertError) {
          console.error("/api/user/profile insert error", insertError);
          return res
            .status(500)
            .json({ error: "Failed to create user profile" });
        }

        console.log("User created successfully with department: Operations");

        // Return the newly created user data
        return res.json({
          id: authUser.id,
          email: authUser.email,
          firstName: null,
          lastName: null,
          department: "Operations",
          source: "db-created",
        });
      }

      console.log("Existing user data:", data);
      console.log("User department:", data?.department);

      return res.json({
        id: authUser.id,
        email: authUser.email,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        department: data?.department ?? "Operations", // Ensure never null
        source: "db",
      });
    } catch (e) {
      console.error("/api/user/profile handler error", e);
      res.status(500).json({ error: "Profile handler error" });
    }
  });

  // Update user profile endpoint
  app.patch("/api/user/profile", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { firstName, lastName, department } = req.body;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: "Service not configured" });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // Upsert user profile
      const { data, error } = await admin
        .from("users")
        .upsert({
          id: authUser.id,
          email: authUser.email,
          first_name: firstName || null,
          last_name: lastName || null,
          department: department || "Operations",
        })
        .select()
        .single();

      if (error) {
        console.error("/api/user/profile PATCH error", error);
        return res.status(500).json({ error: "Failed to update user profile" });
      }

      return res.json({
        id: authUser.id,
        email: authUser.email,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        department: data?.department || "Operations",
        source: "db-updated",
      });
    } catch (e) {
      console.error("/api/user/profile PATCH handler error", e);
      res.status(500).json({ error: "Profile update error" });
    }
  });

  // ...existing code...
  // Vouchers endpoints
  app.get("/api/vouchers", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      console.log("GET /api/vouchers - User:", authUser.id, "Email:", authUser.email);

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database configuration missing",
          details: "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // First, get vouchers without relationships to debug
      const { data, error } = await admin
        .from("vouchers")
        .select("id,user_id,name,department,description,start_date,end_date,status,total_amount,created_at,updated_at")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("/api/vouchers query error", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return res
          .status(error.code === "42501" ? 403 : 500)
          .json({ error: "Vouchers query failed", details: error.message, code: error.code });
      }

      // Get expenses for all vouchers
      let expensesData = [];
      if (data && data.length > 0) {
        const voucherIds = data.map(v => v.id);
        const { data: expenses, error: expensesError } = await admin
          .from("expenses")
          .select("id,voucher_id,description,transport_type,amount,distance,datetime,notes,created_at")
          .in("voucher_id", voucherIds)
          .order("datetime", { ascending: false });

        if (expensesError) {
          console.error("Error fetching expenses:", expensesError);
          // Continue without expenses rather than failing completely
          expensesData = [];
        } else {
          expensesData = expenses || [];
        }
      }

      // Group expenses by voucher_id
      const expensesByVoucher = expensesData.reduce((acc, expense) => {
        if (!acc[expense.voucher_id]) {
          acc[expense.voucher_id] = [];
        }
        acc[expense.voucher_id].push(expense);
        return acc;
      }, {});

      // Transform data to include proper expenses and expense count
      const transformed =
        (data ?? []).map((v) => ({
          ...v,
          userId: v.user_id,
          startDate: v.start_date,
          endDate: v.end_date,
          totalAmount: v.total_amount,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
          expenses: expensesByVoucher[v.id] || [],
          expenseCount: expensesByVoucher[v.id] ? expensesByVoucher[v.id].length : 0,
        })) || [];

      return res
        .status(200)
        .set("Cache-Control", "no-store")
        .json({ data: transformed });
    } catch (e) {
      console.error("/api/vouchers handler error", e);
      return res.status(500).json({
        error: "Vouchers handler error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  });
// ...existing code...

  app.post("/api/vouchers", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { name, department, description, start_date, end_date } = req.body;
      console.log("POST /api/vouchers - User:", authUser.id, "Data:", {
        name,
        department,
        description,
        start_date,
        end_date,
      });

      // Validate required fields
      if (!name || !department || !start_date || !end_date) {
        console.error("Missing required fields:", {
          name,
          department,
          start_date,
          end_date,
        });
        return res.status(400).json({
          error: "Missing required fields",
          message: "Name, department, start_date, and end_date are required",
          received: { name, department, start_date, end_date },
        });
      }

      // Validate date format
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Invalid date format:", { start_date, end_date });
        return res.status(400).json({
          error: "Invalid date format",
          message: "start_date and end_date must be valid dates",
          received: { start_date, end_date },
        });
      }

      if (startDate >= endDate) {
        console.error("Invalid date range:", { start_date, end_date });
        return res.status(400).json({
          error: "Invalid date range",
          message: "start_date must be before end_date",
          received: { start_date, end_date },
        });
      }

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        console.log(
          "Missing Supabase configuration - SUPABASE_URL:",
          !!SUPABASE_URL,
          "SERVICE_ROLE:",
          !!SERVICE_ROLE
        );
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database configuration missing",
          details:
            "Please check environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });
      console.log("Supabase admin client created");

      // First check if vouchers table exists by trying a simple query
      const { data: tableCheck, error: tableError } = await admin
        .from("vouchers")
        .select("id")
        .limit(1);

      if (tableError) {
        console.error("Vouchers table check failed:", tableError);
        if (
          tableError.code === "PGRST116" ||
          tableError.message?.includes('relation "vouchers" does not exist')
        ) {
          console.log("Vouchers table does not exist, cannot create voucher");
          return res.status(503).json({
            error: "Database table not found",
            message: "Vouchers table does not exist",
            details:
              "Please run the database setup script to create the required tables",
            code: tableError.code,
          });
        }
        return res.status(500).json({
          error: "Database table check failed",
          details: tableError.message,
          code: tableError.code,
        });
      }

      console.log("Vouchers table exists, proceeding with insert");

      const insertData = {
        user_id: authUser.id,
        name,
        department,
        description: description || null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "draft",
        total_amount: "0",
      };

      console.log("Inserting voucher with data:", insertData);

      const { data, error } = await admin
        .from("vouchers")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("/api/vouchers POST error", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return res.status(500).json({
          error: "Failed to create voucher",
          details: error.message,
          code: error.code,
        });
      }

      console.log("Voucher created successfully:", data);

      // Transform the data to match the expected format (same as GET endpoint)
      const transformedVoucher = {
        ...data,
        userId: data.user_id,
        startDate: data.start_date,
        endDate: data.end_date,
        totalAmount: data.total_amount,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        expenses: [],
        expenseCount: 0,
      };

      console.log("Transformed voucher being returned:", transformedVoucher);
      return res.json(transformedVoucher);
    } catch (e) {
      console.error("/api/vouchers POST handler error", e);
      console.error(
        "Error stack:",
        e instanceof Error ? e.stack : "No stack trace"
      );
      res.status(500).json({
        error: "Voucher creation error",
        message: e instanceof Error ? e.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development"
            ? e instanceof Error
              ? e.stack
              : undefined
            : undefined,
      });
    }
  });

  // Update voucher endpoint (for status changes, etc.)
  app.patch("/api/vouchers/:id", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { id } = req.params;
      const updateData = req.body;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database configuration missing",
          details: "Please check environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // Update the voucher (with user ownership check)
      const { data, error } = await admin
        .from("vouchers")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", authUser.id)
        .select()
        .single();

      if (error) {
        console.error("/api/vouchers PATCH error", error);
        return res.status(500).json({ error: "Failed to update voucher" });
      }

      if (!data) {
        return res.status(404).json({ error: "Voucher not found or not authorized" });
      }

      return res.json(data);
    } catch (e) {
      console.error("/api/vouchers PATCH handler error", e);
      res.status(500).json({ error: "Voucher update error" });
    }
  });

  app.delete("/api/vouchers/:id", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { id } = req.params;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: "Service not configured" });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // First verify the voucher belongs to the user
      const { data: voucher, error: fetchError } = await admin
        .from("vouchers")
        .select("id")
        .eq("id", id)
        .eq("user_id", authUser.id)
        .single();

      if (fetchError || !voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }

      const { error } = await admin
        .from("vouchers")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);

      if (error) {
        console.error("/api/vouchers DELETE error", error);
        return res.status(500).json({ error: "Failed to delete voucher" });
      }

      return res.json({ success: true });
    } catch (e) {
      console.error("/api/vouchers DELETE handler error", e);
      res.status(500).json({ error: "Voucher deletion error" });
    }
  });

  app.post(
    "/api/vouchers/:id/expenses",
    verifySupabaseToken,
    async (req, res) => {
      try {
        const authUser = req.user!; // set by middleware
        const { id: voucherId } = req.params;
        const {
          description,
          transport_type,
          amount,
          distance,
          datetime,
          notes,
        } = req.body;

        if (!SUPABASE_URL || !SERVICE_ROLE) {
          console.log(
            "Missing Supabase configuration - SUPABASE_URL:",
            !!SUPABASE_URL,
            "SERVICE_ROLE:",
            !!SERVICE_ROLE
          );
          return res.status(503).json({
            error: "Service temporarily unavailable",
            message: "Database configuration missing",
            details:
              "Please check environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
          });
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false },
        });
        console.log("Supabase admin client created for expenses");

        // First verify the voucher belongs to the user
        const { data: voucher, error: fetchError } = await admin
          .from("vouchers")
          .select("id")
          .eq("id", voucherId)
          .eq("user_id", authUser.id)
          .single();

        if (fetchError) {
          console.error("Error fetching voucher:", fetchError);
          if (
            fetchError.code === "PGRST116" ||
            fetchError.message?.includes('relation "vouchers" does not exist')
          ) {
            return res.status(503).json({
              error: "Database table not found",
              message: "Vouchers table does not exist",
              details:
                "Please run the database setup script to create the required tables",
              code: fetchError.code,
            });
          }
          return res.status(500).json({
            error: "Failed to fetch voucher",
            details: fetchError.message,
            code: fetchError.code,
          });
        }

        if (!voucher) {
          return res.status(404).json({ error: "Voucher not found" });
        }

        const { data, error } = await admin
          .from("expenses")
          .insert({
            voucher_id: voucherId,
            description,
            transport_type,
            amount,
            distance,
            datetime,
            notes,
          })
          .select()
          .single();

        if (error) {
          console.error("/api/vouchers/:id/expenses POST error", error);
          return res.status(500).json({ error: "Failed to create expense" });
        }

        // Update voucher total amount
        const { data: expenses, error: expensesError } = await admin
          .from("expenses")
          .select("amount")
          .eq("voucher_id", voucherId);

        if (!expensesError && expenses) {
          const totalAmount = expenses.reduce(
            (sum, expense) => sum + parseFloat(expense.amount || "0"),
            0
          );
          await admin
            .from("vouchers")
            .update({ total_amount: totalAmount.toString() })
            .eq("id", voucherId);
        }

        return res.json(data);
      } catch (e) {
        console.error("/api/vouchers/:id/expenses POST handler error", e);
        res.status(500).json({ error: "Expense creation error" });
      }
    }
  );

  // Delete expense endpoint
  app.delete("/api/expenses/:id", verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { id: expenseId } = req.params;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "Database configuration missing",
          details: "Please check environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { persistSession: false },
      });

      // First, get the expense to verify ownership and get voucher_id
      const { data: expense, error: fetchError } = await admin
        .from("expenses")
        .select("voucher_id, vouchers!inner(user_id)")
        .eq("id", expenseId)
        .single();

      if (fetchError) {
        console.error("Error fetching expense:", fetchError);
        return res.status(500).json({
          error: "Failed to fetch expense",
          details: fetchError.message,
        });
      }

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      // Verify the expense belongs to a voucher owned by the authenticated user
      if (expense.vouchers.user_id !== authUser.id) {
        return res.status(403).json({ error: "Not authorized to delete this expense" });
      }

      // Delete the expense
      const { error: deleteError } = await admin
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (deleteError) {
        console.error("/api/expenses DELETE error", deleteError);
        return res.status(500).json({ error: "Failed to delete expense" });
      }

      // Update voucher total amount
      const { data: remainingExpenses, error: expensesError } = await admin
        .from("expenses")
        .select("amount")
        .eq("voucher_id", expense.voucher_id);

      if (!expensesError && remainingExpenses) {
        const totalAmount = remainingExpenses.reduce(
          (sum, exp) => sum + parseFloat(exp.amount || "0"),
          0
        );
        await admin
          .from("vouchers")
          .update({ total_amount: totalAmount.toString() })
          .eq("id", expense.voucher_id);
      }

      return res.json({ success: true });
    } catch (e) {
      console.error("/api/expenses DELETE handler error", e);
      res.status(500).json({ error: "Expense deletion error" });
    }
  });
}
