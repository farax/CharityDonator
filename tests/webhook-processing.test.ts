import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { storage } from '../server/storage';
import { TEST_CONFIG, createMockWebhookEvent, createMockPaymentIntent } from './setup';
import { registerRoutes } from '../server/routes';

describe('Enhanced Webhook Processing', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: 'application/json' }));
    server = await registerRoutes(app);
  });

  describe('Payment Intent Matching Strategies', () => {
    it('should match payment intent by direct ID', async () => {
      // Create donation with specific payment intent ID
      const donationData = {
        type: 'sadqah',
        amount: 25.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Test Donor',
        donorEmail: 'test@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // Update donation with payment intent ID (set as stripePaymentId for direct matching)
      await storage.updateDonationStatus(donation.id, 'processing', 'pi_test_direct_match');

      // Simulate webhook with direct ID match
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test_direct_match',
        amount: 2500
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

    it('should match payment intent by metadata donation ID', async () => {
      // Create donation
      const donationData = {
        type: 'zakaat',
        amount: 50.00,
        currency: 'USD',
        frequency: 'one-off',
        donorName: 'Metadata Test',
        donorEmail: 'metadata@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // Set donation to processing state first for proper matching
      await storage.updateDonationStatus(donation.id, 'processing', 'pi_test_metadata_match');

      // Simulate webhook with metadata match
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test_metadata_match',
        amount: 5000,
        currency: 'usd',
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

    it('should handle orphaned payments gracefully', async () => {
      // Simulate webhook for payment with no matching donation
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test_orphaned_payment',
        amount: 1000,
        metadata: { donationId: '99999' } // Non-existent donation
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      // Should not fail, just log the orphaned payment
      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);
    });
  });

  describe('Payment Retry Scenarios', () => {
    it('should handle multiple payment attempts for same donation', async () => {
      // Create donation
      const donationData = {
        type: 'sadqah',
        amount: 75.00,
        currency: 'EUR',
        frequency: 'one-off',
        donorName: 'Retry Test',
        donorEmail: 'retry@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // First attempt fails
      const failedPaymentIntent = createMockPaymentIntent({
        id: 'pi_test_failed_attempt',
        amount: 7500,
        currency: 'eur',
        status: 'failed',
        metadata: { donationId: donation.id.toString() }
      });

      const failedWebhook = createMockWebhookEvent('payment_intent.payment_failed', failedPaymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(failedWebhook)
        .expect(200);

      // Verify donation marked as failed
      let updatedDonation = await storage.getDonation(donation.id);
      console.log(`[TEST-DEBUG] After webhook, donation ${donation.id} status: ${updatedDonation?.status}`);
      expect(updatedDonation?.status).toBe('failed');

      // Second attempt succeeds
      const successPaymentIntent = createMockPaymentIntent({
        id: 'pi_test_success_attempt',
        amount: 7500,
        currency: 'eur',
        status: 'succeeded',
        metadata: { donationId: donation.id.toString() }
      });

      const successWebhook = createMockWebhookEvent('payment_intent.succeeded', successPaymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(successWebhook)
        .expect(200);

      // Verify donation completed
      updatedDonation = await storage.getDonation(donation.id);
      expect(updatedDonation?.status).toBe('completed');
    });
  });

  describe('Subscription Processing', () => {
    it('should create and process subscription webhooks', async () => {
      // Create subscription donation
      const subscriptionData = {
        type: 'sadqah',
        amount: 100.00,
        currency: 'GBP',
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
        id: 'sub_test_monthly',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        metadata: { donationId: donation.id.toString() }
      };

      const subscriptionWebhook = createMockWebhookEvent('customer.subscription.created', subscription);

      await request(app)
        .post('/api/webhook')
        .send(subscriptionWebhook)
        .expect(200);

      // Verify subscription was updated
      const updatedDonation = await storage.getDonation(donation.id);
      expect(updatedDonation?.stripeSubscriptionId).toBe(subscription.id);
      expect(updatedDonation?.subscriptionStatus).toBe('active');
    });
  });

  describe('Currency and Amount Validation', () => {
    TEST_CONFIG.currencies.forEach(currency => {
      it(`should process payments in ${currency}`, async () => {
        const donationData = {
          type: 'zakaat',
          amount: 25.50,
          currency,
          frequency: 'one-off',
          donorName: `${currency} Test`,
          donorEmail: `${currency.toLowerCase()}@example.com`
        };

        const donationResponse = await request(app)
          .post('/api/donations')
          .send(donationData)
          .expect(201);

        const donation = donationResponse.body;

        const paymentIntent = createMockPaymentIntent({
          id: `pi_test_${currency.toLowerCase()}`,
          amount: 2550, // 25.50 in cents
          currency: currency.toLowerCase(),
          metadata: { donationId: donation.id.toString() }
        });

        const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

        await request(app)
          .post('/api/webhook')
          .send(webhookEvent)
          .expect(200);

        const completedDonation = await storage.getDonation(donation.id);
        expect(completedDonation?.status).toBe('completed');
        expect(completedDonation?.currency).toBe(currency);
      });
    });

    TEST_CONFIG.amounts.forEach(amount => {
      it(`should handle amount ${amount}`, async () => {
        const donationData = {
          type: 'sadqah',
          amount,
          currency: 'AUD',
          frequency: 'one-off',
          donorName: 'Amount Test',
          donorEmail: 'amount@example.com'
        };

        const donationResponse = await request(app)
          .post('/api/donations')
          .send(donationData)
          .expect(201);

        const donation = donationResponse.body;

        // Set donation to processing state with payment intent ID for direct matching
        const paymentIntentId = `pi_test_amount_${amount.toString().replace('.', '_')}`;
        await storage.updateDonationStatus(donation.id, 'processing', paymentIntentId);

        const paymentIntent = createMockPaymentIntent({
          id: paymentIntentId,
          amount: Math.round(amount * 100), // Convert to cents
          metadata: { donationId: donation.id.toString() }
        });

        const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

        await request(app)
          .post('/api/webhook')
          .send(webhookEvent)
          .expect(200);

        const completedDonation = await storage.getDonation(donation.id);
        expect(completedDonation?.status).toBe('completed');
        expect(completedDonation?.amount).toBe(amount);
      });
    });
  });

  describe('Case Amount Updates', () => {
    it('should update case amount when donation for case is completed', async () => {
      // Create a case first
      const caseData = {
        title: 'Test Medical Case',
        description: 'Test case for webhook processing',
        imageUrl: '/images/test-case.jpg',
        amountRequired: 1000.00,
        active: true
      };

      const caseResponse = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      const testCase = caseResponse.body;

      // Create donation for the case
      const donationData = {
        type: 'zakaat',
        amount: 200.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Case Donor',
        donorEmail: 'case@example.com',
        caseId: testCase.id
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // Process payment
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test_case_payment',
        amount: 20000,
        metadata: { donationId: donation.id.toString() }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Verify donation completed and case amount updated
      const completedDonation = await storage.getDonation(donation.id);
      expect(completedDonation?.status).toBe('completed');

      const updatedCase = await storage.getCase(testCase.id);
      expect(updatedCase?.amountCollected).toBe(200.00);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed webhook data gracefully', async () => {
      const malformedWebhook = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: null, // Invalid ID
            amount: 'invalid', // Invalid amount
            currency: null // Invalid currency
          }
        }
      };

      // Should not crash the server
      await request(app)
        .post('/api/webhook')
        .send(malformedWebhook)
        .expect(200);
    });

    it('should prevent duplicate processing of same payment', async () => {
      const donationData = {
        type: 'sadqah',
        amount: 30.00,
        currency: 'AUD',
        frequency: 'one-off',
        donorName: 'Duplicate Test',
        donorEmail: 'duplicate@example.com'
      };

      const donationResponse = await request(app)
        .post('/api/donations')
        .send(donationData)
        .expect(201);

      const donation = donationResponse.body;

      // Set donation to processing state first
      await storage.updateDonationStatus(donation.id, 'processing', 'pi_test_duplicate');

      const paymentIntent = createMockPaymentIntent({
        id: 'pi_test_duplicate',
        amount: 3000,
        metadata: { donationId: donation.id.toString() }
      });

      const webhookEvent = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);

      // First webhook call
      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Verify donation completed
      let completedDonation = await storage.getDonation(donation.id);
      expect(completedDonation?.status).toBe('completed');

      // Second webhook call (duplicate)
      await request(app)
        .post('/api/webhook')
        .send(webhookEvent)
        .expect(200);

      // Should still be completed, no duplicate processing
      completedDonation = await storage.getDonation(donation.id);
      expect(completedDonation?.status).toBe('completed');
    });
  });
});