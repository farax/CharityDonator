import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Stripe from "stripe";
import fetch from "node-fetch";
import { insertDonationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Initialize Stripe with the secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
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
      const data = await response.json();
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
      const data = await response.json();
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
