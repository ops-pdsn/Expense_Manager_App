import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// TODO: Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://ehaihgqtikquxxzraakx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYWloZ3F0aWtxdXh4enJhYWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTI3NTEsImV4cCI6MjA3Mjg4ODc1MX0.T0WaIMT0TqSISCi9K4ciblXvguHf2t1d84q7IeDepds';

// Create Supabase client with real credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
