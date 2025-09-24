-- Database setup script for PDSN Expense Manager
-- Run this in your Supabase SQL editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  department VARCHAR NOT NULL DEFAULT 'Operations',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  department VARCHAR NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  batch_id UUID,
  description VARCHAR NOT NULL,
  transport_type VARCHAR NOT NULL CHECK (transport_type IN ('bus', 'train', 'cab', 'auto', 'fuel', 'flight', 'parking', 'food', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  distance INTEGER, -- for fuel calculations
  datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_voucher_id ON expenses(voucher_id);
CREATE INDEX IF NOT EXISTS idx_expenses_batch_id ON expenses(batch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_datetime ON expenses(datetime);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Vouchers policies
CREATE POLICY "Users can view own vouchers" ON vouchers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vouchers" ON vouchers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouchers" ON vouchers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vouchers" ON vouchers
    FOR DELETE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view expenses for own vouchers" ON expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vouchers 
            WHERE vouchers.id = expenses.voucher_id 
            AND vouchers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert expenses for own vouchers" ON expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM vouchers 
            WHERE vouchers.id = expenses.voucher_id 
            AND vouchers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update expenses for own vouchers" ON expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM vouchers 
            WHERE vouchers.id = expenses.voucher_id 
            AND vouchers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete expenses for own vouchers" ON expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM vouchers 
            WHERE vouchers.id = expenses.voucher_id 
            AND vouchers.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
