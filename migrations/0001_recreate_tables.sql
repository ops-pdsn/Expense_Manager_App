-- Complete recreation of tables with proper schema for Supabase Auth
-- This will drop and recreate all tables with the correct structure

-- Drop existing tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
    id varchar PRIMARY KEY, -- This will be the auth.users.id from Supabase
    email varchar NOT NULL UNIQUE,
    first_name varchar,
    last_name varchar,
    department varchar NOT NULL,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

-- Create vouchers table
CREATE TABLE vouchers (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id varchar NOT NULL REFERENCES users(id),
    name varchar NOT NULL,
    department varchar NOT NULL,
    description text,
    start_date timestamp NOT NULL,
    end_date timestamp NOT NULL,
    status varchar CHECK (status IN ('draft', 'submitted')) NOT NULL DEFAULT 'draft',
    total_amount decimal(10, 2) NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT NOW(),
    updated_at timestamp DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
    voucher_id varchar NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    description varchar NOT NULL,
    transport_type varchar CHECK (transport_type IN ('bus', 'train', 'cab', 'auto', 'fuel', 'flight', 'parking', 'other')) NOT NULL,
    amount decimal(10, 2) NOT NULL,
    distance integer, -- for fuel calculations
    datetime timestamp NOT NULL,
    notes text,
    created_at timestamp DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX idx_vouchers_created_at ON vouchers(created_at);
CREATE INDEX idx_expenses_voucher_id ON expenses(voucher_id);
CREATE INDEX idx_expenses_datetime ON expenses(datetime);
