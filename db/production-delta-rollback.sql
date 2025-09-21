-- Production Database Delta Rollback Script
-- Run this script ONLY if you need to undo the delta update
-- Generated for Aafiyaa Charity Clinics - September 21, 2025
-- WARNING: This script will remove tables and columns - use with caution!

-- ==============================================
-- ROLLBACK SCRIPT FOR DELTA UPDATE
-- ==============================================

-- Safety check - uncomment and replace with your actual production database name
-- DO $$
-- BEGIN
--   IF current_database() != 'your_production_db_name' THEN
--     RAISE EXCEPTION 'This script should only be run on the production database!';
--   END IF;
-- END $$;

-- Start transaction for atomic rollback
BEGIN;

-- ==============================================
-- 1. DROP NEW TABLES (ONLY IF SAFE TO DO SO)
-- ==============================================

-- WARNING: Only run these if the tables contain no important data
-- Check table contents before dropping:
-- SELECT COUNT(*) FROM webhook_events;
-- SELECT COUNT(*) FROM orphaned_payments;
-- SELECT COUNT(*) FROM receipts;

-- Uncomment these lines only if you're sure the tables are empty or you want to lose the data:

-- DROP TABLE IF EXISTS webhook_events CASCADE;
-- DROP TABLE IF EXISTS orphaned_payments CASCADE;
-- DROP TABLE IF EXISTS receipts CASCADE;

-- ==============================================
-- 2. REMOVE NEW COLUMNS (CAUTION: DATA LOSS)
-- ==============================================

-- WARNING: Dropping columns will permanently delete data in those columns
-- Check if columns contain important data before dropping:
-- SELECT COUNT(*) FROM donations WHERE first_name IS NOT NULL;
-- SELECT COUNT(*) FROM donations WHERE last_name IS NOT NULL;
-- SELECT COUNT(*) FROM cases WHERE recurring_allowed = TRUE;

-- Uncomment these lines only if you're sure you want to lose this data:

-- ALTER TABLE donations DROP COLUMN IF EXISTS first_name;
-- ALTER TABLE donations DROP COLUMN IF EXISTS last_name;
-- ALTER TABLE cases DROP COLUMN IF EXISTS recurring_allowed;

-- ==============================================
-- 3. DROP INDEXES (SAFER OPERATION)
-- ==============================================

-- These are safe to drop as they can be recreated
DROP INDEX IF EXISTS idx_webhook_events_event_type;
DROP INDEX IF EXISTS idx_webhook_events_payment_intent_id;
DROP INDEX IF EXISTS idx_webhook_events_donation_id;
DROP INDEX IF EXISTS idx_webhook_events_status;
DROP INDEX IF EXISTS idx_webhook_events_created_at;

DROP INDEX IF EXISTS idx_orphaned_payments_status;
DROP INDEX IF EXISTS idx_orphaned_payments_resolved_donation_id;
DROP INDEX IF EXISTS idx_orphaned_payments_created_at;

DROP INDEX IF EXISTS idx_receipts_donation_id;
DROP INDEX IF EXISTS idx_receipts_status;
DROP INDEX IF EXISTS idx_receipts_case_id;
DROP INDEX IF EXISTS idx_receipts_created_at;

DROP INDEX IF EXISTS idx_donations_email;
DROP INDEX IF EXISTS idx_donations_user_id;
DROP INDEX IF EXISTS idx_cases_recurring_allowed;

-- ==============================================
-- 4. VERIFICATION
-- ==============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Count remaining tables
  SELECT COUNT(*) INTO table_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Rollback completed - some operations may have been commented out for safety';
  RAISE NOTICE 'Total tables: %', table_count;
  RAISE NOTICE 'Please verify the rollback manually';
END $$;

-- Commit the rollback transaction
COMMIT;

-- ==============================================
-- IMPORTANT NOTES
-- ==============================================
--
-- This rollback script is intentionally conservative to prevent data loss.
-- Many operations are commented out because they would cause permanent data loss.
--
-- Before running table/column drops:
-- 1. Create a full database backup
-- 2. Export any important data from the tables/columns you plan to drop
-- 3. Verify your application can work without the dropped elements
-- 4. Test on a staging environment first
--
-- To complete the rollback:
-- 1. Uncomment only the operations you need
-- 2. Replace the safety check database name at the top
-- 3. Run on staging first
-- 4. Create a backup before running on production
--
-- ==============================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'ROLLBACK SCRIPT COMPLETED';
RAISE NOTICE 'NOTE: Most destructive operations are commented out for safety';
RAISE NOTICE 'Uncomment specific operations only if needed';
RAISE NOTICE '==============================================';