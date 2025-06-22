# New Relic Payment Access Logging - Implementation Guide

## Already Implemented Features

### 1. Webhook Event Logging
Located in `server/webhook-handlers.ts`:
```javascript
// All webhook events are automatically logged to New Relic
logWebhookEvent('PAYMENT_INTENT_SUCCEEDED', { 
  paymentIntentId: 'pi_123',
  amount: 100.00,
  currency: 'AUD'
});
```

### 2. Orphaned Payment Alerts
Critical payment issues trigger high-priority New Relic alerts:
```javascript
newrelic.recordCustomEvent('OrphanedPayment', {
  paymentIntentId: 'pi_123',
  amount: 100.00,
  severity: 'HIGH',
  alertLevel: 'CRITICAL'
});
```

### 3. Payment Transaction Tracking
Every payment is logged with full context:
- Payment method (Stripe/PayPal)
- Amount and currency
- User IP and browser info
- Processing status

### 4. Browser-Side Page Tracking
Frontend automatically logs payment page access:
```javascript
newrelic.addPageAction('PaymentAccess', {
  page: 'donation',
  amount: 50.00,
  currency: 'AUD'
});
```

## Viewing Payment Logs in New Relic

### 1. Custom Events Dashboard
Navigate to: **Insights > Data Explorer > Custom Events**
- Search for: `PaymentAccess`, `WebhookEvent`, `OrphanedPayment`

### 2. NRQL Queries for Payment Analysis

**All Payment Transactions Today:**
```sql
SELECT * FROM PaymentAccess 
WHERE eventType = 'PAYMENT_TRANSACTION' 
SINCE today
```

**Failed Payments:**
```sql
SELECT * FROM PaymentAccess 
WHERE status = 'failed' 
SINCE 1 week ago
```

**Webhook Processing Performance:**
```sql
SELECT average(processingTime) FROM WebhookEvent 
WHERE eventType = 'PAYMENT_INTENT_SUCCEEDED' 
SINCE 1 day ago
```

**Orphaned Payment Alerts:**
```sql
SELECT * FROM OrphanedPayment 
WHERE severity = 'HIGH' 
SINCE 1 week ago
```

**Payment Volume by Currency:**
```sql
SELECT count(*), currency FROM PaymentAccess 
WHERE eventType = 'PAYMENT_TRANSACTION' 
FACET currency SINCE 1 day ago
```

### 3. Alert Conditions Already Set Up

**High Priority Alerts:**
- Orphaned payments (immediate notification)
- Failed payment rate > 5%
- Webhook processing delays > 5 seconds

**Security Alerts:**
- Unusual payment patterns
- Multiple failed attempts from same IP
- Large amount transactions

### 4. Custom Dashboards

Create dashboards with these widgets:
- Payment success rate
- Processing time trends
- Currency distribution
- Geographic payment patterns
- Error rate monitoring

### 5. Environment Variables for New Relic

Already configured:
- `NEW_RELIC_LICENSE_KEY`
- `VITE_NEW_RELIC_ACCOUNT_ID`
- `VITE_NEW_RELIC_APPLICATION_ID`
- `VITE_NEW_RELIC_BROWSER_LICENSE_KEY`

## Real-Time Monitoring Features

1. **Payment Flow Tracking** - Every step logged
2. **Error Correlation** - Payment failures linked to user sessions
3. **Performance Metrics** - Response times for payment processing
4. **Security Events** - Suspicious payment activity detection
5. **Business Intelligence** - Donation patterns and trends

All payment access is already being logged to New Relic with comprehensive event tracking and alerting in place.