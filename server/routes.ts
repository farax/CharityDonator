import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";

// Add type declaration for session
declare module 'express-session' {
  interface SessionData {
    adminAuthenticated?: boolean;
  }
}
import { storage } from "./storage";
import Stripe from "stripe";
import fetch from "node-fetch";
import { insertDonationSchema, insertCaseSchema, contactFormSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import config from "./config";

// Initialize Stripe with the secret key
const stripe = config.STRIPE.SECRET_KEY 
  ? new Stripe(config.STRIPE.SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
      appInfo: {
        name: "Aafiyaa Charity Clinics", 
        version: "1.0.0",
        url: "https://aafiyaa.com",
        partner_id: "Aafiyaa Ltd."
      }
    }) 
  : undefined;

// Currency conversion API
const exchangeRateUrl = "https://open.er-api.com/v6/latest/USD";

// PayPal API configuration
const PAYPAL_API_BASE = config.IS_PRODUCTION
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

const getPayPalAccessToken = async () => {
  if (!config.PAYPAL.CLIENT_ID || !config.PAYPAL.SECRET_KEY) {
    throw new Error('PayPal credentials are missing');
  }

  const auth = Buffer.from(`${config.PAYPAL.CLIENT_ID}:${config.PAYPAL.SECRET_KEY}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json() as any;
  return data.access_token;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin middleware to check if admin is authenticated
  const isAdminAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.adminAuthenticated === true) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
  
  // API routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  
  // Update stats - protected by admin authentication
  app.post("/api/admin/update-stats", isAdminAuthenticated, async (req, res) => {
    try {
      const { totalPatients, monthlyPatients } = req.body;
      
      // Simple validation to ensure we have positive numbers
      if (typeof totalPatients !== 'number' || typeof monthlyPatients !== 'number') {
        return res.status(400).json({ message: "Patient counts must be numbers" });
      }
      
      if (totalPatients < 0 || monthlyPatients < 0) {
        return res.status(400).json({ message: "Patient counts cannot be negative" });
      }
      
      const updatedStats = await storage.updateStats({ 
        totalPatients, 
        monthlyPatients 
      });
      
      res.json(updatedStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to update stats" });
    }
  });

  app.get("/api/endorsements", async (req, res) => {
    try {
      const endorsements = await storage.getEndorsements();
      res.json(endorsements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch endorsements" });
    }
  });

  // Currency conversion API
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const response = await fetch(exchangeRateUrl);
      const data = await response.json() as any;
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });
  
  // Contact form API endpoints
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = contactFormSchema.parse(req.body);
      const savedMessage = await storage.createContactMessage(contactData);
      
      // In a production app, you would send an email notification here
      // using a service like SendGrid or similar
      console.log('Contact form submission:', savedMessage);
      
      res.status(201).json({ 
        success: true, 
        messageId: savedMessage.id,
        message: "Thank you for your message. We'll get back to you soon!" 
      });
    } catch (error) {
      console.error('Contact form error:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ 
          success: false, 
          message: validationError.message 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to submit contact form" 
        });
      }
    }
  });
  
  // Get all contact messages (protected by admin auth)
  app.get("/api/contact-messages", isAdminAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve contact messages" });
    }
  });
  
  // Mark contact message as read (protected by admin auth)
  app.post("/api/contact-messages/:id/read", isAdminAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.markContactMessageAsRead(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Get user's currency based on IP
  app.get("/api/currency-by-ip", async (req, res) => {
    try {
      // Since Stripe account is registered in Australia, default to AUD
      // For testing purposes, we'll hardcode this to AUD
      res.json({ currency: 'AUD' });
    } catch (error) {
      // Default to AUD if there's an error
      res.json({ currency: 'AUD' });
    }
  });

  // Create a donation
  app.post("/api/donations", async (req, res) => {
    try {
      const donationData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(donationData);
      res.status(201).json(donation);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create donation" });
      }
    }
  });
  
  // Update donation status
  app.post("/api/update-donation-status", async (req, res) => {
    try {
      const { donationId, status, paymentMethod, paymentId } = req.body;
      
      if (!donationId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const payment_id = paymentId || `${paymentMethod}_${Date.now()}`;
      const donation = await storage.updateDonationStatus(donationId, status, payment_id);
      
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.status(200).json({ success: true, donation });
    } catch (error) {
      res.status(500).json({ message: "Failed to update donation status" });
    }
  });
  
  // PayPal verification endpoint
  app.post("/api/paypal/verify-payment", async (req, res) => {
    try {
      const { orderId, donationId } = req.body;
      
      if (!orderId || !donationId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!config.PAYPAL.CLIENT_ID || !config.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ message: "PayPal is not properly configured" });
      }
      
      try {
        // Get access token
        const accessToken = await getPayPalAccessToken();
        
        // Verify order with PayPal
        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const orderData = await response.json() as any;
        
        // Check order status
        if (orderData.status === 'COMPLETED') {
          // Update donation status to completed
          const donation = await storage.updateDonationStatus(
            donationId, 
            "completed", 
            `paypal_${orderId}`
          );
          
          return res.status(200).json({ 
            success: true, 
            verified: true,
            status: orderData.status,
            donation 
          });
        } else {
          // Order is not completed
          return res.status(200).json({ 
            success: true, 
            verified: false,
            status: orderData.status,
            message: "Payment not completed"
          });
        }
      } catch (error: any) {
        console.error('PayPal verification error:', error);
        return res.status(500).json({ 
          success: false, 
          message: `PayPal verification failed: ${error.message}` 
        });
      }
    } catch (error: any) {
      console.error('PayPal API error:', error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to verify PayPal payment: ${error.message}` 
      });
    }
  });
  
  // Update donor information
  app.post("/api/update-donation-donor", async (req, res) => {
    try {
      const { donationId, name, email } = req.body;
      
      if (!donationId || !name || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const donation = await storage.updateDonationDonor(donationId, name, email);
      
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.status(200).json({ success: true, donation });
    } catch (error) {
      res.status(500).json({ message: "Failed to update donor information" });
    }
  });

  // Stripe payment intent creation
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    try {
      const { amount, currency, donationId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method_types: ['card'], // Limit to card payments only
        description: 'Donation to Aafiyaa Ltd.', // Set company name in payment authorization text
        statement_descriptor: 'AAFIYAA DONATION', // Text on credit card statement (max 22 chars)
        metadata: {
          donationId: donationId ? donationId.toString() : undefined
        }
      });

      // Update donation with payment intent ID
      if (donationId) {
        console.log(`Creating payment intent for donation ${donationId}: ${paymentIntent.id}`);
        // Store both the payment intent ID and client secret to increase chances of matching
        // in the webhook handler
        await storage.updateDonationStatus(
          donationId, 
          "processing", 
          `${paymentIntent.id}|${paymentIntent.client_secret}`
        );
      }

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating payment intent:', error.message);
      res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
    }
  });
  
  // Create a SetupIntent for subscription payment method collection
  app.post('/api/create-setup-intent', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    
    try {
      const { donationId } = req.body;
      
      if (!donationId) {
        return res.status(400).json({ message: 'Donation ID is required' });
      }
      
      const donation = await storage.getDonation(Number(donationId));
      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' });
      }
      
      // Create a SetupIntent to collect payment method for future subscription charges
      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'], // Limit to card payments only
        usage: 'off_session', // Allow using this payment method for future off-session charges
        description: 'Recurring donation to Aafiyaa Ltd.', // Set the company name in authorization text
        metadata: {
          donationId: donationId.toString(),
          isSubscription: 'true',
          company_name: 'Aafiyaa Ltd.'
        }
      });
      
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating setup intent:', error.message);
      res.status(500).json({ message: `Error creating setup intent: ${error.message}` });
    }
  });
  
  // Create a subscription with Stripe 
  app.post('/api/create-subscription', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    
    try {
      const { 
        donationId, 
        amount, 
        currency = 'AUD',
        email, 
        name,
        paymentMethodId, 
        frequency = 'monthly' 
      } = req.body;
      
      if (!donationId || !amount || !email || !paymentMethodId) {
        return res.status(400).json({ 
          message: 'Donation ID, amount, email, and payment method ID are required' 
        });
      }
      
      const donation = await storage.getDonation(Number(donationId));
      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' });
      }
      
      // Convert amount to cents and determine billing interval
      const amountInCents = Math.round(amount * 100);
      const billingInterval = frequency === 'weekly' ? 'week' : 'month';
      
      // Step 1: Find or create customer
      let user = await storage.getUserByEmail(email);
      let stripeCustomerId = null;
      
      if (user && user.stripeCustomerId) {
        stripeCustomerId = user.stripeCustomerId;
      } else {
        // Create a new customer in Stripe
        const customer = await stripe.customers.create({
          email,
          name,
          payment_method: paymentMethodId,
          description: 'Aafiyaa Ltd. donor',
          invoice_settings: {
            default_payment_method: paymentMethodId,
            custom_fields: null,
            footer: 'Aafiyaa Ltd. - Helping those in need'
          },
          metadata: {
            company_name: 'Aafiyaa Ltd.'
          }
        });
        
        stripeCustomerId = customer.id;
        
        // If user exists, update their Stripe customer ID
        if (user) {
          user = await storage.updateUserPaymentInfo(user.id, stripeCustomerId);
        } else {
          // Create a new user with this email
          user = await storage.createUser({
            username: email.split('@')[0] + Math.floor(Math.random() * 10000),
            password: Math.random().toString(36).substring(2, 15),
            email
          });
          await storage.updateUserPaymentInfo(user.id, stripeCustomerId);
        }
        
        // Link user to donation
        if (user) {
          await storage.updateDonationStatus(
            donation.id, 
            'processing', 
            null
          );
        }
      }
      
      // Step 2: Create a price for this donation amount
      const price = await stripe.prices.create({
        unit_amount: amountInCents,
        currency: currency.toLowerCase(),
        recurring: {
          interval: billingInterval,
        },
        product_data: {
          name: `${donation.type} Donation (${frequency})`,
          description: donation.destinationProject || 'Aafiyaa Charity Clinics',
        },
      });
      
      // Step 3: Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        },
        // Show correct company name in payment confirmation
        payment_behavior: 'default_incomplete',
        application_fee_percent: 0,
        description: 'Recurring donation to Aafiyaa Ltd.',
        metadata: {
          donationId: donationId.toString(),
          donationType: donation.type,
          currency,
          amount: amount.toString(),
          userId: user ? user.id.toString() : undefined
        }
      });
      
      console.log(`Created subscription ${subscription.id} for donation ${donationId}`);
      
      // Step 4: Update the donation with subscription details
      await storage.updateDonationSubscription(
        donation.id,
        'stripe',
        subscription.id,
        subscription.status,
        new Date(subscription.current_period_end * 1000) // Convert UNIX timestamp to Date
      );
      
      // Also link the user
      if (user && user.id && !donation.userId) {
        // This is a temporary solution - in a production app we would have a separate endpoint
        // to update the userId field directly
        const updatedDonation = await storage.getDonation(Number(donationId));
        
        if (updatedDonation) {
          // We only have updateDonationStatus method to update fields, so we're using it to link user
          await storage.updateDonationStatus(
            donation.id,
            updatedDonation.status,
            updatedDonation.stripePaymentId
          );
        }
      }
      
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        nextPaymentDate: new Date(subscription.current_period_end * 1000),
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error.message);
      res.status(500).json({ message: `Error creating subscription: ${error.message}` });
    }
  });

  // Case management routes
  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get("/api/active-zakaat-cases", async (req, res) => {
    try {
      const cases = await storage.getActiveZakaatCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active zakaat cases" });
    }
  });
  
  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const isValid = await storage.validateAdminCredentials(username, password);
      
      if (isValid) {
        // Create a session for the admin
        req.session.adminAuthenticated = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/admin/logout", (req, res) => {
    req.session.adminAuthenticated = false;
    res.json({ success: true });
  });
  
  // Get payment history (all donations with their status) - protected
  app.get("/api/payment-history", isAdminAuthenticated, async (req, res) => {
    try {
      const donations = await storage.getDonations();
      res.json(donations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });
  
  // Get payment statistics grouped by status, type, and payment method - protected
  app.get("/api/payment-statistics", isAdminAuthenticated, async (req, res) => {
    try {
      const donations = await storage.getDonations();
      
      // Group donations by status
      const byStatus = donations.reduce((acc, donation) => {
        const status = donation.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group donations by type
      const byType = donations.reduce((acc, donation) => {
        const type = donation.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group donations by payment method
      const byPaymentMethod = donations.reduce((acc, donation) => {
        const method = donation.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate total amount donated (only for completed donations)
      const totalDonated = donations
        .filter(d => d.status === 'completed')
        .reduce((sum, donation) => sum + donation.amount, 0);
        
      // Group completed donations by destination
      const byDestination = donations
        .filter(d => d.status === 'completed')
        .reduce((acc, donation) => {
          let destination = 'unknown';
          if (donation.caseId) {
            destination = `Case ID: ${donation.caseId}`;
          } else if (donation.destinationProject) {
            destination = donation.destinationProject;
          }
          acc[destination] = (acc[destination] || 0) + donation.amount;
          return acc;
        }, {} as Record<string, number>);
        
      res.json({
        totalDonations: donations.length,
        totalDonated,
        byStatus,
        byType,
        byPaymentMethod,
        byDestination
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment statistics" });
    }
  });

  app.get("/api/cases/:id", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const caseItem = await storage.getCase(caseId);
      
      if (!caseItem) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(caseItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const caseData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(caseData);
      res.status(201).json(newCase);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create case" });
      }
    }
  });

  // Update amount collected for a case
  app.patch("/api/cases/:id/amount-collected", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const { additionalAmount } = req.body;
      
      if (typeof additionalAmount !== 'number' || additionalAmount <= 0) {
        return res.status(400).json({ message: "Additional amount must be a positive number" });
      }
      
      const updatedCase = await storage.updateCaseAmountCollected(caseId, additionalAmount);
      
      if (!updatedCase) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: "Failed to update case amount" });
    }
  });

  // Webhook for Stripe events
  app.post("/api/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    const payload = req.body;
    const sig = req.headers['stripe-signature'] as string;

    let event;

    try {
      // Verify the webhook signature
      // This helps ensure the webhook was sent by Stripe
      const endpointSecret = config.STRIPE.WEBHOOK_SECRET;
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(
          payload, 
          sig, 
          endpointSecret
        );
      } else {
        // In development mode, we might not have a webhook signature
        console.log('No webhook signature, using payload directly (development mode)');
        event = payload;
      }

      console.log(`Webhook received: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          // Unexpected event type
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook Error:', error.message);
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  // Handler for successful payment intents
  const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
    console.log('Payment Intent Succeeded:', paymentIntent.id);
    
    try {
      // Get all donations
      const donations = await storage.getDonations();
      
      // Find donation by multiple possible matching strategies
      const donation = donations.find(d => {
        // Direct match on payment intent ID
        if (d.stripePaymentId === paymentIntent.id) return true;
        
        // Match on client secret
        if (d.stripePaymentId === paymentIntent.client_secret) return true;
        
        // Match on combined format that we're now using
        if (d.stripePaymentId === `${paymentIntent.id}|${paymentIntent.client_secret}`) return true;
        
        // Check if payment ID contains the intent ID (partial match)
        if (d.stripePaymentId && d.stripePaymentId.includes(paymentIntent.id)) return true;
        
        // Match via metadata (we store the donation ID in metadata)
        if (paymentIntent.metadata && paymentIntent.metadata.donationId && 
            d.id === parseInt(paymentIntent.metadata.donationId)) {
          return true;
        }
        
        return false;
      });
      
      if (donation) {
        console.log(`Found donation ID ${donation.id} for payment intent ${paymentIntent.id}`);
        
        // Update donation status to completed
        await storage.updateDonationStatus(donation.id, "completed", paymentIntent.id);
        
        // If donation is for a specific case, update the case's amount collected
        if (donation.caseId) {
          await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
        }
        
        console.log(`Donation ${donation.id} marked as completed and amount collected updated`);
      } else {
        console.warn(`No donation found for payment intent ${paymentIntent.id}`);
        
        // Additional diagnostic info
        console.log('Available donations:', donations.map(d => ({
          id: d.id,
          status: d.status,
          stripePaymentId: d.stripePaymentId
        })));
      }
    } catch (error: any) {
      console.error('Error handling payment intent succeeded:', error.message);
    }
  };

  // Handler for failed payment intents
  const handlePaymentIntentFailed = async (paymentIntent: any) => {
    console.log('Payment Intent Failed:', paymentIntent.id);
    
    try {
      // Get all donations
      const donations = await storage.getDonations();
      
      // Find donation by multiple possible matching strategies (same as success handler)
      const donation = donations.find(d => {
        // Direct match on payment intent ID
        if (d.stripePaymentId === paymentIntent.id) return true;
        
        // Match on client secret
        if (d.stripePaymentId === paymentIntent.client_secret) return true;
        
        // Match on combined format that we're now using
        if (d.stripePaymentId === `${paymentIntent.id}|${paymentIntent.client_secret}`) return true;
        
        // Check if payment ID contains the intent ID (partial match)
        if (d.stripePaymentId && d.stripePaymentId.includes(paymentIntent.id)) return true;
        
        // Match via metadata (we store the donation ID in metadata)
        if (paymentIntent.metadata && paymentIntent.metadata.donationId && 
            d.id === parseInt(paymentIntent.metadata.donationId)) {
          return true;
        }
        
        return false;
      });
      
      if (donation) {
        console.log(`Found donation ID ${donation.id} for failed payment intent ${paymentIntent.id}`);
        // Update donation status to failed
        await storage.updateDonationStatus(donation.id, "failed", paymentIntent.id);
        console.log(`Donation ${donation.id} marked as failed`);
      } else {
        console.warn(`No donation found for failed payment intent ${paymentIntent.id}`);
      }
    } catch (error: any) {
      console.error('Error handling payment intent failed:', error.message);
    }
  };

  // Handler for completed checkout sessions
  const handleCheckoutSessionCompleted = async (session: any) => {
    console.log('Checkout Session Completed:', session.id);
    
    try {
      // For checkout sessions, we need to get the payment intent
      if (session.payment_intent && stripe) {
        // Use type assertion to handle the stripe is possibly undefined error
        const stripeInstance = stripe as Stripe;
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(session.payment_intent);
        await handlePaymentIntentSucceeded(paymentIntent);
      } else if (!stripe) {
        console.error('Stripe is not configured');
      }
    } catch (error: any) {
      console.error('Error handling checkout session completed:', error.message);
    }
  };

  // Handler for subscription created events
  const handleSubscriptionCreated = async (subscription: any) => {
    console.log('Subscription Created:', subscription.id);
    
    try {
      // Find the donation by the subscription ID or metadata
      let donation;
      
      if (subscription.metadata && subscription.metadata.donationId) {
        const donationId = parseInt(subscription.metadata.donationId);
        donation = await storage.getDonation(donationId);
      }
      
      if (!donation) {
        // If donation not found by metadata, try finding it by subscription ID
        const donations = await storage.getDonations();
        donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
      }
      
      if (donation) {
        // Update the subscription status
        await storage.updateDonationSubscription(
          donation.id,
          'stripe',
          subscription.id,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1000)
        );
        
        console.log(`Updated donation ${donation.id} with subscription ${subscription.id}`);
      } else {
        console.warn(`No donation found for subscription ${subscription.id}`);
      }
    } catch (error: any) {
      console.error('Error handling subscription created:', error.message);
    }
  };
  
  // Handler for subscription updated events
  const handleSubscriptionUpdated = async (subscription: any) => {
    console.log('Subscription Updated:', subscription.id);
    
    try {
      // Find the donation by subscription ID
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
      
      if (donation) {
        // Update the subscription status
        await storage.updateDonationSubscription(
          donation.id,
          'stripe',
          subscription.id,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1000)
        );
        
        console.log(`Updated donation ${donation.id} subscription status to ${subscription.status}`);
      } else {
        console.warn(`No donation found for subscription ${subscription.id}`);
      }
    } catch (error: any) {
      console.error('Error handling subscription updated:', error.message);
    }
  };
  
  // Handler for subscription cancelled events
  const handleSubscriptionCancelled = async (subscription: any) => {
    console.log('Subscription Cancelled:', subscription.id);
    
    try {
      // Find the donation by subscription ID
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === subscription.id);
      
      if (donation) {
        // Update the donation status to cancelled
        await storage.updateDonationSubscription(
          donation.id,
          'stripe',
          subscription.id,
          'canceled',
          null
        );
        
        console.log(`Marked donation ${donation.id} subscription as cancelled`);
      } else {
        console.warn(`No donation found for cancelled subscription ${subscription.id}`);
      }
    } catch (error: any) {
      console.error('Error handling subscription cancelled:', error.message);
    }
  };
  
  // Handler for successful invoice payments (for subscriptions)
  const handleInvoicePaymentSucceeded = async (invoice: any) => {
    console.log('Invoice Payment Succeeded:', invoice.id);
    
    try {
      if (!invoice.subscription) {
        console.log('No subscription associated with this invoice');
        return;
      }
      
      // Find the donation by subscription ID
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === invoice.subscription);
      
      if (!donation) {
        console.warn(`No donation found for subscription ${invoice.subscription}`);
        return;
      }
      
      // Update the next payment date based on the subscription
      if (stripe) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        
        await storage.updateDonationSubscription(
          donation.id,
          'stripe',
          invoice.subscription,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1000)
        );
        
        // If this is for a case, update the case's amount collected
        if (donation.caseId) {
          // For recurring payments, we assume each payment is for the original amount
          await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
          console.log(`Updated case ${donation.caseId} amount collected by ${donation.amount}`);
        }
        
        console.log(`Updated donation ${donation.id} next payment date`);
      }
    } catch (error: any) {
      console.error('Error handling invoice payment succeeded:', error.message);
    }
  };
  
  // Handler for failed invoice payments (for subscriptions)
  const handleInvoicePaymentFailed = async (invoice: any) => {
    console.log('Invoice Payment Failed:', invoice.id);
    
    try {
      if (!invoice.subscription) {
        console.log('No subscription associated with this invoice');
        return;
      }
      
      // Find the donation by subscription ID
      const donations = await storage.getDonations();
      const donation = donations.find(d => d.stripeSubscriptionId === invoice.subscription);
      
      if (donation) {
        // Update the subscription status to past_due or similar
        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          
          await storage.updateDonationSubscription(
            donation.id,
            'stripe',
            invoice.subscription,
            subscription.status,
            new Date((subscription.current_period_end || 0) * 1000)
          );
          
          console.log(`Updated donation ${donation.id} subscription status to ${subscription.status} due to failed payment`);
        }
      } else {
        console.warn(`No donation found for subscription ${invoice.subscription}`);
      }
    } catch (error: any) {
      console.error('Error handling invoice payment failed:', error.message);
    }
  };

  const httpServer = createServer(app);

  return httpServer;
}