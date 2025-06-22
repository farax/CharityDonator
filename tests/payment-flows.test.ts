import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { storage } from '../server/storage';
import { TEST_CONFIG, createMockWebhookEvent, createMockPaymentIntent } from './setup';
import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('Payment Flow Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'application/json' }));
    server = await registerRoutes(app);
  });

  describe('One-time Payment Flow', () => {
    it('should create donation and process payment intent for AUD', async () => {
      const donationData = {
        type: 'sadqah',
        amount: 50.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Test Donor',
        donorEmail: 'test@example.com'
      };

      // Step 1: Create donation
      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;
      expect(donation.id).toBeDefined();
      expect(donation.status).toBe('pending');
      expect(donation.amount).toBe(50.00);
      expect(donation.currency).toBe('AUD');

      // Step 2: Create payment intent
      const paymentIntentResponse = await request(app)
        .post('/api/create-payment-intent')
        .send({
          amount: donation.amount,
          currency: donation.currency,
          donationId: donation.id
        })
        .expect(200);

      const { clientSecret } = paymentIntentResponse.body;
      expect(clientSecret).toBeDefined();
      expect(clientSecret.startsWith('pi_')).toBe(true);

      // Step 3: Verify donation was updated with payment intent
      const updatedDonation = await storage.getDonation(donation.id);
      expect(updatedDonation?.status).toBe('processing');
      expect(updatedDonation?.stripePaymentId).toContain('pi_');

      // Step 4: Simulate successful webhook
      const paymentIntent = createMockPaymentIntent({
        id: updatedDonation?.stripePaymentId?.split('|')[0],
        amount: donation.amount * 100,
        currency: donation.currency.toLowerCase(),
        metadata: { donationId: donation.id.toString() }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Step 5: Verify donation completed
      const completedDonation = await storage.getDonation(donation.id);
      expect(completedDonation?.status).toBe('completed');
    });

    it('should handle multiple currencies (USD, EUR, GBP, INR)', async () => {
      for (const currency of TEST_CONFIG.currencies) {
        // Use currency-appropriate amounts to meet Stripe minimum requirements
        const currencyAmounts: Record<string, number> = {
          'AUD': 1.00,
          'USD': 1.00,
          'EUR': 1.00,
          'GBP': 1.00,
          'INR': 50.00  // INR requires higher minimum due to conversion rates
        };
        
        const donationData = {
          type: 'zakaat',
          amount: currencyAmounts[currency] || 1.00,
          currency,
          frequency: 'one-off',
          donorName: `Test Donor ${currency}`,
          donorEmail: `test-${currency.toLowerCase()}@example.com`
        };

        const donationResponse = await request(app)
          .post('/api/donations')
          .send(donationData)
          .expect(201);

        expect(donationResponse.body.currency).toBe(currency);

        const paymentIntentResponse = await request(app)
          .post('/api/create-payment-intent')
          .send({
            amount: donationData.amount,
            currency: donationData.currency,
            donationId: donationResponse.body.id
          })
          .expect(200);

        expect(paymentIntentResponse.body.clientSecret).toBeDefined();
      }
    });

    it('should handle different donation amounts', async () => {
      for (const amount of TEST_CONFIG.amounts) {
        const donationData = {
          type: 'sadqah',
          amount,
          currency: 'AUD',
          frequency: 'one-off',
          donorName: 'Test Donor',
          donorEmail: 'test@example.com'
        };

        const donationResponse = await request(app)
          .post('/api/donations')
          .send(donationData)
          .expect(201);

        expect(donationResponse.body.amount).toBe(amount);

        // Verify Stripe amount conversion (amount * 100 for cents)
        const paymentIntentResponse = await request(app)
          .post('/api/create-payment-intent')
          .send({
            amount,
            currency: 'AUD',
            donationId: donationResponse.body.id
          })
          .expect(200);

        expect(paymentIntentResponse.body.clientSecret).toBeDefined();
      }
    });
  });

  describe('Recurring Payment Flow', () => {
    it('should create subscription donation for monthly payments', async () => {
      const subscriptionData = {
        type: 'sadqah',
        amount: 100.00,
        currency: 'AUD',
        frequency: 'monthly',
        donorName: 'Recurring Donor',
        donorEmail: 'recurring@example.com'
      };

      // Step 1: Create donation
      const donationResponse = await request(app)
        .post('/api/donations')
        .send(subscriptionData)
        .expect(201);

      const donation = donationResponse.body;
      expect(donation.frequency).toBe('monthly');

      // Step 2: Create setup intent for subscription
      const setupIntentResponse = await request(app)
        .post('/api/create-setup-intent')
        .send({ donationId: donation.id })
        .expect(200);

      expect(setupIntentResponse.body.clientSecret).toBeDefined();
      expect(setupIntentResponse.body.clientSecret.startsWith('seti_')).toBe(true);
    });

    it('should handle subscription webhooks', async () => {
      // Create a subscription donation first
      const subscriptionData = {
        type: 'sadqah',
        amount: 50.00,
        currency: 'AUD',
        frequency: 'monthly',
        donorName: 'Subscription Test',
        donorEmail: 'subscription@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(subscriptionData)
        .expect(201);

      const donation = donationResponse.body;

      // Simulate subscription created webhook
      const subscription = {
        id: 'sub_test_subscription',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        metadata: { donationId: donation.id.toString() }
      };

      const webhookEvent = createMockWebhookEvent('customer.subscription.created', subscription);

      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Verify subscription was updated
      const updatedDonation = await storage.getDonation(donation.id);
      expect(updatedDonation?.stripeSubscriptionId).toBe(subscription.id);
      expect(updatedDonation?.subscriptionStatus).toBe('active');
    });
  });

  describe('Webhook Processing', () => {
    it('should handle payment intent succeeded webhook', async () => {
      // Create a donation first
      const donationData = {
        type: 'zakaat',
        amount: 75.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Webhook Test',
        donorEmail: 'webhook@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // Create payment intent
      await request(app)
        .post('/api/create-payment-intent')
        .send({
          amount: donation.amount,
          currency: donation.currency,
          donationId: donation.id
        })
        .expect(200);

      // Get updated donation with payment intent ID
      const processingDonation = await storage.getDonation(donation.id);
      const paymentIntentId = processingDonation?.stripePaymentId?.split('|')[0];

      // Simulate payment succeeded webhook
      const paymentIntent = createMockPaymentIntent({
        id: paymentIntentId,
        metadata: { donationId: donation.id.toString() }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Verify donation was completed
      const completedDonation = await storage.getDonation(donation.id);
      expect(completedDonation?.status).toBe('completed');
    });

    it('should handle payment intent failed webhook', async () => {
      // Similar setup to success test
      const donationData = {
        type: 'sadqah',
        amount: 30.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Failed Test',
        donorEmail: 'failed@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      await request(app)
        .post('/api/create-payment-intent')
        .send({
          amount: donation.amount,
          currency: donation.currency,
          donationId: donation.id
        })
        .expect(200);

      const processingDonation = await storage.getDonation(donation.id);
      const paymentIntentId = processingDonation?.stripePaymentId?.split('|')[0];

      // Simulate payment failed webhook
      const paymentIntent = createMockPaymentIntent({
        id: paymentIntentId,
        status: 'failed',
        metadata: { donationId: donation.id.toString() }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.payment_failed', paymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Verify donation was marked as failed
      const failedDonation = await storage.getDonation(donation.id);
      expect(failedDonation?.status).toBe('failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing donation for webhook', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_nonexistent_payment',
        metadata: { donationId: '99999' }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      // Should not fail, but should log the missing donation
      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);
    });

    it('should validate donation data before creation', async () => {
      const invalidDonationData = {
        type: 'invalid_type',
        amount: -10, // Invalid negative amount
        currency: 'INVALID',
        frequency: 'invalid_frequency'
      };

      await request(app)
        .post('/api/donations')
        .send(invalidDonationData)
        .expect(400);
    });

    it('should handle payment intent creation errors', async () => {
      await request(app)
        .post('/api/create-payment-intent')
        .send({
          amount: 0, // Invalid amount
          currency: 'INVALID',
          donationId: 99999 // Non-existent donation
        })
        .expect(400);
    });
  });
});