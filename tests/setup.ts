import { beforeAll, afterAll, beforeEach } from 'vitest';
import { storage } from '../server/storage';

// Test configuration - prevents using production keys
export const TEST_CONFIG = {
  stripe: {
    // Test environment uses separate test-specific environment variables
    secretKey: process.env.STRIPE_TEST_SECRET_KEY,
    publicKey: process.env.STRIPE_TEST_PUBLIC_KEY,
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET
  },
  currencies: ['AUD', 'USD', 'EUR', 'GBP', 'INR'],
  amounts: [5.00, 25.50, 100.00, 1000.00],
  donationTypes: ['zakaat', 'sadqah', 'dispose_interest']
};

// Mock Stripe webhook events for testing
export const createMockWebhookEvent = (type: string, data: any) => ({
  id: `evt_test_${Date.now()}`,
  object: 'event',
  type,
  data: { object: data },
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null }
});

// Mock payment intent for testing
export const createMockPaymentIntent = (overrides: any = {}) => ({
  id: `pi_test_${Date.now()}`,
  object: 'payment_intent',
  amount: 2000, // $20.00 in cents
  currency: 'aud',
  status: 'succeeded',
  client_secret: `pi_test_${Date.now()}_secret_test`,
  metadata: {},
  ...overrides
});

// Test database cleanup
beforeEach(async () => {
  // Clear test data before each test
  if (storage instanceof Map) {
    storage.clear();
  }
});

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Safety check: prevent tests from running with production keys
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
    throw new Error('FATAL: Production Stripe keys detected in test environment. Tests aborted for safety.');
  }
  
  // Ensure test keys are available
  if (!process.env.STRIPE_TEST_SECRET_KEY) {
    console.warn('Warning: STRIPE_TEST_SECRET_KEY not found. Some tests may fail.');
  }
});

afterAll(async () => {
  // Cleanup test environment variables
  delete process.env.STRIPE_TEST_SECRET_KEY;
  delete process.env.STRIPE_TEST_PUBLIC_KEY;
  delete process.env.STRIPE_TEST_WEBHOOK_SECRET;
});