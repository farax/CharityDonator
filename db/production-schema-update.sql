-- Production Database Schema Update Script
-- Run this script on your production PostgreSQL database
-- Generated for Aafiyaa Charity Clinics - June 22, 2025

-- ==============================================
-- DELTA DDL SCRIPT FOR PRODUCTION DEPLOYMENT
-- ==============================================

-- Check if we're running on the correct database
-- Replace 'your_production_db_name' with your actual production database name
DO $$
BEGIN
  IF current_database() != 'your_production_db_name' THEN
    RAISE EXCEPTION 'This script should only be run on the production database!';
  END IF;
END $$;

-- Start transaction for atomic updates
BEGIN;

-- ==============================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================

-- Add PayPal support columns to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'paypal_customer_id') THEN
    ALTER TABLE users ADD COLUMN paypal_customer_id VARCHAR(255);
    RAISE NOTICE 'Added paypal_customer_id column to users table';
  END IF;
END $$;

-- Add payment method tracking to donations table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'payment_method') THEN
    ALTER TABLE donations ADD COLUMN payment_method VARCHAR(50) DEFAULT 'stripe';
    RAISE NOTICE 'Added payment_method column to donations table';
  END IF;
END $$;

-- Add PayPal subscription support to donations table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'paypal_subscription_id') THEN
    ALTER TABLE donations ADD COLUMN paypal_subscription_id VARCHAR(255);
    RAISE NOTICE 'Added paypal_subscription_id column to donations table';
  END IF;
END $$;

-- Add subscription status tracking (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'subscription_status') THEN
    ALTER TABLE donations ADD COLUMN subscription_status VARCHAR(50);
    RAISE NOTICE 'Added subscription_status column to donations table';
  END IF;
END $$;

-- Add next payment date for subscriptions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'next_payment_date') THEN
    ALTER TABLE donations ADD COLUMN next_payment_date TIMESTAMP;
    RAISE NOTICE 'Added next_payment_date column to donations table';
  END IF;
END $$;

-- =================================== =========
-- 2. CREATE NEW TABLES (IF NOT EXISTS)
-- ==============================================

-- Create contact_messages table (if not exists)
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create stats table for dashboard metrics (if not exists)
CREATE TABLE IF NOT EXISTS stats (
  id SERIAL PRIMARY KEY,
  total_patients INTEGER DEFAULT 0,
  monthly_patients INTEGER DEFAULT 0,
  active_cases INTEGER DEFAULT 0,
  total_donated DECIMAL(10,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Indexes for donations table
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(type);
CREATE INDEX IF NOT EXISTS idx_donations_payment_method ON donations(payment_method);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_id ON donations(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_subscription_id ON donations(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_donations_paypal_subscription_id ON donations(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_case_id ON donations(case_id);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_paypal_customer_id ON users(paypal_customer_id);

-- Indexes for cases table
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);

-- Indexes for contact_messages table
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- ==============================================
-- 4. UPDATE EXISTING DATA (SAFE UPDATES)
-- ==============================================

-- Set default payment method for existing donations without one
UPDATE donations 
SET payment_method = 'stripe' 
WHERE payment_method IS NULL AND stripe_payment_id IS NOT NULL;

-- Initialize stats table with default values (if empty)
INSERT INTO stats (id, total_patients, monthly_patients, active_cases, total_donated)
SELECT 1, 5000, 200, 25, COALESCE(SUM(amount), 0)
FROM donations 
WHERE status = 'completed'
AND NOT EXISTS (SELECT 1 FROM stats WHERE id = 1);

-- ==============================================
-- 5. ADD CONSTRAINTS AND VALIDATIONS
-- ==============================================

-- Add check constraints for valid statuses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                 WHERE table_name = 'donations' AND constraint_name = 'donations_status_check') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
    RAISE NOTICE 'Added status check constraint to donations table';
  END IF;
END $$;

-- Add check constraint for valid donation types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                 WHERE table_name = 'donations' AND constraint_name = 'donations_type_check') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_type_check 
    CHECK (type IN ('zakaat', 'sadqah', 'dispose_interest'));
    RAISE NOTICE 'Added type check constraint to donations table';
  END IF;
END $$;

-- Add check constraint for valid payment methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                 WHERE table_name = 'donations' AND constraint_name = 'donations_payment_method_check') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_payment_method_check 
    CHECK (payment_method IN ('stripe', 'paypal'));
    RAISE NOTICE 'Added payment_method check constraint to donations table';
  END IF;
END $$;

-- ==============================================
-- 6. CREATE SESSION STORE TABLE FOR EXPRESS-SESSION
-- ==============================================

-- Create session table for PostgreSQL session store (if not exists)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

-- Add primary key and index for session table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'session' AND constraint_type = 'PRIMARY KEY') THEN
    ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
    RAISE NOTICE 'Added primary key to session table';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- ==============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ==============================================

-- Grant permissions to your application user (replace 'app_user' with your actual username)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Uncomment and modify the above lines with your actual database user

-- ==============================================
-- 8. VERIFICATION QUERIES
-- ==============================================

-- Verify the schema updates
DO $$
DECLARE
  table_count INTEGER;
  column_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  -- Count columns in donations table
  SELECT COUNT(*) INTO column_count FROM information_schema.columns 
  WHERE table_name = 'donations';
  
  RAISE NOTICE 'Schema update completed successfully!';
  RAISE NOTICE 'Total tables: %', table_count;
  RAISE NOTICE 'Donations table columns: %', column_count;
END $$;

-- Commit the transaction
COMMIT;

-- ==============================================
-- POST-UPDATE VERIFICATION
-- ==============================================

-- Run these queries to verify the update was successful:

-- 1. Check table structure
-- \d donations
-- \d users
-- \d cases
-- \d contact_messages
-- \d stats
-- \d session

-- 2. Check data integrity
-- SELECT COUNT(*) as total_donations FROM donations;
-- SELECT COUNT(*) as total_users FROM users;
-- SELECT COUNT(*) as total_cases FROM cases;

-- 3. Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('donations', 'users', 'cases');

RAISE NOTICE '==============================================';
RAISE NOTICE 'PRODUCTION SCHEMA UPDATE COMPLETED';
RAISE NOTICE 'Please verify the changes and test your application';
RAISE NOTICE '==============================================';