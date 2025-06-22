# Production Deployment Guide
*Aafiyaa Charity Clinics - Complete Deployment Instructions*

## Pre-Deployment Checklist

### 1. Database Migration
**CRITICAL: Backup your production database first!**

```bash
# Create backup
pg_dump -h your_host -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Run the migration script
psql -h your_host -U your_user -d your_database -f db/production-schema-update.sql
```

### 2. Environment Variables Setup
Add these new variables to your production environment:

```bash
# Live Chat
VITE_TAWK_TO_PROPERTY_ID=your_tawk_property_id
VITE_TAWK_TO_WIDGET_ID=your_tawk_widget_id
```

### 3. Tawk.to Account Setup
1. Create account at [tawk.to](https://www.tawk.to/)
2. Get Property ID and Widget ID from dashboard
3. Configure widget appearance and operating hours
4. Set up automated responses

## Database Schema Changes

The migration script adds:
- PayPal integration columns
- Payment method tracking
- Subscription status fields
- Contact messages table
- Statistics tracking table
- Performance indexes
- Data validation constraints

## Payment Processing Improvements

### Issues Fixed:
- Payment retry synchronization problems
- Webhook race conditions
- Inconsistent payment ID storage
- Missing error tracking

### New Features:
- Enhanced payment status tracking
- Better webhook error handling
- Improved retry logic
- PayPal integration support

## Live Chat Integration

### Features Added:
- Real-time customer support
- Donation assistance during checkout
- Case-specific inquiries
- Payment troubleshooting help
- Mobile-responsive chat widget

### Configuration:
- Widget appears bottom-right on all pages
- Automatic visitor context (page, location)
- File sharing capability
- Offline message collection
- Multi-agent support

## Testing Checklist

### After Deployment:
1. **Database Connectivity**
   - Verify all tables exist
   - Check data integrity
   - Test queries

2. **Payment Processing**
   - Test Stripe one-time donations
   - Test Stripe subscriptions
   - Verify webhook endpoints
   - Check payment status updates

3. **Live Chat**
   - Verify widget appears
   - Test message sending
   - Check admin dashboard access

4. **General Functionality**
   - Homepage loads correctly
   - Donation flow works end-to-end
   - Admin dashboard accessible
   - Contact form submissions

## Monitoring and Maintenance

### New Relic Alerts:
- Payment processing errors
- Database connection issues
- High response times
- Failed webhook deliveries

### Regular Checks:
- Payment synchronization status
- Chat message response times
- Database performance metrics
- SSL certificate validity

## Rollback Plan

If issues occur:
1. **Database**: Restore from backup
2. **Code**: Revert to previous deployment
3. **Environment**: Remove new variables
4. **Chat**: Disable Tawk.to widget

## Support Contacts

- **Database Issues**: Your hosting provider
- **Payment Problems**: Stripe/PayPal support
- **Chat Support**: Tawk.to help center
- **General Issues**: Development team

## Post-Deployment Verification

Run these queries to confirm successful deployment:

```sql
-- Check table structure
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Verify new columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'donations' ORDER BY ordinal_position;

-- Check data integrity
SELECT COUNT(*) as total_donations FROM donations;
SELECT status, COUNT(*) FROM donations GROUP BY status;
```

**Deployment Status**: Ready for production
**Estimated Downtime**: 5-10 minutes for database migration
**Rollback Time**: 2-3 minutes if needed