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
import { insertDonationSchema, insertCaseSchema, contactFormSchema, ContactMessage } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleCheckoutSessionCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCancelled,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed
} from "./webhook-handlers";
import config from "./config";
import { sendContactFormEmail, verifyEmailService } from "./email-service";
import { generatePDFReceipt, generateReceiptNumber } from './pdf-receipt-service';
import { sendPDFReceipt } from './email-service';

// New Relic integration - safe import with fallback
// New Relic tracking is disabled on server-side to avoid production build issues
// All analytics tracking is handled by the client-side browser agent
let newrelic: any = null;

// Initialize Stripe with the secret key with enhanced logging
let stripe: Stripe | undefined;

try {
  if (config.STRIPE.SECRET_KEY) {
    console.log(`[STRIPE-INIT] Initializing Stripe in ${config.NODE_ENV} mode`);
    console.log(`[STRIPE-INIT] Using key type: ${config.STRIPE.SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
    console.log(`[STRIPE-INIT] API Version: 2025-03-31.basil`);
    
    stripe = new Stripe(config.STRIPE.SECRET_KEY, {
      apiVersion: "2025-03-31.basil",
      appInfo: {
        name: "Aafiyaa Charity Clinics", 
        version: "1.0.0",
        url: "https://aafiyaa.com",
        partner_id: "Aafiyaa Ltd."
      }
    });
    
    console.log(`[STRIPE-INIT] Stripe initialized successfully`);
  } else {
    console.error(`[STRIPE-ERROR] No Stripe secret key found. Stripe functionality will be disabled.`);
    stripe = undefined;
  }
} catch (error) {
  console.error(`[STRIPE-ERROR] Failed to initialize Stripe:`, error);
  stripe = undefined;
}

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
    console.log("Checking admin authentication...");
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    
    if (req.session && req.session.adminAuthenticated === true) {
      console.log("Admin is authenticated, proceeding");
      next();
    } else {
      console.log("Admin is NOT authenticated");
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

  // Download PDF receipt for a specific donation
  app.get("/api/download-receipt/:donationId", async (req, res) => {
    try {
      const donationId = parseInt(req.params.donationId);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ message: "Invalid donation ID" });
      }

      // Get the donation details
      const donation = await storage.getDonation(donationId);
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }

      // Find the receipt for this donation
      const receipts = await storage.getReceiptsByDonationId(donationId);
      const receipt = receipts.find(r => r.filePath && (r.status === 'sent' || r.status === 'generated' || r.status === 'failed'));
      
      if (!receipt || !receipt.filePath) {
        return res.status(404).json({ message: "Receipt not found or not ready yet" });
      }

      // Check if the PDF file exists
      const fs = await import('fs');
      try {
        await fs.promises.access(receipt.filePath);
      } catch (error) {
        return res.status(404).json({ message: "Receipt file not found" });
      }

      // Set appropriate headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="aafiyaa-receipt-${receipt.receiptNumber}.pdf"`);
      
      // Stream the PDF file
      const path = await import('path');
      const absolutePath = path.resolve(receipt.filePath);
      res.sendFile(absolutePath);

    } catch (error) {
      console.error('Error downloading receipt:', error);
      res.status(500).json({ message: "Error downloading receipt" });
    }
  });
  
  // Contact form API endpoints
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = contactFormSchema.parse(req.body);
      const savedMessage = await storage.createContactMessage(contactData);
      
      // Send email notification - don't wait for it to complete
      let emailSent = false;
      try {
        emailSent = await sendContactFormEmail(savedMessage);
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the request if email fails - we've already saved the message
      }
      
      console.log('Contact form submission:', savedMessage);
      console.log('Email notification sent:', emailSent ? 'Yes' : 'No (SMTP not configured or error)');
      
      res.status(201).json({ 
        success: true, 
        messageId: savedMessage.id,
        emailSent,
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

  // Get user's currency based on IP with support for URL parameter testing
  app.get("/api/currency-by-ip", async (req, res) => {
    try {
      // Check if there's a region parameter for testing
      const testRegion = req.query.region as string;
      
      if (testRegion) {
        // Map common regions to currencies for testing
        const regionToCurrency: Record<string, string> = {
          'us': 'USD',
          'uk': 'GBP',
          'eu': 'EUR',
          'jp': 'JPY',
          'in': 'INR',
          'au': 'AUD',
          'ca': 'CAD',
          'ch': 'CHF',
          'cn': 'CNY',
          'hk': 'HKD',
          'pk': 'PKR',
          'sa': 'SAR',
          'ae': 'AED',
          'my': 'MYR',
          'sg': 'SGD',
          'za': 'ZAR'
        };
        
        const currency = regionToCurrency[testRegion.toLowerCase()];
        if (currency) {
          return res.json({ currency, source: 'url-param' });
        }
      }
      
      // If no test parameter or invalid region, use IP-based detection
      try {
        // Use ipapi.co for geolocation (free tier, no API key needed)
        const ipAddress = req.headers['x-forwarded-for'] || 
                         req.socket.remoteAddress || 
                         '8.8.8.8'; // Default to Google DNS if can't determine IP
        
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const ipData = await response.json();
        
        if ((ipData as any).currency && !(ipData as any).error) {
          return res.json({ currency: (ipData as any).currency, source: 'ip-api' });
        }
      } catch (geoError) {
        console.error('Geolocation API error:', geoError);
        // Continue to fallback if geo API fails
      }
      
      // Default to AUD if all else fails
      res.json({ currency: 'AUD', source: 'default' });
    } catch (error) {
      console.error('Currency detection error:', error);
      // Default to AUD if there's an error
      res.json({ currency: 'AUD', source: 'error-fallback' });
    }
  });
  
  // Email service verification endpoint (admin only)
  app.get("/api/admin/verify-email-service", isAdminAuthenticated, async (req, res) => {
    try {
      const isVerified = await verifyEmailService();
      res.json({ 
        success: isVerified,
        message: isVerified 
          ? "Email service is configured and ready to send emails" 
          : "Email service configuration failed or is missing SMTP credentials"
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Email service verification error: ${error.message}` 
      });
    }
  });
  
  // Test email sending endpoint (admin only)
  app.post("/api/admin/test-email", isAdminAuthenticated, async (req, res) => {
    try {
      const { recipientEmail } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: "Recipient email is required"
        });
      }
      
      // Create a test contact message
      const testMessage: ContactMessage = {
        id: 0,
        name: "Admin Test",
        email: recipientEmail,
        subject: "Email System Test",
        message: "This is a test email to verify that the email system is working correctly.",
        createdAt: new Date(),
        isRead: false
      };
      
      // Send the test email
      const emailSent = await sendContactFormEmail(testMessage);
      
      if (emailSent) {
        res.json({
          success: true,
          message: `Test email successfully sent to ${recipientEmail}`
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to send test email. Check SMTP configuration."
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: `Error sending test email: ${error.message}`
      });
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
      const { donationId, status, paymentMethod, paymentId, email, name, firstName, lastName, skipReceipt } = req.body;
      
      console.log(`[UPDATE-DONATION-STATUS] Request data:`, {
        donationId, status, paymentMethod, paymentId, 
        email: email || '(empty)', 
        name: name || '(empty)'
      });
      
      if (!donationId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const payment_id = paymentId || `${paymentMethod}_${Date.now()}`;
      let donation = await storage.updateDonationStatus(donationId, status, payment_id);
      
      // Update email and name if provided
      if (donation && (email || name)) {
        console.log(`[UPDATE-DONATION-STATUS] Updating donor info:`, { 
          donationId, 
          email: email || '(empty)', 
          name: name || '(empty)' 
        });
        const finalFirstName = firstName || (name ? name.split(' ')[0] : '');
        const finalLastName = lastName || (name ? name.split(' ').slice(1).join(' ') : '');
        const finalName = name || `${firstName || ''} ${lastName || ''}`.trim();
        
        donation = await storage.updateDonationDonor(
          donationId, 
          finalName, 
          email || donation.email || '',
          finalFirstName,
          finalLastName
        );
        console.log(`[UPDATE-DONATION-STATUS] Updated donation:`, { 
          id: donation?.id, 
          email: donation?.email || '(empty)', 
          name: donation?.name || '(empty)' 
        });
      }
      
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      // Generate PDF receipt when donation is completed (only if receipt data provided)
      console.log(`[RECEIPT-CHECK] Donation ${donationId} status: ${status}, email: ${donation.email || '(empty)'}, skipReceipt: ${skipReceipt || false}`);
      if (status === 'completed' && !skipReceipt && donation.email && donation.name) {
        try {
          console.log(`[RECEIPT-GENERATION] Starting PDF receipt generation for donation ${donationId}`);
          
          // Generate unique receipt number
          const receiptNumber = generateReceiptNumber();
          
          // Get case title if donation is for a specific case
          let caseTitle = undefined;
          if (donation.caseId) {
            try {
              const caseData = await storage.getCase(donation.caseId);
              caseTitle = caseData?.title;
            } catch (error) {
              console.warn(`Could not retrieve case title for case ${donation.caseId}:`, error);
            }
          }

          // Create receipt record in database
          const receiptData = {
            donationId: donation.id,
            receiptNumber,
            amount: donation.amount,
            currency: donation.currency,
            donorName: donation.name || null,
            donorEmail: donation.email,
            donationType: donation.type,
            caseId: donation.caseId || null,
            status: 'pending' as const
          };

          const receipt = await storage.createReceipt(receiptData);
          console.log(`Receipt record created: ${receipt.id} for donation ${donation.id}`);

          // Generate PDF receipt
          const pdfPath = await generatePDFReceipt({
            donation,
            receiptNumber,
            caseTitle
          });

          // Update receipt status to generated
          await storage.updateReceiptStatus(receipt.id, 'generated', pdfPath);
          console.log(`PDF receipt generated: ${pdfPath}`);

          // Send email with PDF attachment
          const emailSent = await sendPDFReceipt(donation, receiptNumber, pdfPath, caseTitle);
          
          if (emailSent) {
            // Update receipt status to sent
            await storage.updateReceiptSentAt(receipt.id);
            console.log(`PDF receipt emailed successfully to ${donation.email}`);
          } else {
            // Update receipt status to failed
            await storage.updateReceiptStatus(receipt.id, 'failed', pdfPath, 'Email sending failed');
            console.error(`Failed to send PDF receipt email for donation ${donation.id}`);
          }
        } catch (receiptError: any) {
          console.error(`Receipt generation failed for donation ${donationId}:`, receiptError);
          // Don't fail the entire payment process if receipt generation fails
        }
      } else if (status === 'completed' && (skipReceipt || !donation.email || !donation.name)) {
        console.log(`[RECEIPT-SKIP] PDF receipt generation skipped for donation ${donationId} - anonymous donation`);
      }
      
      res.status(200).json({ success: true, donation });
    } catch (error) {
      res.status(500).json({ message: "Failed to update donation status" });
    }
  });
  
  // Update donation amount
  app.post("/api/update-donation-amount", async (req, res) => {
    try {
      const { donationId, amount } = req.body;
      
      if (!donationId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Missing or invalid required fields" });
      }
      
      const updatedDonation = await storage.updateDonationAmount(donationId, amount);
      
      if (!updatedDonation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.status(200).json({ success: true, donation: updatedDonation });
    } catch (error) {
      res.status(500).json({ message: "Failed to update donation amount" });
    }
  });
  
  // PayPal verification endpoint (legacy)
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
          
          // Get the full donation record to check if it's for a case
          const updatedDonation = await storage.getDonation(donationId);
          
          // If donation is for a specific case, update the case's amount collected
          if (updatedDonation && updatedDonation.caseId) {
            await storage.updateCaseAmountCollected(updatedDonation.caseId, updatedDonation.amount);
            console.log(`Updated case ${updatedDonation.caseId} amount collected by ${updatedDonation.amount}`);
          }
          
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
  
  // PayPal SDK integration - Create order endpoint
  app.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { amount, currency, donationId } = req.body;
      
      if (!amount || !currency) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      if (!config.PAYPAL.CLIENT_ID || !config.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ error: "PayPal configuration is missing" });
      }
      
      console.log(`[PAYPAL] Creating order for ${currency} ${amount}`);
      
      try {
        // Get access token
        const accessToken = await getPayPalAccessToken();
        
        // Create order with PayPal
        const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: currency.toUpperCase(),
                  value: amount.toString()
                },
                description: 'Donation to Aafiyaa Charity Clinics'
              }
            ],
            application_context: {
              brand_name: 'Aafiyaa Charity Clinics',
              landing_page: 'BILLING',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW'
            }
          })
        });
        
        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error('[PAYPAL] Error creating order:', errorData);
          return res.status(500).json({ error: "Failed to create PayPal order" });
        }
        
        const orderData = await orderResponse.json() as any;
        console.log('[PAYPAL] Order created:', orderData.id);
        
        // If donationId was provided, update the donation record with PayPal order ID
        if (donationId) {
          await storage.updateDonationStatus(donationId, 'pending', orderData.id);
          console.log(`[PAYPAL] Updated donation ${donationId} with payment ID ${orderData.id}`);
        }
        
        res.status(200).json(orderData);
      } catch (error: any) {
        console.error('[PAYPAL] Error in create-order endpoint:', error);
        res.status(500).json({ error: `PayPal API error: ${error.message}` });
      }
    } catch (error: any) {
      console.error('[PAYPAL] Error processing request:', error);
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  });
  
  // PayPal SDK integration - Capture order endpoint
  app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }
      
      if (!config.PAYPAL.CLIENT_ID || !config.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ error: "PayPal configuration is missing" });
      }
      
      console.log(`[PAYPAL] Capturing order ${orderId}`);
      
      try {
        // Get access token
        const accessToken = await getPayPalAccessToken();
        
        // Capture the order
        const captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!captureResponse.ok) {
          const errorData = await captureResponse.json();
          console.error('[PAYPAL] Error capturing order:', errorData);
          return res.status(500).json({ error: "Failed to capture PayPal order" });
        }
        
        const captureData = await captureResponse.json() as any;
        console.log('[PAYPAL] Order captured successfully:', captureData.id);
        
        // Find the donation associated with this order ID
        const donations = await storage.getDonations();
        const donation = donations.find(d => d.stripePaymentId === orderId);
        
        if (donation) {
          console.log(`[PAYPAL] Found donation ${donation.id} for order ${orderId}`);
          
          // Update donation status to completed
          await storage.updateDonationStatus(donation.id, 'completed');
          
          // If donation has a caseId, update the case's amount collected
          if (donation.caseId) {
            await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
            console.log(`[PAYPAL] Updated case ${donation.caseId} amount collected by ${donation.amount}`);
          }
        } else {
          console.log(`[PAYPAL] No donation found for order ${orderId}`);
        }
        
        res.status(200).json(captureData);
      } catch (error: any) {
        console.error('[PAYPAL] Error in capture-order endpoint:', error);
        res.status(500).json({ error: `PayPal API error: ${error.message}` });
      }
    } catch (error: any) {
      console.error('[PAYPAL] Error processing request:', error);
      res.status(500).json({ error: `Server error: ${error.message}` });
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
  
  // Direct endpoint for client to notify payment success when webhooks might be delayed
  app.post("/api/stripe-payment-success", async (req, res) => {
    try {
      const { donationId, paymentIntentId } = req.body;
      
      if (!donationId) {
        return res.status(400).json({ message: "Missing donation ID" });
      }
      
      console.log(`[STRIPE-CLIENT] Payment success notification for donation ${donationId}`);
      
      // Get the donation record
      const donation = await storage.getDonation(parseInt(donationId));
      
      if (!donation) {
        console.error(`[STRIPE-CLIENT] Donation not found: ${donationId}`);
        return res.status(404).json({ message: "Donation not found" });
      }
      
      // Check if donation needs to be updated
      const wasAlreadyCompleted = donation.status === 'completed';
      
      // Update donation status if not already completed
      if (!wasAlreadyCompleted) {
        await storage.updateDonationStatus(
          donation.id, 
          "completed", 
          paymentIntentId || donation.stripePaymentId
        );
        console.log(`[STRIPE-CLIENT] Updated donation ${donation.id} status to completed`);
        
        // Only update case amount if we're the ones who marked it completed
        // This prevents double-counting with the webhook handler
        if (donation.caseId) {
          await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
          console.log(`[STRIPE-CLIENT] Updated case ${donation.caseId} amount collected by ${donation.amount}`);
        }
      } else {
        console.log(`[STRIPE-CLIENT] Donation ${donation.id} was already completed, skipping case update`);
      }
      
      res.status(200).json({ success: true, message: "Payment success processed" });
    } catch (error: any) {
      console.error('[STRIPE-CLIENT] Error processing payment success:', error.message);
      res.status(500).json({ message: "Failed to process payment success" });
    }
  });

  // Stripe payment intent creation
  app.post("/api/create-payment-intent", async (req, res) => {
    // Enhanced debug logging
    console.log(`[STRIPE-DEBUG] Creating payment intent in ${config.NODE_ENV} mode`);
    console.log(`[STRIPE-DEBUG] Stripe key type: ${config.STRIPE.SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
    
    if (!stripe) {
      console.error("[STRIPE-ERROR] Stripe is not configured");
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    try {
      const { amount, currency, donationId } = req.body;
      console.log(`[STRIPE-DEBUG] Payment request: amount=${amount}, currency=${currency}, donationId=${donationId}`);
      
      // Validate currency and amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!currency) {
        return res.status(400).json({ message: "Currency is required" });
      }
      
      // Ensure currency is supported by Stripe
      const supportedCurrencies = ['aud', 'usd', 'eur', 'gbp', 'inr', 'cad', 'nzd'];
      const currencyLower = currency.toLowerCase();
      
      if (!supportedCurrencies.includes(currencyLower)) {
        return res.status(400).json({ message: `Currency ${currency} is not supported` });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currencyLower,
        payment_method_types: ['card'], // Limit to card payments only
        description: 'Donation to Aafiyaa Ltd.', // Set company name in payment authorization text
        statement_descriptor_suffix: 'DONATION', // Text on credit card statement (max 22 chars)
        metadata: {
          donationId: donationId ? donationId.toString() : undefined
        }
      });

      // Update donation with payment intent ID
      if (donationId) {
        console.log(`[STRIPE-DEBUG] Created payment intent for donation ${donationId}: ${paymentIntent.id}`);
        console.log(`[STRIPE-DEBUG] Payment intent status: ${paymentIntent.status}`);
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
      
      // Convert frequency to valid Stripe intervals - must be 'day', 'week', 'month' or 'year'
      let interval: 'day' | 'week' | 'month' | 'year';
      let intervalCount: number;
      
      if (frequency === 'weekly') {
        interval = 'week';
        intervalCount = 1;
      } else if (frequency === 'monthly') {
        interval = 'month';
        intervalCount = 1;
      } else if (frequency === 'quarterly') {
        interval = 'month';
        intervalCount = 3;
      } else if (frequency === 'yearly') {
        interval = 'year';
        intervalCount = 1;
      } else {
        // Default to monthly if an unknown frequency is provided
        interval = 'month';
        intervalCount = 1;
      }
      
      console.log(`Setting up subscription with interval: ${interval}, count: ${intervalCount}, frequency: ${frequency}`);
      
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
            undefined
          );
        }
      }
      
      // Step 2: Create a price for this donation amount
      // Log data for debugging
      console.log('Creating price with the following data:');
      console.log('- Amount in cents:', amountInCents);
      console.log('- Currency:', currency.toLowerCase());
      console.log('- Interval:', interval);
      console.log('- Interval count:', intervalCount);
      
      // Note: We need to cast interval to any to avoid TypeScript error due to Stripe types
      const price = await stripe.prices.create({
        unit_amount: amountInCents,
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval as any,
          interval_count: intervalCount,
        },
        product_data: {
          name: `${donation.type} Donation (${frequency}) - ${donation.destinationProject || 'Aafiyaa Charity Clinics'}`,
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
          userId: user?.id ? user.id.toString() : ''
        }
      });
      
      console.log(`Created subscription ${subscription.id} for donation ${donationId}`);
      
      // Step 4: Update the donation with subscription details
      let nextPaymentDate = null;
      
      // Safely extract the current_period_end timestamp (if it exists)
      if (subscription && typeof subscription === 'object' && 'current_period_end' in subscription) {
        const periodEnd = (subscription as any).current_period_end;
        if (periodEnd && typeof periodEnd === 'number') {
          nextPaymentDate = new Date(periodEnd * 1000); // Convert UNIX timestamp to Date
          console.log('Next payment date set to:', nextPaymentDate);
        } else {
          console.log('current_period_end is not a valid number:', periodEnd);
        }
      } else {
        console.log('Subscription has no current_period_end property');
      }
      
      await storage.updateDonationSubscription(
        donation.id,
        'stripe',
        subscription.id,
        subscription.status,
        nextPaymentDate
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
            updatedDonation.stripePaymentId || undefined
          );
        }
      }
      
      // Get the latest invoice
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string);
      
      // For test mode, we need to handle subscriptions differently
      // Create a payment method and attach it to the customer if we don't have a payment intent
      let paymentIntent;
      
      const invoiceData = invoice as any;
      const paymentIntentId = typeof invoiceData.payment_intent === 'string' 
        ? invoiceData.payment_intent 
        : invoiceData.payment_intent?.id;
      
      if (!paymentIntentId) {
        console.log('No payment intent found - creating one for this invoice specifically');
        
        try {
          // Pay the invoice explicitly to move the subscription to active state
          const paidInvoice = await stripe.invoices.pay(invoice.id!);
          console.log('Invoice manually paid:', paidInvoice.id, 'Status:', paidInvoice.status);
          
          // If invoice payment creates a payment intent, retrieve it
          const paidInvoiceData = paidInvoice as any;
          const paidInvoicePaymentIntent = paidInvoiceData.payment_intent;
          
          if (paidInvoicePaymentIntent) {
            const paidPaymentIntentId = typeof paidInvoicePaymentIntent === 'string' 
              ? paidInvoicePaymentIntent 
              : paidInvoicePaymentIntent.id;
              
            if (paidPaymentIntentId) {
              console.log('Getting payment intent from paid invoice:', paidPaymentIntentId);
              paymentIntent = await stripe.paymentIntents.retrieve(paidPaymentIntentId);
            }
          }
        } catch (payError: any) {
          console.error('Error paying invoice:', payError.message);
          
          // If we can't pay the invoice automatically, we'll return without a client secret
          // and let the frontend handle confirmation
        }
      } else {
        // Get the existing payment intent
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (piError: any) {
          console.error('Error retrieving payment intent:', piError.message);
        }
      }
      
      // For logging purposes, show what we're returning
      console.log('Subscription created:', {
        id: subscription.id,
        status: subscription.status,
        invoiceId: invoice.id
      });
      
      // Get the payment intent associated with the subscription
      if (paymentIntent) {
        console.log('Payment intent details:', {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        });
      } else {
        console.log('No payment intent found for subscription');
      }
      
      // Get client secret from the PaymentIntent if exists
      const clientSecret = paymentIntent?.client_secret;
      
      // Safely prepare response data
      let responseNextPaymentDate = null;
      
      // Use the same nextPaymentDate we calculated earlier
      if (nextPaymentDate instanceof Date) {
        responseNextPaymentDate = nextPaymentDate;
      }
      
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        nextPaymentDate: responseNextPaymentDate,
        invoiceId: invoice.id,
        paymentIntentId: paymentIntent?.id,
        clientSecret: clientSecret
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
        
        // Explicitly save the session and wait for it to complete
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session during login:", err);
            return res.status(500).json({ message: "Session error during login" });
          }
          
          // For debugging
          console.log("Admin logged in successfully, session ID:", req.sessionID);
          console.log("Session data:", req.session);
          
          res.json({ success: true });
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/admin/logout", (req, res) => {
    // Clear the admin authentication
    req.session.adminAuthenticated = false;
    
    // Regenerate the session to ensure complete cleanup
    req.session.regenerate((err) => {
      if (err) {
        console.error("Error regenerating session during logout:", err);
      }
      res.json({ success: true });
    });
  });
  
  // Get payment history (all donations with their status) - protected
  app.get("/api/payment-history", isAdminAuthenticated, async (req, res) => {
    try {
      const donations = await storage.getDonations();
      const allCases = await storage.getCases();
      
      // Filter out transactions with "processing" status and enhance with case names
      const enhancedDonations = donations
        .filter(donation => donation.status !== 'processing')
        .map(donation => {
          // Add case name if caseId exists
          if (donation.caseId) {
            const matchingCase = allCases.find(c => c.id === donation.caseId);
            return {
              ...donation,
              caseName: matchingCase?.title || 'Unknown Case'
            };
          }
          return donation;
        });
        
      res.json(enhancedDonations);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });
  
  // Endpoint to manually finalize a subscription (for admin panel)
  app.post("/api/admin/finalize-subscription", isAdminAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }
      
      // Get the subscription from Stripe
      const subscription = await stripe!.subscriptions.retrieve(subscriptionId);
      console.log(`Admin attempting to finalize subscription ${subscriptionId}, current status: ${subscription.status}`);
      
      // Only process incomplete subscriptions
      if (subscription.status !== 'incomplete') {
        return res.json({ 
          message: `Subscription is already in ${subscription.status} state, no action needed`,
          subscription
        });
      }
      
      // Get the latest invoice
      const invoice = await stripe!.invoices.retrieve(subscription.latest_invoice as string);
      
      // Pay the invoice to activate the subscription
      const paidInvoice = await stripe!.invoices.pay(invoice.id!);
      console.log('Invoice manually paid by admin:', paidInvoice.id, 'Status:', paidInvoice.status);
      
      // Get the updated subscription
      const updatedSubscription = await stripe!.subscriptions.retrieve(subscriptionId);
      
      res.json({
        message: "Subscription finalized successfully",
        previousStatus: subscription.status,
        currentStatus: updatedSubscription.status,
        invoiceStatus: paidInvoice.status,
        subscription: updatedSubscription
      });
    } catch (error: any) {
      console.error('Error finalizing subscription:', error.message);
      res.status(500).json({ message: `Error finalizing subscription: ${error.message}` });
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
      
      // Check if the ID is valid
      if (isNaN(caseId) || caseId <= 0) {
        return res.status(404).json({ message: "Case not found" });
      }
      
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

  // Update a case (admin only)
  app.put("/api/cases/:id", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const caseData = insertCaseSchema.partial().parse(req.body);
      
      const updatedCase = await storage.updateCase(caseId, caseData);
      
      if (!updatedCase) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(updatedCase);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to update case" });
      }
    }
  });

  // Delete a case (admin only)
  app.delete("/api/cases/:id", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const deleted = await storage.deleteCase(caseId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json({ message: "Case deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Toggle case status (admin only)
  app.patch("/api/cases/:id/toggle-status", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const updatedCase = await storage.toggleCaseStatus(caseId);
      
      if (!updatedCase) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle case status" });
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

  // Webhook for Stripe events with New Relic tracking
  app.post("/api/webhook", async (req, res) => {
    const startTime = Date.now();
    
    if (!stripe) {
      if (newrelic?.recordCustomEvent) {
        newrelic.recordCustomEvent('WebhookError', {
          error: 'Stripe not configured',
          timestamp: new Date().toISOString()
        });
      }
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
      
      // Track webhook received in New Relic
      if (newrelic?.recordCustomEvent) {
        newrelic.recordCustomEvent('WebhookReceived', {
          eventType: event.type,
          eventId: event.id,
          timestamp: new Date().toISOString(),
          hasSignature: !!sig
        });
      }

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
          if (newrelic?.recordCustomEvent) {
            newrelic.recordCustomEvent('WebhookUnhandled', {
              eventType: event.type,
              eventId: event.id,
              timestamp: new Date().toISOString()
            });
          }
      }

      // Track successful webhook processing
      const processingTime = Date.now() - startTime;
      if (newrelic?.recordCustomEvent) {
        newrelic.recordCustomEvent('WebhookProcessed', {
          eventType: event.type,
          eventId: event.id,
          processingTimeMs: processingTime,
          success: true,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ received: true });
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('Webhook Error:', error.message);
      
      // Track webhook processing errors in New Relic
      if (newrelic?.recordCustomEvent) {
        newrelic.recordCustomEvent('WebhookError', {
          eventType: event?.type || 'unknown',
          eventId: event?.id || 'unknown',
          error: error.message,
          processingTimeMs: processingTime,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
      
      // Also record as an error for alerting
      if (newrelic?.noticeError) {
        newrelic.noticeError(error, {
          customAttributes: {
            context: 'stripe_webhook',
            eventType: event?.type || 'unknown'
          }
        });
      }
      
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });





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
          new Date(((subscription as any).current_period_end || 0) * 1000)
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
          new Date(((subscription as any).current_period_end || 0) * 1000)
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
          new Date(((subscription as any).current_period_end || 0) * 1000)
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
            new Date(((subscription as any).current_period_end || 0) * 1000)
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