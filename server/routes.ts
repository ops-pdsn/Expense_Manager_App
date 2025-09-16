import type express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifySupabaseToken } from './auth.js';

// Do not use path aliases in serverless runtime
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function registerRoutes(app: express.Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/user/profile', verifySupabaseToken, async (req, res) => {
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
          source: 'auth-only',
          note: 'SUPABASE_SERVICE_ROLE_KEY not set',
        });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // First, try to get existing user
      let { data, error } = await admin
        .from('users')
        .select('first_name, last_name, department')
        .eq('id', authUser.id)
        .maybeSingle();

      // If user doesn't exist, create them with default values
      if (error || !data) {
        console.log('User not found in users table, creating new user:', authUser.id);
        console.log('Query error:', error);
        
        const { error: insertError } = await admin
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            first_name: null,
            last_name: null,
            department: 'Operations', // Default department
          });

        if (insertError) {
          console.error('/api/user/profile insert error', insertError);
          return res.status(500).json({ error: 'Failed to create user profile' });
        }

        console.log('User created successfully with department: Operations');

        // Return the newly created user data
        return res.json({
          id: authUser.id,
          email: authUser.email,
          firstName: null,
          lastName: null,
          department: 'Operations',
          source: 'db-created',
        });
      }

      console.log('Existing user data:', data);
      console.log('User department:', data?.department);

      return res.json({
        id: authUser.id,
        email: authUser.email,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        department: data?.department ?? null,
        source: 'db',
      });
    } catch (e) {
      console.error('/api/user/profile handler error', e);
      res.status(500).json({ error: 'Profile handler error' });
    }
  });

  // Update user profile endpoint
  app.patch('/api/user/profile', verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { firstName, lastName, department } = req.body;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: 'Service not configured' });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // Upsert user profile
      const { data, error } = await admin
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          first_name: firstName || null,
          last_name: lastName || null,
          department: department || 'Operations',
        })
        .select()
        .single();

      if (error) {
        console.error('/api/user/profile PATCH error', error);
        return res.status(500).json({ error: 'Failed to update user profile' });
      }

      return res.json({
        id: authUser.id,
        email: authUser.email,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        department: data?.department ?? 'Operations',
        source: 'db-updated',
      });
    } catch (e) {
      console.error('/api/user/profile PATCH handler error', e);
      res.status(500).json({ error: 'Profile update error' });
    }
  });

  // Vouchers endpoints
  app.get('/api/vouchers', verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.json([]);
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // Fetch vouchers with expenses for the authenticated user
      const { data: vouchers, error: vouchersError } = await admin
        .from('vouchers')
        .select(`
          *,
          expenses (*)
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (vouchersError) {
        console.error('/api/vouchers query error', vouchersError);
        return res.status(500).json({ error: 'Vouchers query failed' });
      }

      // Transform the data to match the expected format
      const transformedVouchers = vouchers?.map(voucher => ({
        ...voucher,
        userId: voucher.user_id,
        startDate: voucher.start_date,
        endDate: voucher.end_date,
        totalAmount: voucher.total_amount,
        createdAt: voucher.created_at,
        updatedAt: voucher.updated_at,
        expenses: voucher.expenses || [],
        expenseCount: voucher.expenses?.length || 0,
      })) || [];

      return res.json(transformedVouchers);
    } catch (e) {
      console.error('/api/vouchers handler error', e);
      res.status(500).json({ error: 'Vouchers handler error' });
    }
  });

  app.post('/api/vouchers', verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { name, department, description, start_date, end_date } = req.body;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: 'Service not configured' });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      const { data, error } = await admin
        .from('vouchers')
        .insert({
          user_id: authUser.id,
          name,
          department,
          description,
          start_date,
          end_date,
          status: 'draft',
          total_amount: '0',
        })
        .select()
        .single();

      if (error) {
        console.error('/api/vouchers POST error', error);
        return res.status(500).json({ error: 'Failed to create voucher' });
      }

      return res.json(data);
    } catch (e) {
      console.error('/api/vouchers POST handler error', e);
      res.status(500).json({ error: 'Voucher creation error' });
    }
  });

  app.delete('/api/vouchers/:id', verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { id } = req.params;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: 'Service not configured' });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // First verify the voucher belongs to the user
      const { data: voucher, error: fetchError } = await admin
        .from('vouchers')
        .select('id')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError || !voucher) {
        return res.status(404).json({ error: 'Voucher not found' });
      }

      const { error } = await admin
        .from('vouchers')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id);

      if (error) {
        console.error('/api/vouchers DELETE error', error);
        return res.status(500).json({ error: 'Failed to delete voucher' });
      }

      return res.json({ success: true });
    } catch (e) {
      console.error('/api/vouchers DELETE handler error', e);
      res.status(500).json({ error: 'Voucher deletion error' });
    }
  });

  app.post('/api/vouchers/:id/expenses', verifySupabaseToken, async (req, res) => {
    try {
      const authUser = req.user!; // set by middleware
      const { id: voucherId } = req.params;
      const { description, transport_type, amount, distance, datetime, notes } = req.body;

      if (!SUPABASE_URL || !SERVICE_ROLE) {
        return res.status(500).json({ error: 'Service not configured' });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

      // First verify the voucher belongs to the user
      const { data: voucher, error: fetchError } = await admin
        .from('vouchers')
        .select('id')
        .eq('id', voucherId)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError || !voucher) {
        return res.status(404).json({ error: 'Voucher not found' });
      }

      const { data, error } = await admin
        .from('expenses')
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
        console.error('/api/vouchers/:id/expenses POST error', error);
        return res.status(500).json({ error: 'Failed to create expense' });
      }

      // Update voucher total amount
      const { data: expenses, error: expensesError } = await admin
        .from('expenses')
        .select('amount')
        .eq('voucher_id', voucherId);

      if (!expensesError && expenses) {
        const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
        await admin
          .from('vouchers')
          .update({ total_amount: totalAmount.toString() })
          .eq('id', voucherId);
      }

      return res.json(data);
    } catch (e) {
      console.error('/api/vouchers/:id/expenses POST handler error', e);
      res.status(500).json({ error: 'Expense creation error' });
    }
  });
}
