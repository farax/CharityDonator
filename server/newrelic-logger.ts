/**
 * New Relic Payment Access Logger
 * Comprehensive logging for payment transactions and access monitoring
 */

// New Relic logging functions for payment tracking
export const logPaymentAccess = (eventType: string, data: any) => {
  if (typeof window !== 'undefined' && (window as any).newrelic) {
    // Browser-side New Relic logging
    (window as any).newrelic.addPageAction('PaymentAccess', {
      eventType,
      timestamp: new Date().toISOString(),
      ...data
    });
  } else if (process.env.NODE_ENV !== 'test') {
    // Server-side New Relic is disabled to avoid production build issues
    // All analytics tracking is handled by the client-side browser agent
    console.log(`[PAYMENT-LOG-${eventType}]`, JSON.stringify(data, null, 2));
  }
};

// Payment transaction logging
export const logPaymentTransaction = (transactionData: {
  donationId: number;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'paypal';
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  userAgent?: string;
  ipAddress?: string;
  stripePaymentId?: string;
  paypalOrderId?: string;
}) => {
  logPaymentAccess('PAYMENT_TRANSACTION', {
    ...transactionData,
    severity: transactionData.status === 'failed' ? 'HIGH' : 'NORMAL'
  });
};

// Webhook processing logging
export const logWebhookAccess = (webhookData: {
  webhookType: string;
  paymentIntentId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
  status: 'received' | 'processed' | 'failed';
  source: 'stripe' | 'paypal';
  processingTime?: number;
}) => {
  logPaymentAccess('WEBHOOK_PROCESSING', {
    ...webhookData,
    severity: webhookData.status === 'failed' ? 'HIGH' : 'NORMAL'
  });
};

// User access logging for payment pages
export const logPaymentPageAccess = (pageData: {
  page: 'donation' | 'payment' | 'success' | 'admin';
  userId?: number;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  donationType?: string;
  amount?: number;
  currency?: string;
}) => {
  logPaymentAccess('PAGE_ACCESS', pageData);
};

// Admin dashboard access logging
export const logAdminAccess = (adminData: {
  action: 'login' | 'view_payments' | 'view_stats' | 'export_data' | 'modify_settings';
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  targetResource?: string;
}) => {
  logPaymentAccess('ADMIN_ACCESS', {
    ...adminData,
    severity: adminData.success ? 'NORMAL' : 'HIGH'
  });
};

// Error logging for payment failures
export const logPaymentError = (errorData: {
  errorType: 'stripe_error' | 'paypal_error' | 'validation_error' | 'system_error';
  errorMessage: string;
  donationId?: number;
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
}) => {
  logPaymentAccess('PAYMENT_ERROR', {
    ...errorData,
    severity: 'HIGH'
  });
};

// Security event logging
export const logSecurityEvent = (securityData: {
  eventType: 'suspicious_payment' | 'multiple_failures' | 'unusual_amount' | 'blocked_country';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  amount?: number;
  currency?: string;
  frequency?: number;
}) => {
  logPaymentAccess('SECURITY_EVENT', {
    ...securityData,
    severity: 'CRITICAL'
  });
};

// Performance monitoring for payment operations
export const logPaymentPerformance = (performanceData: {
  operation: 'payment_intent_creation' | 'webhook_processing' | 'donation_save' | 'email_send';
  duration: number;
  success: boolean;
  paymentMethod?: 'stripe' | 'paypal';
  amount?: number;
  currency?: string;
}) => {
  logPaymentAccess('PERFORMANCE_METRIC', {
    ...performanceData,
    severity: performanceData.duration > 5000 ? 'HIGH' : 'NORMAL'
  });
};