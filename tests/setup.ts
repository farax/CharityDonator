import { beforeAll, afterAll, beforeEach } from 'vitest';
import { storage } from '../server/storage';

// Test configuration
export const TEST_CONFIG = {
  stripe: {
    // Using environment variables for test keys to avoid exposing secrets
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_placeholder'
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
  // Environment variables for Stripe keys should be set in CI/CD or local test environment
});

afterAll(async () => {
  // Cleanup after all tests
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});