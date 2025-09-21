# Production Database Update Guide

## Overview
This guide contains the DDL scripts needed to update your production database to match the current application schema.

## Files Created

1. **`21092025-schema-update.sql`** - The main update script
2. **`production-delta-rollback.sql`** - Rollback script (use with caution)
3. **`PRODUCTION-DEPLOYMENT-GUIDE.md`** - This guide

## What Will Be Updated

### New Tables Added:
- `webhook_events` - For tracking Stripe webhook processing
- `orphaned_payments` - For tracking unmatched payments from Stripe
- `receipts` - For PDF receipt generation tracking

### New Columns Added:
- `donations.first_name` - Donor's first name
- `donations.last_name` - Donor's last name  
- `cases.recurring_allowed` - Whether case supports recurring donations

### New Indexes Added:
- Performance indexes for all new tables
- Additional indexes for existing tables to improve query performance

## Pre-Deployment Checklist

1. **Create a full database backup**
   ```bash
   pg_dump your_production_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging environment first**
   - Apply the update script to your staging database
   - Run your application tests
   - Verify all functionality works correctly

3. **Update the safety check** (optional but recommended)
   - Edit `21092025-schema-update.sql` line 15
   - Replace `'your_production_db_name'` with your actual database name
   - Uncomment lines 11-17 to enable the safety check

## Deployment Steps

1. **Connect to your production database**
   ```bash
   psql your_production_connection_string
   ```

2. **Run the update script**
   ```sql
   \i db/21092025-schema-update.sql
   ```

3. **Verify the update**
   ```sql
   -- Check new tables exist
   \dt
   
   -- Check new columns exist
   \d donations
   \d cases
   
   -- Verify data integrity
   SELECT COUNT(*) FROM donations;
   SELECT COUNT(*) FROM webhook_events;
   SELECT COUNT(*) FROM orphaned_payments;
   SELECT COUNT(*) FROM receipts;
   ```

## Post-Deployment

1. **Test your application thoroughly**
   - Verify donation processing works
   - Check admin console functionality
   - Test webhook handling
   - Confirm receipt generation (if implemented)

2. **Monitor application logs** for any issues

3. **Keep the backup** until you're confident the update is successful

## Rollback (Emergency Only)

If something goes wrong, you can:

1. **Restore from backup** (safest option)
   ```bash
   psql your_production_db < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Use the rollback script** (partial rollback)
   ```sql
   \i db/production-delta-rollback.sql
   ```
   
   **WARNING**: The rollback script is conservative and won't drop tables/columns by default to prevent data loss. You'll need to uncomment specific operations if needed.

## Safety Notes

- ✅ All operations use `IF NOT EXISTS` or similar safe patterns
- ✅ No existing data will be modified or lost
- ✅ New columns have appropriate defaults
- ✅ Unique constraints are added safely
- ✅ All operations are wrapped in a transaction
- ✅ The script includes verification steps

## Support

If you encounter any issues:
1. Check the application logs for specific error messages
2. Verify the database connection and permissions
3. Ensure the script completed successfully (look for the success message)
4. Create an issue with the full error message if problems persist

## Script Execution Output

When successful, you should see messages like:
```
NOTICE: Added first_name column to donations table
NOTICE: Added last_name column to donations table
NOTICE: Added recurring_allowed column to cases table
NOTICE: Added unique constraint to orphaned_payments.payment_intent_id
NOTICE: Added unique constraint to receipts.receipt_number
NOTICE: Schema delta update completed successfully!
NOTICE: ==============================================
NOTICE: PRODUCTION DELTA UPDATE COMPLETED
NOTICE: New tables added: webhook_events, orphaned_payments, receipts
NOTICE: New columns added: donations.first_name, donations.last_name, cases.recurring_allowed
NOTICE: Please verify the changes and test your application
NOTICE: ==============================================
```