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
import { insertDonationSchema, insertCaseSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
}) : undefined;

// Currency conversion API
const exchangeRateUrl = "https://open.er-api.com/v6/latest/USD";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
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

  // Get user's currency based on IP
  app.get("/api/currency-by-ip", async (req, res) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      // Use IP-based geolocation service
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json() as any;
      res.json({ currency: data.currency || 'USD' });
    } catch (error) {
      // Default to USD if there's an error
      res.json({ currency: 'USD' });
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
      });

      // Update donation with payment intent ID
      if (donationId) {
        await storage.updateDonationStatus(donationId, "processing", paymentIntent.id);
      }

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
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
  
  // Admin middleware to check if admin is authenticated
  const isAdminAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.adminAuthenticated) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };
  
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
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (endpointSecret) {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      } else {
        event = payload;
      }

      // Handle the event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        // Find the donation by Stripe payment ID and update its status
        const donations = await storage.getDonations();
        const donation = donations.find(d => d.stripePaymentId === paymentIntent.id);
        
        if (donation) {
          await storage.updateDonationStatus(donation.id, "completed");
          
          // If donation is for a specific case, update the case's amount collected
          if (donation.caseId) {
            await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
