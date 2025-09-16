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

      // Adjust table/columns if your DB differs
      const { data, error } = await admin
        .from('users')
        .select('first_name, last_name, department')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('/api/user/profile query error', error);
        return res.status(500).json({ error: 'Profile query failed' });
      }

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
}
