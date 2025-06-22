/**
 * Enhanced webhook handlers with improved payment matching and error handling
 * Addresses payment synchronization issues between Stripe and database
 */

import { storage } from './storage';
import type { Donation } from '@shared/schema';

// New Relic integration
const newrelic = require('newrelic');

// Enhanced logging for webhook events with New Relic integration
const logWebhookEvent = (event: string, details: any) => {
  const logMessage = `[WEBHOOK-${event.toUpperCase()}]`;
  console.log(logMessage, JSON.stringify(details, null, 2));
  
  // Send custom event to New Relic
  newrelic.recordCustomEvent('WebhookEvent', {
    eventType: event.toUpperCase(),
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Special logging for orphaned payments with high priority in New Relic
const logOrphanedPayment = (paymentIntent: any) => {
  const orphanedDetails = {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency.toUpperCase(),
    status: paymentIntent.status,
    created: new Date(paymentIntent.created * 1000).toISOString(),
    metadata: paymentIntent.metadata,
    description: paymentIntent.description,
    severity: 'HIGH'
  };

  // Console logging
  console.log('[WEBHOOK-ORPHANED_PAYMENT]', JSON.stringify(orphanedDetails, null, 2));
  
  // New Relic custom event with high priority
  newrelic.recordCustomEvent('OrphanedPayment', {
    ...orphanedDetails,
    alertLevel: 'CRITICAL',
    requiresInvestigation: true,
    timestamp: new Date().toISOString()
  });

  // Also record as an error for alerting
  newrelic.noticeError(new Error('Orphaned payment detected'), {
    customAttributes: orphanedDetails
  });
};

// Enhanced payment intent matching with multiple fallback strategies
const findDonationByPaymentIntent = async (paymentIntent: any): Promise<Donation | null> => {
  const donations = await storage.getDonations();
  
  // Strategy 1: Direct payment intent ID match
  let donation = donations.find(d => d.stripePaymentId === paymentIntent.id);
  if (donation) {
    logWebhookEvent('MATCH_FOUND', { strategy: 'direct_id', donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }

  // Strategy 2: Combined ID format match (current format)
  donation = donations.find(d => d.stripePaymentId === `${paymentIntent.id}|${paymentIntent.client_secret}`);
  if (donation) {
    logWebhookEvent('MATCH_FOUND', { strategy: 'combined_format', donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }

  // Strategy 3: Partial ID match (in case of format inconsistencies)
  donation = donations.find(d => d.stripePaymentId && d.stripePaymentId.includes(paymentIntent.id));
  if (donation) {
    logWebhookEvent('MATCH_FOUND', { strategy: 'partial_match', donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }

  // Strategy 4: Metadata donation ID match
  if (paymentIntent.metadata && paymentIntent.metadata.donationId) {
    const donationId = parseInt(paymentIntent.metadata.donationId);
    donation = await storage.getDonation(donationId);
    if (donation) {
      logWebhookEvent('MATCH_FOUND', { strategy: 'metadata', donationId: donation.id, paymentIntentId: paymentIntent.id });
      return donation;
    }
  }

  // Strategy 5: Amount and timestamp proximity match (last resort)
  const paymentAmount = paymentIntent.amount / 100; // Convert from cents
  const paymentTime = new Date(paymentIntent.created * 1000);
  const timeWindow = 10 * 60 * 1000; // 10 minutes

  donation = donations.find(d => {
    const amountMatch = Math.abs(d.amount - paymentAmount) < 0.01; // Within 1 cent
    const timeMatch = Math.abs(new Date(d.createdAt).getTime() - paymentTime.getTime()) < timeWindow;
    const statusMatch = d.status === 'processing' || d.status === 'pending';
    
    return amountMatch && timeMatch && statusMatch;
  });

  if (donation) {
    logWebhookEvent('MATCH_FOUND', { 
      strategy: 'amount_time_proximity', 
      donationId: donation.id, 
      paymentIntentId: paymentIntent.id,
      amountMatch: paymentAmount,
      timeMatch: paymentTime
    });
    return donation;
  }

  // No match found - log for investigation
  logWebhookEvent('NO_MATCH_FOUND', {
    paymentIntentId: paymentIntent.id,
    amount: paymentAmount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    metadata: paymentIntent.metadata,
    totalDonations: donations.length,
    processingDonations: donations.filter(d => d.status === 'processing').length
  });

  return null;
};

// Enhanced payment intent succeeded handler
export const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
  logWebhookEvent('PAYMENT_INTENT_SUCCEEDED', { id: paymentIntent.id, amount: paymentIntent.amount });
  
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    
    if (donation) {
      // Check if already completed to prevent duplicate processing
      if (donation.status === 'completed') {
        logWebhookEvent('ALREADY_COMPLETED', { donationId: donation.id, paymentIntentId: paymentIntent.id });
        return;
      }

      // Update donation status to completed
      const updatedDonation = await storage.updateDonationStatus(donation.id, "completed", paymentIntent.id);
      
      if (updatedDonation) {
        logWebhookEvent('DONATION_COMPLETED', { 
          donationId: donation.id, 
          paymentIntentId: paymentIntent.id,
          amount: donation.amount,
          currency: donation.currency
        });

        // Update case amount if donation is for a specific case
        if (donation.caseId) {
          try {
            await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
            logWebhookEvent('CASE_AMOUNT_UPDATED', { caseId: donation.caseId, amount: donation.amount });
          } catch (caseError: any) {
            logWebhookEvent('CASE_UPDATE_ERROR', { caseId: donation.caseId, error: caseError.message });
          }
        }
      } else {
        logWebhookEvent('DONATION_UPDATE_FAILED', { donationId: donation.id, paymentIntentId: paymentIntent.id });
      }
    } else {
      // Log orphaned payment with high priority for New Relic alerting
      logOrphanedPayment(paymentIntent);
    }
  } catch (error: any) {
    logWebhookEvent('HANDLER_ERROR', { 
      paymentIntentId: paymentIntent.id, 
      error: error.message,
      stack: error.stack
    });
  }
};

// Enhanced payment intent failed handler
export const handlePaymentIntentFailed = async (paymentIntent: any) => {
  logWebhookEvent('PAYMENT_INTENT_FAILED', { id: paymentIntent.id, amount: paymentIntent.amount });
  
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    
    if (donation) {
      // Only update if not already failed
      if (donation.status !== 'failed') {
        await storage.updateDonationStatus(donation.id, "failed", paymentIntent.id);
        logWebhookEvent('DONATION_FAILED', { donationId: donation.id, paymentIntentId: paymentIntent.id });
      }
    } else {
      logWebhookEvent('FAILED_PAYMENT_NO_DONATION', { paymentIntentId: paymentIntent.id });
    }
  } catch (error: any) {
    logWebhookEvent('FAILURE_HANDLER_ERROR', { 
      paymentIntentId: paymentIntent.id, 
      error: error.message 
    });
  }
};

// Enhanced checkout session completed handler
export const handleCheckoutSessionCompleted = async (session: any) => {
  logWebhookEvent('CHECKOUT_SESSION_COMPLETED', { sessionId: session.id, paymentIntent: session.payment_intent });
  
  try {
    if (session.payment_intent) {
      // For checkout sessions, we need to get the payment intent and process it
      // This is a fallback in case the payment_intent.succeeded webhook doesn't fire
      const paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id;
        
      // Create a mock payment intent object for processing
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: session.amount_total,
        currency: session.currency,
        status: 'succeeded',
        metadata: session.metadata || {}
      };
      
      await handlePaymentIntentSucceeded(mockPaymentIntent);
    }
  } catch (error: any) {
    logWebhookEvent('CHECKOUT_HANDLER_ERROR', { 
      sessionId: session.id, 
      error: error.message 
    });
  }
};

// Enhanced subscription handlers
export const handleSubscriptionCreated = async (subscription: any) => {
  logWebhookEvent('SUBSCRIPTION_CREATED', { subscriptionId: subscription.id });
  
  try {
    let donation;
    
    // Find donation by metadata first
    if (subscription.metadata && subscription.metadata.donationId) {
      const donationId = parseInt(subscription.metadata.donationId);
      donation = await storage.getDonation(donationId);
    }
    
    // Fallback: find by subscription ID
    if (!donation) {
      const donations = await storage.getDonations();
      donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
    }
    
    if (donation) {
      await storage.updateDonationSubscription(
        donation.id,
        'stripe',
        subscription.id,
        subscription.status,
        new Date((subscription.current_period_end || 0) * 1000)
      );
      
      logWebhookEvent('SUBSCRIPTION_UPDATED', { 
        donationId: donation.id, 
        subscriptionId: subscription.id,
        status: subscription.status
      });
    } else {
      logWebhookEvent('SUBSCRIPTION_NO_DONATION', { subscriptionId: subscription.id });
    }
  } catch (error: any) {
    logWebhookEvent('SUBSCRIPTION_HANDLER_ERROR', { 
      subscriptionId: subscription.id, 
      error: error.message 
    });
  }
};

export const handleSubscriptionUpdated = async (subscription: any) => {
  logWebhookEvent('SUBSCRIPTION_UPDATED', { subscriptionId: subscription.id, status: subscription.status });
  
  try {
    const donations = await storage.getDonations();
    const donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
    
    if (donation) {
      await storage.updateDonationSubscription(
        donation.id,
        'stripe',
        subscription.id,
        subscription.status,
        new Date((subscription.current_period_end || 0) * 1000)
      );
      
      logWebhookEvent('SUBSCRIPTION_STATUS_UPDATED', { 
        donationId: donation.id,
        subscriptionId: subscription.id,
        newStatus: subscription.status
      });
    }
  } catch (error: any) {
    logWebhookEvent('SUBSCRIPTION_UPDATE_ERROR', { 
      subscriptionId: subscription.id, 
      error: error.message 
    });
  }
};

export const handleSubscriptionCancelled = async (subscription: any) => {
  logWebhookEvent('SUBSCRIPTION_CANCELLED', { subscriptionId: subscription.id });
  
  try {
    const donations = await storage.getDonations();
    const donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
    
    if (donation) {
      await storage.updateDonationSubscription(
        donation.id,
        'stripe',
        subscription.id,
        'cancelled',
        null
      );
      
      logWebhookEvent('SUBSCRIPTION_CANCELLED_UPDATED', { 
        donationId: donation.id,
        subscriptionId: subscription.id
      });
    }
  } catch (error: any) {
    logWebhookEvent('SUBSCRIPTION_CANCEL_ERROR', { 
      subscriptionId: subscription.id, 
      error: error.message 
    });
  }
};

// Invoice payment handlers
export const handleInvoicePaymentSucceeded = async (invoice: any) => {
  logWebhookEvent('INVOICE_PAYMENT_SUCCEEDED', { 
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    amount: invoice.amount_paid
  });
  
  try {
    if (invoice.subscription) {
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === invoice.subscription);
      
      if (donation) {
        // For recurring payments, we might want to create a new donation record
        // or update the existing one - this depends on your business logic
        logWebhookEvent('RECURRING_PAYMENT_PROCESSED', {
          donationId: donation.id,
          invoiceId: invoice.id,
          amount: invoice.amount_paid / 100
        });
        
        // Update case amount if applicable
        if (donation.caseId) {
          await storage.updateCaseAmountCollected(donation.caseId, invoice.amount_paid / 100);
        }
      }
    }
  } catch (error: any) {
    logWebhookEvent('INVOICE_HANDLER_ERROR', { 
      invoiceId: invoice.id, 
      error: error.message 
    });
  }
};

export const handleInvoicePaymentFailed = async (invoice: any) => {
  logWebhookEvent('INVOICE_PAYMENT_FAILED', { 
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription 
  });
  
  try {
    if (invoice.subscription) {
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === invoice.subscription);
      
      if (donation) {
        logWebhookEvent('RECURRING_PAYMENT_FAILED', {
          donationId: donation.id,
          invoiceId: invoice.id
        });
        
        // You might want to notify the donor or take other action
      }
    }
  } catch (error: any) {
    logWebhookEvent('INVOICE_FAILURE_HANDLER_ERROR', { 
      invoiceId: invoice.id, 
      error: error.message 
    });
  }
};