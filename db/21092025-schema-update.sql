-- Production Database Delta Update Script
-- Run this script on your production PostgreSQL database
-- Generated for Aafiyaa Charity Clinics - September 21, 2025
-- This script adds missing tables and columns for webhook events, orphaned payments, and receipts

-- ==============================================
-- DELTA DDL SCRIPT FOR PRODUCTION DEPLOYMENT
-- ==============================================

-- Safety check - uncomment and replace with your actual production database name
-- DO $$
-- BEGIN
--   IF current_database() != 'your_production_db_name' THEN
--     RAISE EXCEPTION 'This script should only be run on the production database!';
--   END IF;
-- END $$;

-- Start transaction for atomic updates
BEGIN;

-- ==============================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ==============================================

-- Add missing columns to donations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'first_name') THEN
    ALTER TABLE donations ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column to donations table';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'donations' AND column_name = 'last_name') THEN
    ALTER TABLE donations ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column to donations table';
  END IF;
END $$;

-- Add missing column to cases table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cases' AND column_name = 'recurring_allowed') THEN
    ALTER TABLE cases ADD COLUMN recurring_allowed BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added recurring_allowed column to cases table';
  END IF;
END $$;

-- ==============================================
-- 2. CREATE NEW TABLES (IF NOT EXISTS)
-- ==============================================

-- Create webhook_events table for tracking webhook processing
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  payment_intent_id TEXT,
  subscription_id TEXT,
  donation_id INTEGER,
  match_strategy TEXT,
  status TEXT NOT NULL,
  raw_data JSON,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create orphaned_payments table for tracking unmatched payments
CREATE TABLE IF NOT EXISTS orphaned_payments (
  id SERIAL PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unresolved',
  resolved_donation_id INTEGER,
  stripe_metadata JSON,
  description TEXT,
  stripe_created_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create receipts table for PDF receipt tracking
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  donation_id INTEGER NOT NULL,
  receipt_number TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  donor_name TEXT,
  donor_email TEXT,
  donation_type TEXT NOT NULL,
  case_id INTEGER,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_at TIMESTAMP,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==============================================
-- 3. ADD UNIQUE CONSTRAINTS
-- ==============================================

-- Add unique constraint to orphaned_payments.payment_intent_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'orphaned_payments' AND constraint_name = 'orphaned_payments_payment_intent_id_unique') THEN
    ALTER TABLE orphaned_payments ADD CONSTRAINT orphaned_payments_payment_intent_id_unique UNIQUE (payment_intent_id);
    RAISE NOTICE 'Added unique constraint to orphaned_payments.payment_intent_id';
  END IF;
END $$;

-- Add unique constraint to receipts.receipt_number (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE table_name = 'receipts' AND constraint_name = 'receipts_receipt_number_unique') THEN
    ALTER TABLE receipts ADD CONSTRAINT receipts_receipt_number_unique UNIQUE (receipt_number);
    RAISE NOTICE 'Added unique constraint to receipts.receipt_number';
  END IF;
END $$;

-- ==============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Indexes for webhook_events table
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_intent_id ON webhook_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_donation_id ON webhook_events(donation_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- Indexes for orphaned_payments table
CREATE INDEX IF NOT EXISTS idx_orphaned_payments_status ON orphaned_payments(status);
CREATE INDEX IF NOT EXISTS idx_orphaned_payments_resolved_donation_id ON orphaned_payments(resolved_donation_id);
CREATE INDEX IF NOT EXISTS idx_orphaned_payments_created_at ON orphaned_payments(created_at);

-- Indexes for receipts table
CREATE INDEX IF NOT EXISTS idx_receipts_donation_id ON receipts(donation_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_case_id ON receipts(case_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- Additional indexes for existing tables (if missing)
CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_recurring_allowed ON cases(recurring_allowed);

-- ==============================================
-- 5. VERIFICATION QUERIES
-- ==============================================

-- Verify the schema updates
DO $$
DECLARE
  table_count INTEGER;
  webhook_events_exists BOOLEAN;
  orphaned_payments_exists BOOLEAN;
  receipts_exists BOOLEAN;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  -- Check new tables exist
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_events') INTO webhook_events_exists;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'orphaned_payments') INTO orphaned_payments_exists;
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'receipts') INTO receipts_exists;
  
  RAISE NOTICE 'Schema delta update completed successfully!';
  RAISE NOTICE 'Total tables: %', table_count;
  RAISE NOTICE 'webhook_events table exists: %', webhook_events_exists;
  RAISE NOTICE 'orphaned_payments table exists: %', orphaned_payments_exists;
  RAISE NOTICE 'receipts table exists: %', receipts_exists;
END $$;

-- Commit the transaction
COMMIT;

-- ==============================================
-- POST-UPDATE VERIFICATION COMMANDS
-- ==============================================
-- Run these commands after the script to verify:
-- 
-- 1. Check new table structures:
-- \d webhook_events
-- \d orphaned_payments
-- \d receipts
--
-- 2. Check updated table structures:
-- \d donations
-- \d cases
--
-- 3. Verify new columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'donations' AND column_name IN ('first_name', 'last_name');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'recurring_allowed';
--
-- 4. Check unique constraints:
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_name IN ('orphaned_payments', 'receipts') AND constraint_type = 'UNIQUE';
--
-- 5. Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('webhook_events', 'orphaned_payments', 'receipts');

RAISE NOTICE '==============================================';
RAISE NOTICE 'PRODUCTION DELTA UPDATE COMPLETED';
RAISE NOTICE 'New tables added: webhook_events, orphaned_payments, receipts';
RAISE NOTICE 'New columns added: donations.first_name, donations.last_name, cases.recurring_allowed';
RAISE NOTICE 'Please verify the changes and test your application';
RAISE NOTICE '==============================================';