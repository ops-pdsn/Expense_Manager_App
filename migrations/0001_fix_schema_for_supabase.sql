-- Migration to fix schema for Supabase Auth integration
-- This script will update the existing tables to work with Supabase Auth

-- First, drop the password column from users table since Supabase Auth handles authentication
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Update users table column names (check if columns exist first)
DO $$ 
BEGIN
    -- Check and rename firstName column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'firstName') THEN
        ALTER TABLE users RENAME COLUMN "firstName" TO first_name;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        -- Column already exists with correct name
        NULL;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE users ADD COLUMN first_name varchar;
    END IF;

    -- Check and rename lastName column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastName') THEN
        ALTER TABLE users RENAME COLUMN "lastName" TO last_name;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        -- Column already exists with correct name
        NULL;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE users ADD COLUMN last_name varchar;
    END IF;

    -- Check and rename createdAt column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        -- Column already exists with correct name
        NULL;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE users ADD COLUMN created_at timestamp DEFAULT NOW();
    END IF;

    -- Check and rename updatedAt column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        -- Column already exists with correct name
        NULL;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE users ADD COLUMN updated_at timestamp DEFAULT NOW();
    END IF;
END $$;

-- Update vouchers table column names
DO $$ 
BEGIN
    -- Check and rename userId column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'userId') THEN
        ALTER TABLE vouchers RENAME COLUMN "userId" TO user_id;
    END IF;

    -- Check and rename startDate column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'startDate') THEN
        ALTER TABLE vouchers RENAME COLUMN "startDate" TO start_date;
    END IF;

    -- Check and rename endDate column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'endDate') THEN
        ALTER TABLE vouchers RENAME COLUMN "endDate" TO end_date;
    END IF;

    -- Check and rename totalAmount column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'totalAmount') THEN
        ALTER TABLE vouchers RENAME COLUMN "totalAmount" TO total_amount;
    END IF;

    -- Check and rename createdAt column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'createdAt') THEN
        ALTER TABLE vouchers RENAME COLUMN "createdAt" TO created_at;
    END IF;

    -- Check and rename updatedAt column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'updatedAt') THEN
        ALTER TABLE vouchers RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
END $$;

-- Update expenses table column names
DO $$ 
BEGIN
    -- Check and rename voucherId column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'voucherId') THEN
        ALTER TABLE expenses RENAME COLUMN "voucherId" TO voucher_id;
    END IF;

    -- Check and rename transportType column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'transportType') THEN
        ALTER TABLE expenses RENAME COLUMN "transportType" TO transport_type;
    END IF;

    -- Check and rename createdAt column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'createdAt') THEN
        ALTER TABLE expenses RENAME COLUMN "createdAt" TO created_at;
    END IF;
END $$;

-- Update foreign key constraints (drop old ones first)
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_userId_users_id_fk;
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_user_id_users_id_fk;

-- Add new foreign key constraint for vouchers
ALTER TABLE vouchers ADD CONSTRAINT vouchers_user_id_users_id_fk 
  FOREIGN KEY (user_id) REFERENCES users(id);

-- Update foreign key constraints for expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_voucherId_vouchers_id_fk;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_voucher_id_vouchers_id_fk;

-- Add new foreign key constraint for expenses
ALTER TABLE expenses ADD CONSTRAINT expenses_voucher_id_vouchers_id_fk 
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE;
