var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session2 from "express-session";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cases: () => cases,
  contactFormSchema: () => contactFormSchema,
  contactMessages: () => contactMessages,
  donationFormSchema: () => donationFormSchema,
  donations: () => donations,
  endorsements: () => endorsements,
  insertCaseSchema: () => insertCaseSchema,
  insertContactMessageSchema: () => insertContactMessageSchema,
  insertDonationSchema: () => insertDonationSchema,
  insertEndorsementSchema: () => insertEndorsementSchema,
  insertOrphanedPaymentSchema: () => insertOrphanedPaymentSchema,
  insertReceiptSchema: () => insertReceiptSchema,
  insertStatsSchema: () => insertStatsSchema,
  insertUserSchema: () => insertUserSchema,
  insertWebhookEventSchema: () => insertWebhookEventSchema,
  orphanedPayments: () => orphanedPayments,
  receipts: () => receipts,
  stats: () => stats,
  users: () => users,
  webhookEvents: () => webhookEvents
});
import { pgTable, text, serial, integer, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  paypalCustomerId: text("paypal_customer_id")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true
});
var cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  amountRequired: real("amount_required").notNull(),
  amountCollected: real("amount_collected").notNull().default(0),
  active: boolean("active").notNull().default(true),
  recurringAllowed: boolean("recurring_allowed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  amountCollected: true,
  createdAt: true
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amountRequired: z.number().min(1, "Amount must be at least 1")
});
var donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  // 'zakaat', 'sadqah', 'interest'
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  frequency: text("frequency").notNull().default("one-off"),
  // 'one-off', 'weekly', 'monthly'
  stripePaymentId: text("stripe_payment_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // For recurring payments
  paypalSubscriptionId: text("paypal_subscription_id"),
  // For PayPal recurring payments
  status: text("status").notNull().default("pending"),
  // 'pending', 'completed', 'failed', 'active-subscription', 'subscription-cancelled'
  subscriptionStatus: text("subscription_status"),
  // 'active', 'past_due', 'cancelled', 'incomplete', etc.
  nextPaymentDate: timestamp("next_payment_date"),
  // Next scheduled payment date for subscriptions
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name"),
  // Keep for backwards compatibility
  userId: integer("user_id"),
  // Link to a user for recurring payments
  paymentMethod: text("payment_method"),
  // 'stripe', 'apple_pay', 'paypal'
  caseId: integer("case_id"),
  // For case-specific donations
  destinationProject: text("destination_project")
  // For non-case specific donations
});
var insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true
}).extend({
  type: z.enum(["zakaat", "sadqah", "interest"], {
    required_error: "Please select a donation type"
  }),
  amount: z.number().min(0.01, "Amount must be at least 0.01"),
  currency: z.string().min(3, "Currency must be a valid 3-letter code"),
  frequency: z.enum(["one-off", "weekly", "monthly"], {
    required_error: "Please select a frequency"
  })
});
var endorsements = pgTable("endorsements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  logoUrl: text("logo_url").notNull(),
  url: text("url")
});
var insertEndorsementSchema = createInsertSchema(endorsements).omit({
  id: true
});
var stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  totalPatients: integer("total_patients").notNull().default(0),
  monthlyPatients: integer("monthly_patients").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow()
});
var insertStatsSchema = createInsertSchema(stats).omit({
  id: true,
  lastUpdated: true
});
var donationFormSchema = insertDonationSchema.extend({
  amount: z.number().min(1, "Amount must be at least 1"),
  type: z.enum(["zakaat", "sadqah", "interest"], {
    required_error: "Please select a donation type"
  }),
  frequency: z.enum(["one-off", "weekly", "monthly"], {
    required_error: "Please select a frequency"
  })
});
var contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isRead: boolean("is_read").notNull().default(false)
});
var insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  isRead: true
});
var contactFormSchema = insertContactMessageSchema.extend({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." })
});
var webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  // payment_intent.succeeded, etc.
  stripeEventId: text("stripe_event_id"),
  // Stripe's event ID
  paymentIntentId: text("payment_intent_id"),
  subscriptionId: text("subscription_id"),
  donationId: integer("donation_id"),
  // Reference to donations table
  matchStrategy: text("match_strategy"),
  // how donation was found
  status: text("status").notNull(),
  // processed, orphaned, failed
  rawData: json("raw_data"),
  // Full webhook payload
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var orphanedPayments = pgTable("orphaned_payments", {
  id: serial("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("unresolved"),
  // unresolved, resolved, ignored
  resolvedDonationId: integer("resolved_donation_id"),
  // If manually linked to donation
  stripeMetadata: json("stripe_metadata"),
  description: text("description"),
  stripeCreatedAt: timestamp("stripe_created_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  // admin username who resolved it
  notes: text("notes"),
  // Admin notes about resolution
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true
});
var insertOrphanedPaymentSchema = createInsertSchema(orphanedPayments).omit({
  id: true,
  createdAt: true
});
var receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  donationId: integer("donation_id").notNull(),
  // Reference to donations table
  receiptNumber: text("receipt_number").notNull().unique(),
  // Unique receipt identifier
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  donorName: text("donor_name"),
  donorEmail: text("donor_email"),
  donationType: text("donation_type").notNull(),
  // zakaat, sadqah, interest
  caseId: integer("case_id"),
  // If donation was for specific case
  filePath: text("file_path"),
  // Path to generated PDF
  status: text("status").notNull().default("pending"),
  // pending, generated, sent, failed
  generatedAt: timestamp("generated_at"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  // If generation or sending failed
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// server/config.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
var envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn("No .env file found. Using environment variables directly.");
  dotenv.config();
}
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`Stripe configuration: ${process.env.STRIPE_SECRET_KEY ? "\u2713 Secret key found" : "\u2717 Missing secret key"}`);
console.log(`Stripe public key: ${process.env.VITE_STRIPE_PUBLIC_KEY ? "\u2713 Public key found" : "\u2717 Missing public key"}`);
var config = {
  // App settings
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000", 10),
  SESSION_SECRET: process.env.SESSION_SECRET || "aafiyaa_dev_session_secret",
  // New Relic
  NEW_RELIC: {
    LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
    ACCOUNT_ID: process.env.VITE_NEW_RELIC_ACCOUNT_ID,
    APPLICATION_ID: process.env.VITE_NEW_RELIC_APPLICATION_ID,
    BROWSER_LICENSE_KEY: process.env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY
  },
  // Payment gateways
  STRIPE: {
    // When you're ready to use different keys for different environments,
    // replace process.env.STRIPE_SECRET_KEY with:
    // process.env.NODE_ENV === 'production' ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY,
    SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    // Similarly for the public key:
    // process.env.NODE_ENV === 'production' ? process.env.VITE_STRIPE_LIVE_PUBLIC_KEY : process.env.VITE_STRIPE_TEST_PUBLIC_KEY,
    PUBLIC_KEY: process.env.VITE_STRIPE_PUBLIC_KEY,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
  },
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    SECRET_KEY: process.env.PAYPAL_SECRET_KEY,
    CLIENT_ID_PUBLIC: process.env.VITE_PAYPAL_CLIENT_ID
  },
  // Email Configuration
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    SMTP_USER: process.env.SMTP_USER || "aafiyaa.main@gmail.com",
    SMTP_PASS: process.env.SMTP_PASS,
    FROM: process.env.EMAIL_FROM || "aafiyaa.main@gmail.com",
    TO: process.env.EMAIL_TO || "aafiyaa.main@gmail.com"
  },
  // Database
  DATABASE: {
    URL: process.env.DATABASE_URL,
    USER: process.env.PGUSER,
    PASSWORD: process.env.PGPASSWORD,
    NAME: process.env.PGDATABASE,
    HOST: process.env.PGHOST,
    PORT: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432
  },
  // Derived settings
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_TEST: process.env.NODE_ENV === "test"
};
function validateConfig() {
  const missingVars = [];
  if (config.IS_PRODUCTION) {
    if (!config.STRIPE.SECRET_KEY) missingVars.push("STRIPE_SECRET_KEY");
    if (!config.STRIPE.PUBLIC_KEY) missingVars.push("VITE_STRIPE_PUBLIC_KEY");
    if (!config.SESSION_SECRET || config.SESSION_SECRET === "aafiyaa_dev_session_secret") {
      missingVars.push("SESSION_SECRET");
    }
  }
  if (config.STRIPE.SECRET_KEY && !config.STRIPE.PUBLIC_KEY) {
    missingVars.push("VITE_STRIPE_PUBLIC_KEY (required when STRIPE_SECRET_KEY is set)");
  }
  if (config.PAYPAL.CLIENT_ID && !config.PAYPAL.SECRET_KEY) {
    missingVars.push("PAYPAL_SECRET_KEY (required when PAYPAL_CLIENT_ID is set)");
  }
  if (missingVars.length > 0) {
    console.warn("\u26A0\uFE0F Missing required environment variables:");
    missingVars.forEach((variable) => {
      console.warn(`  - ${variable}`);
    });
    if (config.IS_PRODUCTION) {
      throw new Error("Cannot start in production mode with missing configuration.");
    }
  }
  return missingVars.length === 0;
}
var config_default = config;

// server/db.ts
if (!config_default.DATABASE.URL) {
  console.log("No DATABASE_URL found. Using in-memory storage instead.");
}
var pool = config_default.DATABASE.URL ? new Pool({
  connectionString: config_default.DATABASE.URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
}) : null;
var db = pool ? drizzle(pool, { schema: schema_exports }) : null;
function isDatabaseAvailable() {
  return !!db;
}
async function runMigrations() {
  if (!db || !pool) {
    console.warn("Cannot run migrations: No database connection");
    return false;
  }
  try {
    console.log("Checking database connection...");
    await pool.query("SELECT 1");
    console.log("Database connection successful");
    try {
      console.log("Checking if tables exist...");
      const usersResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      if (!usersResult.rows[0].exists) {
        console.log("Tables do not exist, creating schema...");
        await pool.query(`
          -- Users table
          CREATE TABLE IF NOT EXISTS "users" (
            "id" SERIAL PRIMARY KEY,
            "username" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "email" TEXT,
            "stripe_customer_id" TEXT,
            "paypal_customer_id" TEXT
          );
          
          -- Cases table
          CREATE TABLE IF NOT EXISTS "cases" (
            "id" SERIAL PRIMARY KEY,
            "title" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "image_url" TEXT NOT NULL,
            "amount_required" REAL NOT NULL,
            "amount_collected" REAL NOT NULL DEFAULT 0,
            "active" BOOLEAN NOT NULL DEFAULT TRUE,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          -- Donations table
          CREATE TABLE IF NOT EXISTS "donations" (
            "id" SERIAL PRIMARY KEY,
            "type" TEXT NOT NULL,
            "amount" REAL NOT NULL,
            "currency" TEXT NOT NULL DEFAULT 'USD',
            "frequency" TEXT NOT NULL DEFAULT 'one-off',
            "stripe_payment_id" TEXT,
            "stripe_subscription_id" TEXT,
            "paypal_subscription_id" TEXT,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "subscription_status" TEXT,
            "next_payment_date" TIMESTAMP,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "email" TEXT,
            "name" TEXT,
            "user_id" INTEGER,
            "payment_method" TEXT,
            "case_id" INTEGER,
            "destination_project" TEXT
          );
          
          -- Endorsements table
          CREATE TABLE IF NOT EXISTS "endorsements" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "logo_url" TEXT NOT NULL,
            "url" TEXT
          );
          
          -- Stats table
          CREATE TABLE IF NOT EXISTS "stats" (
            "id" SERIAL PRIMARY KEY,
            "total_patients" INTEGER NOT NULL DEFAULT 0,
            "monthly_patients" INTEGER NOT NULL DEFAULT 0,
            "last_updated" TIMESTAMP NOT NULL DEFAULT NOW()
          );
          
          -- Contact messages table
          CREATE TABLE IF NOT EXISTS "contact_messages" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "subject" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
            "is_read" BOOLEAN NOT NULL DEFAULT FALSE
          );
          
          -- Session table for PostgreSQL session store
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" VARCHAR NOT NULL COLLATE "default",
            "sess" JSON NOT NULL,
            "expire" TIMESTAMP(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          );
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        console.log("Schema created successfully");
        console.log("Inserting initial data...");
        await pool.query(`
          INSERT INTO stats (total_patients, monthly_patients) 
          VALUES (124568, 3247)
          ON CONFLICT DO NOTHING;
        `);
        await pool.query(`
          INSERT INTO endorsements (name, type, logo_url, url)
          VALUES 
            ('Rahbar Foundation', 'Medication supply partner', 'rahbar-trust', 'https://rahbartrust.org/'),
            ('Al-Ihsan Institute', 'Religious rulings partner', 'al-ihsan', 'https://www.al-ihsan.com.au/')
          ON CONFLICT DO NOTHING;
        `);
        await pool.query(`
          INSERT INTO cases (title, description, image_url, amount_required, amount_collected, active)
          VALUES 
            ('Emergency Medical Supplies for Flood Victims', 'Providing essential medical supplies to families affected by recent flooding in rural communities. Your donation will help us deliver critical medications, first aid kits, and clean water tablets.', '/images/cases/flood-victims.jpg', 5000, 0, true),
            ('Children''s Immunization Program', 'Funding immunization programs for children in underserved areas. These vaccinations protect against preventable diseases and save lives.', '/images/cases/immunization.jpg', 7500, 0, true),
            ('Mobile Medical Clinic', 'Supporting our mobile medical clinic that provides healthcare to remote villages without access to medical facilities. The clinic offers basic health screenings, treatments, and health education.', '/images/cases/mobile-clinic.jpg', 12000, 0, true),
            ('Medical Equipment for Rural Clinic', 'Purchasing essential medical equipment for our rural clinic that serves hundreds of patients weekly. This equipment will enhance diagnostic capabilities and treatment options.', '/images/cases/rural-clinic.jpg', 8500, 0, true),
            ('Maternal Health Services', 'Funding prenatal and postnatal care for expectant mothers in underserved communities. Your donation helps provide safe deliveries and healthy starts for mothers and babies.', '/images/cases/maternal-health.jpg', 6000, 0, true)
          ON CONFLICT DO NOTHING;
        `);
        console.log("Initial data inserted successfully");
      } else {
        console.log("Tables already exist, skipping schema creation");
      }
    } catch (schemaError) {
      console.error("Error creating schema:", schemaError);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// server/storage.ts
import { eq, and, desc, gt } from "drizzle-orm";
var scryptAsync = promisify(scrypt);
var ADMIN_USERNAME = "admin";
var ADMIN_PASSWORD_HASH = "f8dfa2f987014085e2e48fbbf3163c48ce1acc870ef5d6c869332531c396c3f38c68a0ecad3514f807fbfcf5b5ea8145b41bc5860f8aa83c6e68bfe54192a40d.aafiyaa_secure_salt_2025";
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  donations;
  endorsementsList;
  casesList;
  contactMessagesList;
  receiptsList;
  statsData;
  // Session store for admin authentication
  sessionStore;
  userCurrentId;
  donationCurrentId;
  endorsementCurrentId;
  caseCurrentId;
  contactMessageCurrentId;
  receiptCurrentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.donations = /* @__PURE__ */ new Map();
    this.endorsementsList = /* @__PURE__ */ new Map();
    this.casesList = /* @__PURE__ */ new Map();
    this.contactMessagesList = /* @__PURE__ */ new Map();
    this.receiptsList = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.donationCurrentId = 1;
    this.endorsementCurrentId = 1;
    this.caseCurrentId = 1;
    this.contactMessageCurrentId = 1;
    this.receiptCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.initializeData();
  }
  initializeData() {
    this.statsData = {
      id: 1,
      totalPatients: 124568,
      monthlyPatients: 3247,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    const sampleEndorsements = [
      { name: "Rahbar Foundation", type: "Medication supply partner", logoUrl: "rahbar-trust", url: "https://rahbartrust.org/" },
      { name: "Al-Ihsan Institute", type: "Religious rulings partner", logoUrl: "al-ihsan", url: "https://www.al-ihsan.com.au/" }
    ];
    sampleEndorsements.forEach((endorsement) => {
      this.createEndorsement(endorsement);
    });
    const sampleCases = [
      {
        title: "Emergency Medical Supplies for Flood Victims",
        description: "Providing essential medical supplies to families affected by recent flooding in rural communities. Your donation will help us deliver critical medications, first aid kits, and clean water tablets.",
        imageUrl: "/images/cases/flood-victims.jpg",
        amountRequired: 5e3,
        active: true
      },
      {
        title: "Children's Immunization Program",
        description: "Funding immunization programs for children in underserved areas. These vaccinations protect against preventable diseases and save lives.",
        imageUrl: "/images/cases/immunization.jpg",
        amountRequired: 7500,
        active: true
      },
      {
        title: "Mobile Medical Clinic",
        description: "Supporting our mobile medical clinic that provides healthcare to remote villages without access to medical facilities. The clinic offers basic health screenings, treatments, and health education.",
        imageUrl: "/images/cases/mobile-clinic.jpg",
        amountRequired: 12e3,
        active: true
      },
      {
        title: "Medical Equipment for Rural Clinic",
        description: "Purchasing essential medical equipment for our rural clinic that serves hundreds of patients weekly. This equipment will enhance diagnostic capabilities and treatment options.",
        imageUrl: "/images/cases/rural-clinic.jpg",
        amountRequired: 8500,
        active: true
      },
      {
        title: "Maternal Health Services",
        description: "Funding prenatal and postnatal care for expectant mothers in underserved communities. Your donation helps provide safe deliveries and healthy starts for mothers and babies.",
        imageUrl: "/images/cases/maternal-health.jpg",
        amountRequired: 6e3,
        active: true
      }
    ];
    sampleCases.forEach((caseData) => {
      this.createCase(caseData);
    });
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = {
      ...insertUser,
      id,
      email: insertUser.email || null,
      stripeCustomerId: null,
      paypalCustomerId: null
    };
    this.users.set(id, user);
    return user;
  }
  async updateUserPaymentInfo(id, stripeCustomerId, paypalCustomerId) {
    const user = await this.getUser(id);
    if (!user) return void 0;
    const updatedUser = {
      ...user,
      ...stripeCustomerId && { stripeCustomerId },
      ...paypalCustomerId && { paypalCustomerId }
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // Admin methods
  async validateAdminCredentials(username, password) {
    if (username !== ADMIN_USERNAME) {
      return false;
    }
    try {
      return await comparePasswords(password, ADMIN_PASSWORD_HASH);
    } catch (error) {
      console.error("Admin authentication error:", error);
      return false;
    }
  }
  // Donation methods
  async createDonation(insertDonation) {
    const id = this.donationCurrentId++;
    const donation = {
      ...insertDonation,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      name: insertDonation.name || null,
      email: insertDonation.email || null,
      status: insertDonation.status || "pending",
      currency: insertDonation.currency || "USD",
      frequency: insertDonation.frequency || "one-off",
      stripePaymentId: insertDonation.stripePaymentId || null,
      stripeSubscriptionId: insertDonation.stripeSubscriptionId || null,
      paypalSubscriptionId: insertDonation.paypalSubscriptionId || null,
      subscriptionStatus: insertDonation.subscriptionStatus || null,
      nextPaymentDate: insertDonation.nextPaymentDate || null,
      userId: insertDonation.userId || null,
      paymentMethod: insertDonation.paymentMethod || null,
      caseId: insertDonation.caseId || null,
      destinationProject: insertDonation.destinationProject || null
    };
    this.donations.set(id, donation);
    return donation;
  }
  async getDonation(id) {
    return this.donations.get(id);
  }
  async getDonationByStripePaymentId(paymentId) {
    return Array.from(this.donations.values()).find(
      (donation) => donation.stripePaymentId === paymentId
    );
  }
  async getDonationByStripeSubscriptionId(subscriptionId) {
    return Array.from(this.donations.values()).find(
      (donation) => donation.stripeSubscriptionId === subscriptionId
    );
  }
  async getDonationByPaypalSubscriptionId(subscriptionId) {
    return Array.from(this.donations.values()).find(
      (donation) => donation.paypalSubscriptionId === subscriptionId
    );
  }
  async updateDonationStatus(id, status, paymentId) {
    const donation = this.donations.get(id);
    if (!donation) return void 0;
    let paymentMethod = donation.paymentMethod;
    if (!paymentMethod && paymentId) {
      if (paymentId.startsWith("paypal-")) {
        paymentMethod = "paypal";
      } else if (paymentId.startsWith("applepay-")) {
        paymentMethod = "apple_pay";
      } else if (paymentId.startsWith("googlepay-")) {
        paymentMethod = "google_pay";
      } else if (paymentId.startsWith("pi_")) {
        paymentMethod = "stripe";
      }
    }
    const updatedDonation = {
      ...donation,
      status,
      ...paymentMethod && { paymentMethod },
      ...paymentId && { stripePaymentId: paymentId },
      stripeSubscriptionId: donation.stripeSubscriptionId || null,
      paypalSubscriptionId: donation.paypalSubscriptionId || null,
      subscriptionStatus: donation.subscriptionStatus || null,
      nextPaymentDate: donation.nextPaymentDate || null,
      userId: donation.userId || null
    };
    if (status === "completed" && donation.caseId && donation.status !== "completed") {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  async updateDonationSubscription(id, provider, subscriptionId, subscriptionStatus, nextPaymentDate) {
    const donation = this.donations.get(id);
    if (!donation) return void 0;
    let status = donation.status;
    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      status = "active-subscription";
    } else if (subscriptionStatus === "cancelled" || subscriptionStatus === "canceled" || subscriptionStatus === "expired") {
      status = "subscription-cancelled";
    }
    const updatedDonation = {
      ...donation,
      status,
      subscriptionStatus,
      nextPaymentDate: nextPaymentDate || null,
      ...provider === "stripe" ? { stripeSubscriptionId: subscriptionId } : { paypalSubscriptionId: subscriptionId },
      stripeSubscriptionId: provider === "stripe" ? subscriptionId : donation.stripeSubscriptionId || null,
      paypalSubscriptionId: provider === "paypal" ? subscriptionId : donation.paypalSubscriptionId || null
    };
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  async getDonations() {
    return Array.from(this.donations.values());
  }
  async getDonationsByUserId(userId) {
    return Array.from(this.donations.values()).filter(
      (donation) => donation.userId === userId
    );
  }
  async getActiveSubscriptions() {
    return Array.from(this.donations.values()).filter(
      (donation) => donation.status === "active-subscription" && (donation.stripeSubscriptionId || donation.paypalSubscriptionId)
    );
  }
  async updateDonationDonor(id, name, email, firstName, lastName) {
    const donation = this.donations.get(id);
    if (!donation) return void 0;
    const updatedDonation = {
      ...donation,
      name,
      email,
      firstName: firstName || null,
      lastName: lastName || null
    };
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  async updateDonationAmount(id, amount) {
    const donation = this.donations.get(id);
    if (!donation) return void 0;
    const updatedDonation = {
      ...donation,
      amount
    };
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  // Endorsement methods
  async getEndorsements() {
    return Array.from(this.endorsementsList.values());
  }
  async createEndorsement(insertEndorsement) {
    const id = this.endorsementCurrentId++;
    const endorsement = {
      ...insertEndorsement,
      id,
      url: insertEndorsement.url || null
    };
    this.endorsementsList.set(id, endorsement);
    return endorsement;
  }
  // Stats methods
  async getStats() {
    return this.statsData;
  }
  async updateStats(statsData) {
    if (!this.statsData) return void 0;
    this.statsData = {
      ...this.statsData,
      ...statsData,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    return this.statsData;
  }
  // Case methods
  async getCases() {
    return Array.from(this.casesList.values());
  }
  async getActiveZakaatCases() {
    return Array.from(this.casesList.values()).filter(
      (caseItem) => caseItem.active && caseItem.amountCollected < caseItem.amountRequired
    );
  }
  async getCase(id) {
    return this.casesList.get(id);
  }
  async createCase(caseData) {
    const id = this.caseCurrentId++;
    const newCase = {
      ...caseData,
      id,
      imageUrl: caseData.imageUrl || "https://via.placeholder.com/400x300?text=No+Image",
      amountCollected: 0,
      active: caseData.active !== void 0 ? caseData.active : true,
      recurringAllowed: caseData.recurringAllowed ?? false,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.casesList.set(id, newCase);
    return newCase;
  }
  async updateCase(id, caseData) {
    const caseItem = this.casesList.get(id);
    if (!caseItem) return void 0;
    const updatedCase = {
      ...caseItem,
      ...caseData
    };
    this.casesList.set(id, updatedCase);
    return updatedCase;
  }
  async updateCaseAmountCollected(id, additionalAmount) {
    const caseItem = this.casesList.get(id);
    if (!caseItem) return void 0;
    const updatedCase = {
      ...caseItem,
      amountCollected: caseItem.amountCollected + additionalAmount
    };
    this.casesList.set(id, updatedCase);
    return updatedCase;
  }
  async deleteCase(id) {
    return this.casesList.delete(id);
  }
  async toggleCaseStatus(id) {
    const caseItem = this.casesList.get(id);
    if (!caseItem) return void 0;
    const updatedCase = {
      ...caseItem,
      active: !caseItem.active
    };
    this.casesList.set(id, updatedCase);
    return updatedCase;
  }
  // Contact message methods
  async createContactMessage(message) {
    const id = this.contactMessageCurrentId++;
    const contactMessage = {
      ...message,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      isRead: false
    };
    this.contactMessagesList.set(id, contactMessage);
    return contactMessage;
  }
  async getContactMessages() {
    return Array.from(this.contactMessagesList.values());
  }
  async getContactMessage(id) {
    return this.contactMessagesList.get(id);
  }
  async markContactMessageAsRead(id) {
    const message = this.contactMessagesList.get(id);
    if (!message) return void 0;
    const updatedMessage = {
      ...message,
      isRead: true
    };
    this.contactMessagesList.set(id, updatedMessage);
    return updatedMessage;
  }
  // Receipt methods
  async createReceipt(receiptData) {
    const id = this.receiptCurrentId++;
    const receipt = {
      ...receiptData,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.receiptsList.set(id, receipt);
    return receipt;
  }
  async getReceipt(id) {
    return this.receiptsList.get(id);
  }
  async getReceiptByNumber(receiptNumber) {
    for (const receipt of this.receiptsList.values()) {
      if (receipt.receiptNumber === receiptNumber) {
        return receipt;
      }
    }
    return void 0;
  }
  async getReceiptsByDonationId(donationId) {
    const receipts2 = [];
    for (const receipt of this.receiptsList.values()) {
      if (receipt.donationId === donationId) {
        receipts2.push(receipt);
      }
    }
    return receipts2;
  }
  async updateReceiptStatus(id, status, filePath, errorMessage) {
    const receipt = this.receiptsList.get(id);
    if (!receipt) return void 0;
    const updatedReceipt = {
      ...receipt,
      status,
      filePath: filePath || receipt.filePath,
      errorMessage: errorMessage || receipt.errorMessage,
      generatedAt: status === "generated" ? /* @__PURE__ */ new Date() : receipt.generatedAt
    };
    this.receiptsList.set(id, updatedReceipt);
    return updatedReceipt;
  }
  async updateReceiptSentAt(id) {
    const receipt = this.receiptsList.get(id);
    if (!receipt) return void 0;
    const updatedReceipt = {
      ...receipt,
      status: "sent",
      sentAt: /* @__PURE__ */ new Date()
    };
    this.receiptsList.set(id, updatedReceipt);
    return updatedReceipt;
  }
  async getReceipts() {
    return Array.from(this.receiptsList.values());
  }
};
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    if (!pool) {
      throw new Error("Cannot initialize DatabaseStorage without a database connection pool");
    }
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true
    });
    console.log("Using PostgreSQL for data storage and session management");
  }
  // User methods
  async getUser(id) {
    if (!db) return void 0;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    if (!db) return void 0;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    if (!db) return void 0;
    if (!email) return void 0;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    if (!db) throw new Error("Database not available");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserPaymentInfo(id, stripeCustomerId, paypalCustomerId) {
    if (!db) return void 0;
    const updateData = {};
    if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;
    if (paypalCustomerId) updateData.paypalCustomerId = paypalCustomerId;
    if (Object.keys(updateData).length === 0) return this.getUser(id);
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  // Admin methods
  async validateAdminCredentials(username, password) {
    if (username !== ADMIN_USERNAME) {
      return false;
    }
    try {
      return await comparePasswords(password, ADMIN_PASSWORD_HASH);
    } catch (error) {
      console.error("Admin authentication error:", error);
      return false;
    }
  }
  // Donation methods
  async createDonation(insertDonation) {
    if (!db) throw new Error("Database not available");
    const [donation] = await db.insert(donations).values(insertDonation).returning();
    if (donation.status === "completed" && donation.caseId) {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    return donation;
  }
  async getDonation(id) {
    if (!db) return void 0;
    const [donation] = await db.select().from(donations).where(eq(donations.id, id));
    return donation;
  }
  async getDonationByStripePaymentId(paymentId) {
    if (!db) return void 0;
    const [donation] = await db.select().from(donations).where(eq(donations.stripePaymentId, paymentId));
    return donation;
  }
  async getDonationByStripeSubscriptionId(subscriptionId) {
    if (!db) return void 0;
    const [donation] = await db.select().from(donations).where(eq(donations.stripeSubscriptionId, subscriptionId));
    return donation;
  }
  async getDonationByPaypalSubscriptionId(subscriptionId) {
    if (!db) return void 0;
    const [donation] = await db.select().from(donations).where(eq(donations.paypalSubscriptionId, subscriptionId));
    return donation;
  }
  async updateDonationStatus(id, status, paymentId) {
    if (!db) return void 0;
    const donation = await this.getDonation(id);
    if (!donation) return void 0;
    let paymentMethod = donation.paymentMethod;
    if (!paymentMethod && paymentId) {
      if (paymentId.startsWith("paypal-")) {
        paymentMethod = "paypal";
      } else if (paymentId.startsWith("applepay-")) {
        paymentMethod = "apple_pay";
      } else if (paymentId.startsWith("googlepay-")) {
        paymentMethod = "google_pay";
      } else if (paymentId.startsWith("pi_")) {
        paymentMethod = "stripe";
      }
    }
    const updateData = {
      status,
      ...paymentMethod && { paymentMethod },
      ...paymentId && { stripePaymentId: paymentId }
    };
    const [updatedDonation] = await db.update(donations).set(updateData).where(eq(donations.id, id)).returning();
    if (status === "completed" && donation.caseId && donation.status !== "completed") {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    return updatedDonation;
  }
  async updateDonationSubscription(id, provider, subscriptionId, subscriptionStatus, nextPaymentDate) {
    if (!db) return void 0;
    const donation = await this.getDonation(id);
    if (!donation) return void 0;
    let status = donation.status;
    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      status = "active-subscription";
    } else if (subscriptionStatus === "cancelled" || subscriptionStatus === "canceled" || subscriptionStatus === "expired") {
      status = "subscription-cancelled";
    }
    const updateData = {
      status,
      subscriptionStatus,
      nextPaymentDate: nextPaymentDate === null ? null : nextPaymentDate,
      ...provider === "stripe" ? { stripeSubscriptionId: subscriptionId } : { paypalSubscriptionId: subscriptionId }
    };
    const [updatedDonation] = await db.update(donations).set(updateData).where(eq(donations.id, id)).returning();
    return updatedDonation;
  }
  async getDonations() {
    if (!db) return [];
    return await db.select().from(donations).orderBy(desc(donations.createdAt));
  }
  async getDonationsByUserId(userId) {
    if (!db) return [];
    return await db.select().from(donations).where(eq(donations.userId, userId)).orderBy(desc(donations.createdAt));
  }
  async getActiveSubscriptions() {
    if (!db) return [];
    return await db.select().from(donations).where(eq(donations.status, "active-subscription")).orderBy(desc(donations.createdAt));
  }
  async updateDonationDonor(id, name, email, firstName, lastName) {
    if (!db) return void 0;
    const [updatedDonation] = await db.update(donations).set({
      name,
      email,
      firstName: firstName || null,
      lastName: lastName || null
    }).where(eq(donations.id, id)).returning();
    return updatedDonation;
  }
  async updateDonationAmount(id, amount) {
    if (!db) return void 0;
    const [updatedDonation] = await db.update(donations).set({ amount }).where(eq(donations.id, id)).returning();
    return updatedDonation;
  }
  // Endorsement methods
  async getEndorsements() {
    if (!db) return [];
    return await db.select().from(endorsements);
  }
  async createEndorsement(insertEndorsement) {
    if (!db) throw new Error("Database not available");
    const [endorsement] = await db.insert(endorsements).values(insertEndorsement).returning();
    return endorsement;
  }
  // Stats methods
  async getStats() {
    if (!db) return void 0;
    const [statsData] = await db.select().from(stats).limit(1);
    return statsData;
  }
  async updateStats(statsData) {
    if (!db) return void 0;
    const currentStats = await this.getStats();
    if (currentStats) {
      const [updatedStats] = await db.update(stats).set({
        ...statsData,
        lastUpdated: /* @__PURE__ */ new Date()
      }).where(eq(stats.id, currentStats.id)).returning();
      return updatedStats;
    } else {
      const [newStats] = await db.insert(stats).values({
        totalPatients: statsData.totalPatients || 0,
        monthlyPatients: statsData.monthlyPatients || 0
      }).returning();
      return newStats;
    }
  }
  // Case methods
  async getCases() {
    if (!db) return [];
    return await db.select().from(cases);
  }
  async getActiveZakaatCases() {
    if (!db) return [];
    return await db.select().from(cases).where(
      and(
        eq(cases.active, true),
        gt(cases.amountRequired, cases.amountCollected)
      )
    );
  }
  async getCase(id) {
    if (!db) return void 0;
    const [caseItem] = await db.select().from(cases).where(eq(cases.id, id));
    return caseItem;
  }
  async createCase(insertCase) {
    if (!db) throw new Error("Database not available");
    const [newCase] = await db.insert(cases).values({
      ...insertCase,
      imageUrl: insertCase.imageUrl || "https://via.placeholder.com/400x300?text=No+Image",
      amountCollected: 0
    }).returning();
    return newCase;
  }
  async updateCase(id, caseData) {
    if (!db) return void 0;
    const [updatedCase] = await db.update(cases).set(caseData).where(eq(cases.id, id)).returning();
    return updatedCase;
  }
  async updateCaseAmountCollected(id, additionalAmount) {
    if (!db) return void 0;
    const caseItem = await this.getCase(id);
    if (!caseItem) return void 0;
    const newAmountCollected = caseItem.amountCollected + additionalAmount;
    const [updatedCase] = await db.update(cases).set({ amountCollected: newAmountCollected }).where(eq(cases.id, id)).returning();
    return updatedCase;
  }
  async deleteCase(id) {
    if (!db) return false;
    const result = await db.delete(cases).where(eq(cases.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async toggleCaseStatus(id) {
    if (!db) return void 0;
    const caseItem = await this.getCase(id);
    if (!caseItem) return void 0;
    const [updatedCase] = await db.update(cases).set({ active: !caseItem.active }).where(eq(cases.id, id)).returning();
    return updatedCase;
  }
  // Contact message methods
  async createContactMessage(message) {
    if (!db) throw new Error("Database not available");
    const [contactMessage] = await db.insert(contactMessages).values({
      ...message,
      isRead: false
    }).returning();
    return contactMessage;
  }
  async getContactMessages() {
    if (!db) return [];
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }
  async getContactMessage(id) {
    if (!db) return void 0;
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message;
  }
  async markContactMessageAsRead(id) {
    if (!db) return void 0;
    const [updatedMessage] = await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id)).returning();
    return updatedMessage;
  }
  // Receipt methods
  async createReceipt(receiptData) {
    if (!db) throw new Error("Database not available");
    const [receipt] = await db.insert(receipts).values({
      ...receiptData,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return receipt;
  }
  async getReceipt(id) {
    if (!db) return void 0;
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt;
  }
  async getReceiptByNumber(receiptNumber) {
    if (!db) return void 0;
    const [receipt] = await db.select().from(receipts).where(eq(receipts.receiptNumber, receiptNumber));
    return receipt;
  }
  async getReceiptsByDonationId(donationId) {
    if (!db) return [];
    return await db.select().from(receipts).where(eq(receipts.donationId, donationId)).orderBy(desc(receipts.createdAt));
  }
  async updateReceiptStatus(id, status, filePath, errorMessage) {
    if (!db) return void 0;
    const updateData = {
      status,
      generatedAt: status === "generated" ? /* @__PURE__ */ new Date() : void 0
    };
    if (filePath !== void 0) updateData.filePath = filePath;
    if (errorMessage !== void 0) updateData.errorMessage = errorMessage;
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === void 0) {
        delete updateData[key];
      }
    });
    const [updatedReceipt] = await db.update(receipts).set(updateData).where(eq(receipts.id, id)).returning();
    return updatedReceipt;
  }
  async updateReceiptSentAt(id) {
    if (!db) return void 0;
    const [updatedReceipt] = await db.update(receipts).set({
      status: "sent",
      sentAt: /* @__PURE__ */ new Date()
    }).where(eq(receipts.id, id)).returning();
    return updatedReceipt;
  }
  async getReceipts() {
    if (!db) return [];
    return await db.select().from(receipts).orderBy(desc(receipts.createdAt));
  }
};
var storageInstance = null;
function createStorageInstance() {
  if (storageInstance) {
    return storageInstance;
  }
  storageInstance = isDatabaseAvailable() ? new DatabaseStorage() : new MemStorage();
  return storageInstance;
}
var storage = createStorageInstance();

// server/routes.ts
import Stripe from "stripe";
import fetch from "node-fetch";
import { z as z2, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// server/pdf-receipt-service.ts
import puppeteer from "puppeteer";
import { promises as fs2 } from "fs";
import path2 from "path";
var receiptsDir = path2.join(process.cwd(), "receipts");
async function ensureReceiptsDir() {
  try {
    await fs2.mkdir(receiptsDir, { recursive: true });
  } catch (error) {
    console.error("Error creating receipts directory:", error);
  }
}
function generateReceiptNumber() {
  const timestamp2 = Date.now().toString().slice(-4);
  const randomNum = Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  return `AAFY-${timestamp2}${randomNum}`;
}
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD"
  }).format(amount);
}
async function getLogoBase64() {
  try {
    const logoPath = path2.join(process.cwd(), "server", "assets", "aafiyaa-logo.png");
    const logoBuffer = await fs2.readFile(logoPath);
    return logoBuffer.toString("base64");
  } catch (error) {
    console.error("Error loading logo:", error);
    return "";
  }
}
function getDonationTypeLabel(type) {
  switch (type.toLowerCase()) {
    case "zakaat":
      return "Zakaat";
    case "sadqah":
      return "Sadqah";
    case "interest":
      return "Interest";
    default:
      return type;
  }
}
function getFrequencyLabel(frequency) {
  switch (frequency.toLowerCase()) {
    case "one-off":
      return "One-time donation";
    case "weekly":
      return "Weekly recurring donation";
    case "monthly":
      return "Monthly recurring donation";
    default:
      return frequency;
  }
}
async function generateReceiptHTML(data) {
  const { donation, receiptNumber, customDate } = data;
  const currentDate = /* @__PURE__ */ new Date();
  const logoBase64 = await getLogoBase64();
  const paymentMethodDisplay = donation.paymentMethod ? `${donation.paymentMethod.toUpperCase()} - ${donation.stripePaymentId ? donation.stripePaymentId.slice(-4) : "****"}` : "CARD - ****";
  const effectiveDate = customDate ? /* @__PURE__ */ new Date(customDate + "T12:00:00") : new Date(donation.createdAt);
  const dateOptions = { year: "numeric", month: "short", day: "numeric" };
  const donationDate = effectiveDate.toLocaleDateString("en-AU", dateOptions);
  const issueDate = customDate ? effectiveDate.toLocaleDateString("en-AU", dateOptions) : currentDate.toLocaleDateString("en-AU", dateOptions);
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Receipt - ${receiptNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.4;
          color: #1f2937;
          background: white;
          margin: 0;
          padding: 40px;
          font-size: 12px;
        }
        
        .receipt-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        
        .company-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .company-logo {
          width: 120px;
          height: 120px;
          margin-bottom: 12px;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .receipt-title {
          text-align: right;
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        
        .receipt-details {
          text-align: right;
          color: #6b7280;
        }
        
        .receipt-details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          min-width: 250px;
        }
        
        .receipt-details-label {
          font-weight: 500;
          color: #374151;
        }
        
        .bill-to-section {
          margin: 40px 0;
        }
        
        .bill-to-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .bill-to-info {
          color: #6b7280;
          line-height: 1.6;
        }
        
        .donation-table {
          width: 100%;
          border-collapse: collapse;
          margin: 40px 0;
        }
        
        .donation-table th {
          text-align: left;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: #374151;
          font-size: 12px;
        }
        
        .donation-table td {
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          color: #6b7280;
          vertical-align: top;
        }
        
        .donation-description {
          max-width: 400px;
        }
        
        .amount-cell {
          text-align: right;
          font-weight: 500;
          color: #1f2937;
        }
        
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin: 30px 0;
        }
        
        .totals-table {
          min-width: 300px;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .totals-row.total {
          border-bottom: 2px solid #1f2937;
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .totals-label {
          color: #6b7280;
        }
        
        .totals-amount {
          text-align: right;
          font-weight: 500;
          color: #1f2937;
        }
        
        .footer-note {
          background: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 40px 0 30px 0;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.6;
        }
        
        .footer-info {
          color: #9ca3af;
          font-size: 10px;
          line-height: 1.6;
          margin-top: 30px;
          border-top: 1px solid #f3f4f6;
          padding-top: 20px;
        }
        
        .footer-contact {
          text-align: center;
          margin: 20px 0;
          color: #6b7280;
          font-size: 11px;
        }
        
        @media print {
          body { 
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Header with company info and receipt title -->
        <div class="header">
          <div class="company-info">
            <div class="logo-section">
              ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Aafiyaa Logo" class="company-logo" />` : ""}
              <div class="company-name">Aafiyaa LTD</div>
            </div>
          </div>
          
          <div style="text-align: right;">
            <div class="receipt-title">Donation Receipt</div>
            <div class="receipt-details">
              <div class="receipt-details-row">
                <span class="receipt-details-label">Receipt Number</span>
                <span>${receiptNumber}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Receipt Date</span>
                <span>${issueDate}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Donation Date</span>
                <span>${donationDate}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Aafiyaa ABN</span>
                <span>47684746987</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bill to section -->
        ${donation.name || donation.email ? `
        <div class="bill-to-section">
          <div class="bill-to-title">Donation from:</div>
          <div class="bill-to-info">
            ${donation.name || "Anonymous Donor"}<br>
            ${donation.email || ""}
          </div>
        </div>
        ` : ""}
        
        <!-- Donation details table -->
        <table class="donation-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="donation-description">
                <strong>[${getDonationTypeLabel(donation.type)}] Donation to Aafiyaa LTD</strong><br>
                <span style="color: #9ca3af; font-size: 11px;">
                  Payment Method: ${paymentMethodDisplay}<br>
                  ${donation.frequency !== "one-off" ? `Frequency: ${getFrequencyLabel(donation.frequency)}<br>` : ""}
                  Transaction ID: ${donation.stripePaymentId || "N/A"}
                </span>
              </td>
              <td class="amount-cell">${formatCurrency(donation.amount, donation.currency)}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Totals section -->
        <div class="totals-section">
          <div class="totals-table">
            <div class="totals-row">
              <span class="totals-label">Subtotal</span>
              <span class="totals-amount">${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
            <div class="totals-row total">
              <span>Total Amount Donated</span>
              <span>${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
          </div>
        </div>
        
        <!-- Footer note -->
        <div class="footer-note">
          <strong>This donation is tax-deductible.</strong> Please retain this receipt for your tax records. 
          Your contribution helps us provide essential healthcare services to communities in need.
        </div>
        
        <!-- Contact information -->
        <div class="footer-contact">
          Questions? We're here to help. Contact us at <strong>info@aafiyaa.com</strong> or visit <strong>aafiyaa.org</strong>
        </div>
        
        <!-- Footer info -->
        <div class="footer-info">
          Aafiyaa LTD is registered in New South Wales, Australia, ABN 47684746987. 
          Registered Office: 122 Westminster Street, Tallawong, NSW 2762, Australia.<br><br>
          
          This is an official donation receipt generated by the Aafiyaa Donation Platform. 
          Aafiyaa partners with Stripe to provide secure payment processing.
        </div>
      </div>
    </body>
    </html>
  `;
}
async function generatePDFReceipt(receiptData) {
  await ensureReceiptsDir();
  const filename = `receipt_${receiptData.receiptNumber}.pdf`;
  const filepath = path2.join(receiptsDir, filename);
  let browser;
  try {
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=site-per-process"
      ]
    };
    if (process.env.NODE_ENV === "development") {
      try {
        const { execSync } = await import("child_process");
        const chromiumPath = execSync(
          "which chromium-browser || which google-chrome || which chromium",
          { encoding: "utf8", stdio: "pipe" }
        ).trim();
        if (chromiumPath) {
          launchOptions.executablePath = chromiumPath;
        }
      } catch (error) {
        console.log("Using bundled Chromium for PDF generation");
      }
    }
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    const htmlContent = await generateReceiptHTML(receiptData);
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 3e4
    });
    await page.pdf({
      path: filepath,
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm"
      },
      printBackground: true
    });
    console.log(`PDF receipt generated successfully: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error("Error generating PDF receipt:", error);
    throw new Error(`Failed to generate PDF receipt: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// server/email-service.ts
import nodemailer from "nodemailer";
import { promises as fs3 } from "fs";
var transporter;
async function createTransporter() {
  if (config_default.EMAIL.SMTP_USER && config_default.EMAIL.SMTP_PASS) {
    console.log("Using configured SMTP settings for Gmail");
    const password = config_default.EMAIL.SMTP_PASS.replace(/\s+/g, "");
    console.log(`Using email: ${config_default.EMAIL.SMTP_USER}`);
    console.log(`Password length: ${password.length} characters (spaces removed)`);
    return nodemailer.createTransport({
      service: "gmail",
      // This uses Gmail's predefined settings
      auth: {
        user: config_default.EMAIL.SMTP_USER,
        pass: password
        // Using the cleaned password without spaces
      },
      // Debugging for development
      debug: config_default.IS_DEVELOPMENT,
      logger: config_default.IS_DEVELOPMENT
    });
  } else {
    console.log("No SMTP credentials configured, contact form will save messages without sending emails");
    return {
      sendMail: async () => {
        console.log("Email sending skipped: No SMTP credentials");
        return { messageId: "no-email-sent" };
      },
      verify: async () => {
        return false;
      }
    };
  }
}
(async () => {
  transporter = await createTransporter();
})();
async function sendContactFormEmail(message) {
  try {
    if (!transporter) {
      transporter = await createTransporter();
    }
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config_default.EMAIL.FROM}>`,
      to: config_default.EMAIL.TO,
      subject: `New Contact Form Message: ${message.subject}`,
      text: `
Name: ${message.name}
Email: ${message.email}
Subject: ${message.subject}

Message:
${message.message}

Submitted on: ${new Date(message.createdAt).toLocaleString()}
`,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${message.name}</p>
<p><strong>Email:</strong> ${message.email}</p>
<p><strong>Subject:</strong> ${message.subject}</p>
<h3>Message:</h3>
<p>${message.message.replace(/\n/g, "<br>")}</p>
<p><small>Submitted on: ${new Date(message.createdAt).toLocaleString()}</small></p>
`
    };
    const info = await transporter.sendMail(emailContent);
    console.log("Contact form email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending contact form email:", error);
    return false;
  }
}
async function sendPDFReceipt(donation, receiptNumber, pdfPath, caseTitle) {
  try {
    if (!transporter || !donation.email) {
      console.log(`PDF receipt email sending skipped: ${!transporter ? "No transporter" : "No recipient email"}`);
      return false;
    }
    try {
      await fs3.access(pdfPath);
    } catch (error) {
      console.error("PDF file not found:", pdfPath);
      return false;
    }
    const formattedAmount = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: donation.currency || "AUD"
    }).format(donation.amount);
    const donationTypeLabel = getDonationTypeLabel2(donation.type);
    const frequencyLabel = getFrequencyLabel2(donation.frequency);
    const donationDate = new Date(donation.createdAt).toLocaleString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config_default.EMAIL.FROM}>`,
      to: donation.email,
      subject: `Your Donation Receipt - ${receiptNumber}`,
      text: `
Dear ${donation.name || "Valued Supporter"},

Thank you for your generous donation to Aafiyaa Charity Clinics!

Your donation receipt is attached as a PDF file for your records.

Donation Details:
- Receipt Number: ${receiptNumber}
- Amount: ${formattedAmount}
- Type: ${donationTypeLabel}
- Frequency: ${frequencyLabel}
- Date: ${donationDate}
${caseTitle ? `- Supporting Case: ${caseTitle}` : ""}
${donation.destinationProject ? `- Destination: ${donation.destinationProject}` : ""}

This receipt is valid for tax deduction purposes. Please consult with your tax advisor regarding the deductibility of your charitable contributions.

Your support helps us provide essential healthcare services to communities in need around the world.

Thank you again for your generosity!

With gratitude,
The Aafiyaa Charity Clinics Team

---
This receipt has been electronically generated and is valid without a signature.
Please retain this email and the attached PDF for your tax records.
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; }
    .receipt-info { background-color: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .receipt-number { font-size: 18px; font-weight: bold; color: #14b8a6; margin-bottom: 10px; }
    .donation-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: 600; color: #374151; }
    .detail-value { color: #1f2937; }
    .amount-highlight { text-align: center; background: linear-gradient(135deg, #14b8a6, #10b981); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount-text { font-size: 28px; font-weight: bold; margin: 0; }
    .tax-info { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .tax-info h3 { color: #065f46; margin: 0 0 10px 0; }
    .tax-info p { color: #047857; margin: 0; }
    .attachment-note { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .attachment-note h4 { color: #92400e; margin: 0 0 5px 0; }
    .attachment-note p { color: #d97706; margin: 0; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\u{1F3E5} Aafiyaa Charity Clinics</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Healthcare & Compassion</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Generous Donation!</h2>
      
      <div class="receipt-info">
        <div class="receipt-number">Receipt Number: ${receiptNumber}</div>
        <p style="margin: 0; color: #047857;">Your official donation receipt is attached as a PDF file.</p>
      </div>
      
      <div class="amount-highlight">
        <div class="amount-text">${formattedAmount}</div>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Total Donation Amount</p>
      </div>
      
      <div class="donation-details">
        <h3 style="margin: 0 0 15px 0; color: #374151;">Donation Summary</h3>
        <div class="detail-row">
          <span class="detail-label">Type:</span>
          <span class="detail-value">${donationTypeLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Frequency:</span>
          <span class="detail-value">${frequencyLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${donationDate}</span>
        </div>
        ${donation.name ? `
        <div class="detail-row">
          <span class="detail-label">Donor:</span>
          <span class="detail-value">${donation.name}</span>
        </div>
        ` : ""}
        ${caseTitle ? `
        <div class="detail-row">
          <span class="detail-label">Supporting Case:</span>
          <span class="detail-value">${caseTitle}</span>
        </div>
        ` : ""}
        ${donation.destinationProject ? `
        <div class="detail-row">
          <span class="detail-label">Destination:</span>
          <span class="detail-value">${donation.destinationProject}</span>
        </div>
        ` : ""}
      </div>
      
      <div class="attachment-note">
        <h4>\u{1F4CE} Receipt Attached</h4>
        <p>Your official PDF receipt is attached to this email. This document is valid for tax deduction purposes and should be retained for your records.</p>
      </div>
      
      <div class="tax-info">
        <h3>Tax Deduction Information</h3>
        <p>This receipt confirms your charitable donation to Aafiyaa Charity Clinics. Your contribution is tax-deductible to the extent allowed by law. Please consult with your tax advisor regarding the deductibility of your charitable contributions.</p>
      </div>
      
      <p style="margin: 30px 0 20px 0; text-align: center; color: #6b7280;">
        Your support helps us provide essential healthcare services to communities in need around the world.
      </p>
      
      <p style="text-align: center; font-weight: 600; color: #14b8a6;">
        Thank you for making a difference! \u{1F64F}
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Aafiyaa Charity Clinics</strong><br>
      Email: info@aafiyaa.com | Website: www.aafiyaa.com</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This receipt has been electronically generated and is valid without a signature.<br>
        Please retain this email and the attached PDF for your tax records.
      </p>
    </div>
  </div>
</body>
</html>
`,
      attachments: [
        {
          filename: `receipt_${receiptNumber}.pdf`,
          path: pdfPath,
          contentType: "application/pdf"
        }
      ]
    };
    const info = await transporter.sendMail(emailContent);
    console.log(`PDF receipt email sent successfully: ${info.messageId} to ${donation.email}`);
    return true;
  } catch (error) {
    console.error("Error sending PDF receipt email:", error);
    return false;
  }
}
function getDonationTypeLabel2(type) {
  switch (type.toLowerCase()) {
    case "zakaat":
      return "Zakaat";
    case "sadqah":
      return "Sadqah";
    case "interest":
      return "Interest";
    default:
      return type;
  }
}
function getFrequencyLabel2(frequency) {
  switch (frequency.toLowerCase()) {
    case "one-off":
      return "One-time donation";
    case "weekly":
      return "Weekly recurring donation";
    case "monthly":
      return "Monthly recurring donation";
    default:
      return frequency;
  }
}
async function verifyEmailService() {
  if (!transporter) {
    transporter = await createTransporter();
  }
  if (!config_default.EMAIL.SMTP_USER || !config_default.EMAIL.SMTP_PASS) {
    return false;
  }
  try {
    await transporter.verify();
    console.log("Email service is ready to send messages");
    return true;
  } catch (error) {
    console.error("Email service verification failed:", error);
    return false;
  }
}

// server/webhook-handlers.ts
async function processReceiptGeneration(donation) {
  try {
    if (!donation.email) {
      console.log(`Skipping receipt generation for donation ${donation.id}: No email provided`);
      return;
    }
    const receiptNumber = generateReceiptNumber();
    let caseTitle = void 0;
    if (donation.caseId) {
      try {
        const caseData = await storage.getCase(donation.caseId);
        caseTitle = caseData?.title;
      } catch (error) {
        console.warn(`Could not retrieve case title for case ${donation.caseId}:`, error);
      }
    }
    const receiptData = {
      donationId: donation.id,
      receiptNumber,
      amount: donation.amount,
      currency: donation.currency,
      donorName: donation.name || null,
      donorEmail: donation.email,
      donationType: donation.type,
      caseId: donation.caseId || null,
      status: "pending"
    };
    const receipt = await storage.createReceipt(receiptData);
    console.log(`Receipt record created: ${receipt.id} for donation ${donation.id}`);
    try {
      const pdfPath = await generatePDFReceipt({
        donation,
        receiptNumber,
        caseTitle
      });
      await storage.updateReceiptStatus(receipt.id, "generated", pdfPath);
      console.log(`PDF receipt generated: ${pdfPath}`);
      const emailSent = await sendPDFReceipt(donation, receiptNumber, pdfPath, caseTitle);
      if (emailSent) {
        await storage.updateReceiptSentAt(receipt.id);
        console.log(`PDF receipt emailed successfully to ${donation.email}`);
        logWebhookEvent("RECEIPT_SENT", {
          donationId: donation.id,
          receiptId: receipt.id,
          receiptNumber,
          email: donation.email
        });
      } else {
        await storage.updateReceiptStatus(receipt.id, "failed", pdfPath, "Email sending failed");
        console.error(`Failed to send PDF receipt email for donation ${donation.id}`);
        logWebhookEvent("RECEIPT_SEND_FAILED", {
          donationId: donation.id,
          receiptId: receipt.id,
          receiptNumber,
          error: "Email sending failed"
        });
      }
    } catch (pdfError) {
      await storage.updateReceiptStatus(receipt.id, "failed", void 0, pdfError.message);
      console.error(`Failed to generate PDF receipt for donation ${donation.id}:`, pdfError);
      logWebhookEvent("RECEIPT_GENERATION_FAILED", {
        donationId: donation.id,
        receiptId: receipt.id,
        receiptNumber,
        error: pdfError.message
      });
    }
  } catch (error) {
    console.error(`Error in receipt generation process for donation ${donation.id}:`, error);
    logWebhookEvent("RECEIPT_PROCESS_ERROR", {
      donationId: donation.id,
      error: error.message
    });
  }
}
var newrelic = null;
var logWebhookEvent = (event, details) => {
  const logMessage = `[WEBHOOK-${event.toUpperCase()}]`;
  console.log(logMessage, JSON.stringify(details, null, 2));
  if (newrelic?.recordCustomEvent) {
    newrelic.recordCustomEvent("WebhookEvent", {
      eventType: event.toUpperCase(),
      ...details,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
};
var logOrphanedPayment = (paymentIntent) => {
  let createdDate = /* @__PURE__ */ new Date();
  try {
    if (paymentIntent.created && typeof paymentIntent.created === "number") {
      createdDate = new Date(paymentIntent.created * 1e3);
      if (isNaN(createdDate.getTime())) {
        createdDate = /* @__PURE__ */ new Date();
      }
    }
  } catch (error) {
    createdDate = /* @__PURE__ */ new Date();
  }
  const orphanedDetails = {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    // Convert from cents
    currency: paymentIntent.currency?.toUpperCase() || "UNKNOWN",
    status: paymentIntent.status,
    created: createdDate.toISOString(),
    metadata: paymentIntent.metadata || {},
    description: paymentIntent.description || null,
    severity: "HIGH"
  };
  console.log("[WEBHOOK-ORPHANED_PAYMENT]", JSON.stringify(orphanedDetails, null, 2));
  if (newrelic?.recordCustomEvent) {
    newrelic.recordCustomEvent("OrphanedPayment", {
      ...orphanedDetails,
      alertLevel: "CRITICAL",
      requiresInvestigation: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (newrelic?.noticeError) {
    newrelic.noticeError(new Error("Orphaned payment detected"), {
      customAttributes: orphanedDetails
    });
  }
};
var findDonationByPaymentIntent = async (paymentIntent) => {
  if (!paymentIntent || !paymentIntent.id) {
    console.warn("Payment intent missing required ID field");
    return null;
  }
  const donations2 = await storage.getDonations();
  let donation = donations2.find((d) => d.stripePaymentId === paymentIntent.id);
  if (donation) {
    logWebhookEvent("MATCH_FOUND", { strategy: "direct_id", donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }
  donation = donations2.find((d) => d.stripePaymentId === `${paymentIntent.id}|${paymentIntent.client_secret}`);
  if (donation) {
    logWebhookEvent("MATCH_FOUND", { strategy: "combined_format", donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }
  donation = donations2.find((d) => d.stripePaymentId && d.stripePaymentId.includes(paymentIntent.id));
  if (donation) {
    logWebhookEvent("MATCH_FOUND", { strategy: "partial_match", donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }
  if (paymentIntent.metadata && paymentIntent.metadata.donationId) {
    const donationId = parseInt(paymentIntent.metadata.donationId);
    if (!isNaN(donationId)) {
      donation = await storage.getDonation(donationId);
      if (donation) {
        logWebhookEvent("MATCH_FOUND", { strategy: "metadata", donationId: donation.id, paymentIntentId: paymentIntent.id });
        return donation;
      }
    }
  }
  donation = donations2.find(
    (d) => paymentIntent.metadata && paymentIntent.metadata.donationId && d.id === parseInt(paymentIntent.metadata.donationId)
  );
  if (donation) {
    logWebhookEvent("MATCH_FOUND", { strategy: "direct_id", donationId: donation.id, paymentIntentId: paymentIntent.id });
    return donation;
  }
  const paymentAmount = paymentIntent.amount / 100;
  const paymentTime = new Date(paymentIntent.created * 1e3);
  const timeWindow = 10 * 60 * 1e3;
  donation = donations2.find((d) => {
    const amountMatch = Math.abs(d.amount - paymentAmount) < 0.01;
    const timeMatch = Math.abs(new Date(d.createdAt).getTime() - paymentTime.getTime()) < timeWindow;
    const statusMatch = d.status === "processing" || d.status === "pending";
    return amountMatch && timeMatch && statusMatch;
  });
  if (donation) {
    logWebhookEvent("MATCH_FOUND", {
      strategy: "amount_time_proximity",
      donationId: donation.id,
      paymentIntentId: paymentIntent.id,
      amountMatch: paymentAmount,
      timeMatch: paymentTime
    });
    return donation;
  }
  logWebhookEvent("NO_MATCH_FOUND", {
    paymentIntentId: paymentIntent.id,
    amount: paymentAmount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    metadata: paymentIntent.metadata,
    totalDonations: donations2.length,
    processingDonations: donations2.filter((d) => d.status === "processing").length
  });
  return null;
};
var handlePaymentIntentSucceeded = async (paymentIntent) => {
  if (!paymentIntent || typeof paymentIntent !== "object") {
    console.warn("Invalid payment intent object received");
    return;
  }
  const paymentId = paymentIntent.id || null;
  const amount = paymentIntent.amount || 0;
  logWebhookEvent("PAYMENT_INTENT_SUCCEEDED", { id: paymentId, amount });
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    if (donation) {
      if (donation.status === "completed") {
        logWebhookEvent("ALREADY_COMPLETED", { donationId: donation.id, paymentIntentId: paymentIntent.id });
        return;
      }
      const updatedDonation = await storage.updateDonationStatus(donation.id, "completed", paymentIntent.id);
      if (!updatedDonation) {
        logWebhookEvent("DONATION_UPDATE_FAILED", { donationId: donation.id, paymentIntentId: paymentIntent.id });
        return;
      }
      if (updatedDonation) {
        logWebhookEvent("DONATION_COMPLETED", {
          donationId: donation.id,
          paymentIntentId: paymentIntent.id,
          amount: donation.amount,
          currency: donation.currency
        });
        if (donation.caseId) {
          try {
            const updatedCase = await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
            if (updatedCase) {
              logWebhookEvent("CASE_AMOUNT_UPDATED", {
                caseId: donation.caseId,
                amount: donation.amount,
                newTotal: updatedCase.amountCollected
              });
            } else {
              logWebhookEvent("CASE_UPDATE_ERROR", {
                caseId: donation.caseId,
                error: "Case not found or update failed"
              });
            }
          } catch (caseError) {
            logWebhookEvent("CASE_UPDATE_ERROR", {
              caseId: donation.caseId,
              error: caseError.message,
              amount: donation.amount
            });
          }
        }
        try {
          await processReceiptGeneration(updatedDonation);
        } catch (receiptError) {
          console.error(`Receipt generation failed for donation ${donation.id}:`, receiptError);
        }
      } else {
        logWebhookEvent("DONATION_UPDATE_FAILED", { donationId: donation.id, paymentIntentId: paymentIntent.id });
      }
    } else {
      logOrphanedPayment(paymentIntent);
    }
  } catch (error) {
    logWebhookEvent("HANDLER_ERROR", {
      paymentIntentId: paymentIntent.id,
      error: error.message,
      stack: error.stack
    });
  }
};
var handlePaymentIntentFailed = async (paymentIntent) => {
  logWebhookEvent("PAYMENT_INTENT_FAILED", { id: paymentIntent.id, amount: paymentIntent.amount });
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    if (donation) {
      const updatedDonation = await storage.updateDonationStatus(donation.id, "failed", paymentIntent.id);
      if (updatedDonation) {
        logWebhookEvent("DONATION_FAILED", { donationId: donation.id, paymentIntentId: paymentIntent.id });
      } else {
        logWebhookEvent("DONATION_UPDATE_FAILED", { donationId: donation.id, paymentIntentId: paymentIntent.id });
      }
    } else {
      logWebhookEvent("FAILED_PAYMENT_NO_DONATION", { paymentIntentId: paymentIntent.id });
    }
  } catch (error) {
    logWebhookEvent("FAILURE_HANDLER_ERROR", {
      paymentIntentId: paymentIntent.id,
      error: error.message
    });
  }
};
var handlePaymentIntentCreated = async (paymentIntent) => {
  if (!paymentIntent || paymentIntent.status === "succeeded" || paymentIntent.status === "canceled") {
    return;
  }
  logWebhookEvent("PAYMENT_INTENT_CREATED", {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    status: paymentIntent.status,
    metadata: paymentIntent.metadata || {}
  });
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    if (donation) {
      if (!donation.stripePaymentId) {
        await storage.updateDonationStatus(donation.id, donation.status, paymentIntent.id);
        logWebhookEvent("PAYMENT_INTENT_LINKED", {
          donationId: donation.id,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        });
      }
      logWebhookEvent("INCOMPLETE_PAYMENT_TRACKED", {
        donationId: donation.id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        // Convert from cents
        currency: paymentIntent.currency?.toUpperCase() || "UNKNOWN",
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === "requires_action",
        requiresConfirmation: paymentIntent.status === "requires_confirmation"
      });
    } else {
      logWebhookEvent("UNMATCHED_PAYMENT_INTENT_CREATED", {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency?.toUpperCase() || "UNKNOWN",
        status: paymentIntent.status,
        metadata: paymentIntent.metadata || {}
      });
    }
  } catch (error) {
    logWebhookEvent("PAYMENT_INTENT_CREATED_ERROR", {
      paymentIntentId: paymentIntent.id,
      error: error.message
    });
  }
};
var handlePaymentIntentCanceled = async (paymentIntent) => {
  logWebhookEvent("PAYMENT_INTENT_CANCELED", {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    status: paymentIntent.status,
    cancellation_reason: paymentIntent.cancellation_reason || "unknown"
  });
  try {
    const donation = await findDonationByPaymentIntent(paymentIntent);
    if (donation) {
      if (donation.status === "pending") {
        await storage.updateDonationStatus(donation.id, "cancelled", paymentIntent.id);
        logWebhookEvent("DONATION_CANCELLED", {
          donationId: donation.id,
          paymentIntentId: paymentIntent.id,
          reason: paymentIntent.cancellation_reason || "payment_intent_canceled"
        });
      }
    }
  } catch (error) {
    logWebhookEvent("PAYMENT_INTENT_CANCEL_ERROR", {
      paymentIntentId: paymentIntent.id,
      error: error.message
    });
  }
};

// server/routes.ts
var newrelic2 = null;
var stripe;
try {
  if (config_default.STRIPE.SECRET_KEY) {
    console.log(`[STRIPE-INIT] Initializing Stripe in ${config_default.NODE_ENV} mode`);
    console.log(`[STRIPE-INIT] Using key type: ${config_default.STRIPE.SECRET_KEY.startsWith("sk_test") ? "TEST" : "LIVE"}`);
    console.log(`[STRIPE-INIT] API Version: 2025-03-31.basil`);
    stripe = new Stripe(config_default.STRIPE.SECRET_KEY, {
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
    stripe = void 0;
  }
} catch (error) {
  console.error(`[STRIPE-ERROR] Failed to initialize Stripe:`, error);
  stripe = void 0;
}
var exchangeRateUrl = "https://open.er-api.com/v6/latest/USD";
var PAYPAL_API_BASE = config_default.IS_PRODUCTION ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
var getPayPalAccessToken = async () => {
  if (!config_default.PAYPAL.CLIENT_ID || !config_default.PAYPAL.SECRET_KEY) {
    throw new Error("PayPal credentials are missing");
  }
  const auth = Buffer.from(`${config_default.PAYPAL.CLIENT_ID}:${config_default.PAYPAL.SECRET_KEY}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${auth}`
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json();
  return data.access_token;
};
async function registerRoutes(app2) {
  const isAdminAuthenticated = (req, res, next) => {
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
  app2.get("/api/stats", async (req, res) => {
    try {
      const stats2 = await storage.getStats();
      res.json(stats2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.post("/api/admin/update-stats", isAdminAuthenticated, async (req, res) => {
    try {
      const { totalPatients, monthlyPatients } = req.body;
      if (typeof totalPatients !== "number" || typeof monthlyPatients !== "number") {
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
  app2.post("/api/admin/generate-receipt", isAdminAuthenticated, async (req, res) => {
    try {
      const manualReceiptSchema = z2.object({
        amount: z2.number().positive("Amount must be a positive number"),
        email: z2.string().email("Invalid email address").trim().toLowerCase(),
        donationType: z2.enum(["zakaat", "sadqah", "interest"], {
          errorMap: () => ({ message: "Invalid donation type" })
        }),
        currency: z2.enum(["AUD", "USD", "GBP", "EUR", "PKR"], {
          errorMap: () => ({ message: "Invalid currency" })
        }),
        receiptDate: z2.string().optional()
      });
      const validationResult = manualReceiptSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      const { amount, email, donationType, currency, receiptDate } = validationResult.data;
      const donation = await storage.createDonation({
        type: donationType,
        amount,
        currency,
        frequency: "one-off",
        status: "completed",
        paymentMethod: "manual",
        email,
        caseId: null,
        destinationProject: null
      });
      const receiptNumber = generateReceiptNumber();
      const receiptRecord = await storage.createReceipt({
        donationId: donation.id,
        receiptNumber,
        amount,
        currency,
        donorName: null,
        donorEmail: email,
        donationType,
        caseId: null,
        status: "pending"
      });
      try {
        const pdfPath = await generatePDFReceipt({
          donation,
          receiptNumber,
          customDate: receiptDate
        });
        await storage.updateReceiptStatus(receiptRecord.id, "generated", pdfPath);
        const emailSent = await sendPDFReceipt(donation, receiptNumber, pdfPath);
        if (emailSent) {
          await storage.updateReceiptSentAt(receiptRecord.id);
          res.json({
            success: true,
            message: `Receipt sent successfully to ${email}`,
            receiptNumber,
            donationId: donation.id
          });
        } else {
          await storage.updateReceiptStatus(receiptRecord.id, "failed");
          res.status(500).json({
            success: false,
            message: "Receipt was generated but failed to send email"
          });
        }
      } catch (pdfError) {
        await storage.updateReceiptStatus(receiptRecord.id, "failed");
        throw pdfError;
      }
    } catch (error) {
      console.error("Error generating manual receipt:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate receipt"
      });
    }
  });
  app2.get("/api/endorsements", async (req, res) => {
    try {
      const endorsements2 = await storage.getEndorsements();
      res.json(endorsements2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch endorsements" });
    }
  });
  app2.get("/api/exchange-rates", async (req, res) => {
    try {
      const response = await fetch(exchangeRateUrl);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });
  app2.get("/api/download-receipt/:donationId", async (req, res) => {
    try {
      const donationId = parseInt(req.params.donationId);
      if (isNaN(donationId)) {
        return res.status(400).json({ message: "Invalid donation ID" });
      }
      const donation = await storage.getDonation(donationId);
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      const receipts2 = await storage.getReceiptsByDonationId(donationId);
      const receipt = receipts2.find((r) => r.filePath && (r.status === "sent" || r.status === "generated" || r.status === "failed"));
      if (!receipt || !receipt.filePath) {
        return res.status(404).json({ message: "Receipt not found or not ready yet" });
      }
      const fs5 = await import("fs");
      try {
        await fs5.promises.access(receipt.filePath);
      } catch (error) {
        return res.status(404).json({ message: "Receipt file not found" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="aafiyaa-receipt-${receipt.receiptNumber}.pdf"`);
      const path5 = await import("path");
      const absolutePath = path5.resolve(receipt.filePath);
      res.sendFile(absolutePath);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      res.status(500).json({ message: "Error downloading receipt" });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const contactData = contactFormSchema.parse(req.body);
      const savedMessage = await storage.createContactMessage(contactData);
      let emailSent = false;
      try {
        emailSent = await sendContactFormEmail(savedMessage);
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }
      console.log("Contact form submission:", savedMessage);
      console.log("Email notification sent:", emailSent ? "Yes" : "No (SMTP not configured or error)");
      res.status(201).json({
        success: true,
        messageId: savedMessage.id,
        emailSent,
        message: "Thank you for your message. We'll get back to you soon!"
      });
    } catch (error) {
      console.error("Contact form error:", error);
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
  app2.get("/api/contact-messages", isAdminAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve contact messages" });
    }
  });
  app2.post("/api/contact-messages/:id/read", isAdminAuthenticated, async (req, res) => {
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
  app2.get("/api/currency-by-ip", async (req, res) => {
    try {
      const testRegion = req.query.region;
      if (testRegion) {
        const regionToCurrency = {
          "us": "USD",
          "uk": "GBP",
          "eu": "EUR",
          "jp": "JPY",
          "in": "INR",
          "au": "AUD",
          "ca": "CAD",
          "ch": "CHF",
          "cn": "CNY",
          "hk": "HKD",
          "pk": "PKR",
          "sa": "SAR",
          "ae": "AED",
          "my": "MYR",
          "sg": "SGD",
          "za": "ZAR"
        };
        const currency = regionToCurrency[testRegion.toLowerCase()];
        if (currency) {
          return res.json({ currency, source: "url-param" });
        }
      }
      try {
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "8.8.8.8";
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const ipData = await response.json();
        if (ipData.currency && !ipData.error) {
          return res.json({ currency: ipData.currency, source: "ip-api" });
        }
      } catch (geoError) {
        console.error("Geolocation API error:", geoError);
      }
      res.json({ currency: "AUD", source: "default" });
    } catch (error) {
      console.error("Currency detection error:", error);
      res.json({ currency: "AUD", source: "error-fallback" });
    }
  });
  app2.get("/api/admin/verify-email-service", isAdminAuthenticated, async (req, res) => {
    try {
      const isVerified = await verifyEmailService();
      res.json({
        success: isVerified,
        message: isVerified ? "Email service is configured and ready to send emails" : "Email service configuration failed or is missing SMTP credentials"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Email service verification error: ${error.message}`
      });
    }
  });
  app2.post("/api/admin/test-email", isAdminAuthenticated, async (req, res) => {
    try {
      const { recipientEmail } = req.body;
      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          message: "Recipient email is required"
        });
      }
      const testMessage = {
        id: 0,
        name: "Admin Test",
        email: recipientEmail,
        subject: "Email System Test",
        message: "This is a test email to verify that the email system is working correctly.",
        createdAt: /* @__PURE__ */ new Date(),
        isRead: false
      };
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
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error sending test email: ${error.message}`
      });
    }
  });
  app2.post("/api/donations", async (req, res) => {
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
  app2.post("/api/update-donation-status", async (req, res) => {
    try {
      const { donationId, status, paymentMethod, paymentId, email, name, firstName, lastName, skipReceipt } = req.body;
      console.log(`[UPDATE-DONATION-STATUS] Request data:`, {
        donationId,
        status,
        paymentMethod,
        paymentId,
        email: email || "(empty)",
        name: name || "(empty)"
      });
      if (!donationId || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const payment_id = paymentId || `${paymentMethod}_${Date.now()}`;
      let donation = await storage.updateDonationStatus(donationId, status, payment_id);
      if (donation && (email || name)) {
        console.log(`[UPDATE-DONATION-STATUS] Updating donor info:`, {
          donationId,
          email: email || "(empty)",
          name: name || "(empty)"
        });
        const finalFirstName = firstName || (name ? name.split(" ")[0] : "");
        const finalLastName = lastName || (name ? name.split(" ").slice(1).join(" ") : "");
        const finalName = name || `${firstName || ""} ${lastName || ""}`.trim();
        donation = await storage.updateDonationDonor(
          donationId,
          finalName,
          email || donation.email || "",
          finalFirstName,
          finalLastName
        );
        console.log(`[UPDATE-DONATION-STATUS] Updated donation:`, {
          id: donation?.id,
          email: donation?.email || "(empty)",
          name: donation?.name || "(empty)"
        });
      }
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      console.log(`[RECEIPT-CHECK] Donation ${donationId} status: ${status}, email: ${donation.email || "(empty)"}, skipReceipt: ${skipReceipt || false}`);
      if (status === "completed" && !skipReceipt && donation.email && donation.name) {
        try {
          console.log(`[RECEIPT-GENERATION] Starting PDF receipt generation for donation ${donationId}`);
          const receiptNumber = generateReceiptNumber();
          let caseTitle = void 0;
          if (donation.caseId) {
            try {
              const caseData = await storage.getCase(donation.caseId);
              caseTitle = caseData?.title;
            } catch (error) {
              console.warn(`Could not retrieve case title for case ${donation.caseId}:`, error);
            }
          }
          const receiptData = {
            donationId: donation.id,
            receiptNumber,
            amount: donation.amount,
            currency: donation.currency,
            donorName: donation.name || null,
            donorEmail: donation.email,
            donationType: donation.type,
            caseId: donation.caseId || null,
            status: "pending"
          };
          const receipt = await storage.createReceipt(receiptData);
          console.log(`Receipt record created: ${receipt.id} for donation ${donation.id}`);
          const pdfPath = await generatePDFReceipt({
            donation,
            receiptNumber,
            caseTitle
          });
          await storage.updateReceiptStatus(receipt.id, "generated", pdfPath);
          console.log(`PDF receipt generated: ${pdfPath}`);
          const emailSent = await sendPDFReceipt(donation, receiptNumber, pdfPath, caseTitle);
          if (emailSent) {
            await storage.updateReceiptSentAt(receipt.id);
            console.log(`PDF receipt emailed successfully to ${donation.email}`);
          } else {
            await storage.updateReceiptStatus(receipt.id, "failed", pdfPath, "Email sending failed");
            console.error(`Failed to send PDF receipt email for donation ${donation.id}`);
          }
        } catch (receiptError) {
          console.error(`Receipt generation failed for donation ${donationId}:`, receiptError);
        }
      } else if (status === "completed" && (skipReceipt || !donation.email || !donation.name)) {
        console.log(`[RECEIPT-SKIP] PDF receipt generation skipped for donation ${donationId} - anonymous donation`);
      }
      res.status(200).json({ success: true, donation });
    } catch (error) {
      res.status(500).json({ message: "Failed to update donation status" });
    }
  });
  app2.post("/api/update-donation-amount", async (req, res) => {
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
  app2.post("/api/paypal/verify-payment", async (req, res) => {
    try {
      const { orderId, donationId } = req.body;
      if (!orderId || !donationId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!config_default.PAYPAL.CLIENT_ID || !config_default.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ message: "PayPal is not properly configured" });
      }
      try {
        const accessToken = await getPayPalAccessToken();
        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          }
        });
        const orderData = await response.json();
        if (orderData.status === "COMPLETED") {
          const donation = await storage.updateDonationStatus(
            donationId,
            "completed",
            `paypal_${orderId}`
          );
          const updatedDonation = await storage.getDonation(donationId);
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
          return res.status(200).json({
            success: true,
            verified: false,
            status: orderData.status,
            message: "Payment not completed"
          });
        }
      } catch (error) {
        console.error("PayPal verification error:", error);
        return res.status(500).json({
          success: false,
          message: `PayPal verification failed: ${error.message}`
        });
      }
    } catch (error) {
      console.error("PayPal API error:", error);
      res.status(500).json({
        success: false,
        message: `Failed to verify PayPal payment: ${error.message}`
      });
    }
  });
  app2.post("/api/paypal/create-order", async (req, res) => {
    try {
      const { amount, currency, donationId } = req.body;
      if (!amount || !currency) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      if (!config_default.PAYPAL.CLIENT_ID || !config_default.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ error: "PayPal configuration is missing" });
      }
      console.log(`[PAYPAL] Creating order for ${currency} ${amount}`);
      try {
        const accessToken = await getPayPalAccessToken();
        const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: {
                  currency_code: currency.toUpperCase(),
                  value: amount.toString()
                },
                description: "Donation to Aafiyaa Charity Clinics"
              }
            ],
            application_context: {
              brand_name: "Aafiyaa Charity Clinics",
              landing_page: "BILLING",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW"
            }
          })
        });
        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error("[PAYPAL] Error creating order:", errorData);
          return res.status(500).json({ error: "Failed to create PayPal order" });
        }
        const orderData = await orderResponse.json();
        console.log("[PAYPAL] Order created:", orderData.id);
        if (donationId) {
          await storage.updateDonationStatus(donationId, "pending", orderData.id);
          console.log(`[PAYPAL] Updated donation ${donationId} with payment ID ${orderData.id}`);
        }
        res.status(200).json(orderData);
      } catch (error) {
        console.error("[PAYPAL] Error in create-order endpoint:", error);
        res.status(500).json({ error: `PayPal API error: ${error.message}` });
      }
    } catch (error) {
      console.error("[PAYPAL] Error processing request:", error);
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  });
  app2.post("/api/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }
      if (!config_default.PAYPAL.CLIENT_ID || !config_default.PAYPAL.SECRET_KEY) {
        return res.status(500).json({ error: "PayPal configuration is missing" });
      }
      console.log(`[PAYPAL] Capturing order ${orderId}`);
      try {
        const accessToken = await getPayPalAccessToken();
        const captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          }
        });
        if (!captureResponse.ok) {
          const errorData = await captureResponse.json();
          console.error("[PAYPAL] Error capturing order:", errorData);
          return res.status(500).json({ error: "Failed to capture PayPal order" });
        }
        const captureData = await captureResponse.json();
        console.log("[PAYPAL] Order captured successfully:", captureData.id);
        const donations2 = await storage.getDonations();
        const donation = donations2.find((d) => d.stripePaymentId === orderId);
        if (donation) {
          console.log(`[PAYPAL] Found donation ${donation.id} for order ${orderId}`);
          await storage.updateDonationStatus(donation.id, "completed");
          if (donation.caseId) {
            await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
            console.log(`[PAYPAL] Updated case ${donation.caseId} amount collected by ${donation.amount}`);
          }
        } else {
          console.log(`[PAYPAL] No donation found for order ${orderId}`);
        }
        res.status(200).json(captureData);
      } catch (error) {
        console.error("[PAYPAL] Error in capture-order endpoint:", error);
        res.status(500).json({ error: `PayPal API error: ${error.message}` });
      }
    } catch (error) {
      console.error("[PAYPAL] Error processing request:", error);
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  });
  app2.post("/api/update-donation-donor", async (req, res) => {
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
  app2.post("/api/stripe-payment-success", async (req, res) => {
    try {
      const { donationId, paymentIntentId } = req.body;
      if (!donationId) {
        return res.status(400).json({ message: "Missing donation ID" });
      }
      console.log(`[STRIPE-CLIENT] Payment success notification for donation ${donationId}`);
      const donation = await storage.getDonation(parseInt(donationId));
      if (!donation) {
        console.error(`[STRIPE-CLIENT] Donation not found: ${donationId}`);
        return res.status(404).json({ message: "Donation not found" });
      }
      const wasAlreadyCompleted = donation.status === "completed";
      if (!wasAlreadyCompleted) {
        await storage.updateDonationStatus(
          donation.id,
          "completed",
          paymentIntentId || donation.stripePaymentId
        );
        console.log(`[STRIPE-CLIENT] Updated donation ${donation.id} status to completed`);
        if (donation.caseId) {
          await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
          console.log(`[STRIPE-CLIENT] Updated case ${donation.caseId} amount collected by ${donation.amount}`);
        }
      } else {
        console.log(`[STRIPE-CLIENT] Donation ${donation.id} was already completed, skipping case update`);
      }
      res.status(200).json({ success: true, message: "Payment success processed" });
    } catch (error) {
      console.error("[STRIPE-CLIENT] Error processing payment success:", error.message);
      res.status(500).json({ message: "Failed to process payment success" });
    }
  });
  app2.post("/api/create-payment-intent", async (req, res) => {
    console.log(`[STRIPE-DEBUG] Creating/updating payment intent in ${config_default.NODE_ENV} mode`);
    console.log(`[STRIPE-DEBUG] Stripe key type: ${config_default.STRIPE.SECRET_KEY?.startsWith("sk_test") ? "TEST" : "LIVE"}`);
    if (!stripe) {
      console.error("[STRIPE-ERROR] Stripe is not configured");
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const { amount, currency, donationId, existingPaymentIntentId } = req.body;
      console.log(`[STRIPE-DEBUG] Payment request: amount=${amount}, currency=${currency}, donationId=${donationId}, existing=${existingPaymentIntentId}`);
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      if (!currency) {
        return res.status(400).json({ message: "Currency is required" });
      }
      if (!donationId) {
        return res.status(400).json({ message: "Donation ID is required" });
      }
      const supportedCurrencies = ["aud", "usd", "eur", "gbp", "inr", "cad", "nzd"];
      const currencyLower = currency.toLowerCase();
      if (!supportedCurrencies.includes(currencyLower)) {
        return res.status(400).json({ message: `Currency ${currency} is not supported` });
      }
      const donation = await storage.getDonation(Number(donationId));
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      let paymentIntent = null;
      let existingPaymentIntentIdToUse = existingPaymentIntentId;
      if (!existingPaymentIntentIdToUse && donation.stripePaymentId) {
        const paymentIdParts = donation.stripePaymentId.split("|");
        existingPaymentIntentIdToUse = paymentIdParts[0];
      }
      if (existingPaymentIntentIdToUse) {
        try {
          console.log(`[STRIPE-DEBUG] Checking existing PaymentIntent: ${existingPaymentIntentIdToUse}`);
          const existingIntent = await stripe.paymentIntents.retrieve(existingPaymentIntentIdToUse);
          if (existingIntent.status === "requires_payment_method" || existingIntent.status === "requires_confirmation" || existingIntent.status === "requires_action") {
            if (existingIntent.metadata?.donationId === donationId.toString()) {
              console.log(`[STRIPE-DEBUG] Updating existing PaymentIntent: ${existingPaymentIntentIdToUse}`);
              paymentIntent = await stripe.paymentIntents.update(existingPaymentIntentIdToUse, {
                amount: Math.round(amount * 100),
                // Convert to cents
                currency: currencyLower,
                description: `${donation?.type || "Donation"} - Aafiyaa Ltd.`,
                statement_descriptor_suffix: "DONATION",
                metadata: {
                  donationId: donationId.toString(),
                  donation_type: donation?.type || "unknown",
                  updated_at: (/* @__PURE__ */ new Date()).toISOString()
                }
              });
              console.log(`[STRIPE-DEBUG] Updated PaymentIntent ${paymentIntent.id} with amount ${amount} ${currencyLower}`);
            } else {
              console.log(`[STRIPE-DEBUG] Existing PaymentIntent belongs to different donation, creating new one`);
            }
          } else {
            console.log(`[STRIPE-DEBUG] Existing PaymentIntent status is ${existingIntent.status}, creating new one`);
          }
        } catch (retrieveError) {
          console.log(`[STRIPE-DEBUG] Could not retrieve existing PaymentIntent: ${retrieveError.message}, creating new one`);
        }
      }
      if (!paymentIntent) {
        console.log(`[STRIPE-DEBUG] Creating new PaymentIntent for donation ${donationId}`);
        const timestamp2 = Date.now();
        const idempotencyKey = `donation-${donationId}-${Math.round(amount * 100)}-${currencyLower}-${timestamp2}`;
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          // Convert to cents
          currency: currencyLower,
          automatic_payment_methods: { enabled: true },
          // Use automatic payment methods for Elements compatibility
          description: `${donation?.type || "Donation"} - Aafiyaa Ltd.`,
          // Include donation type in description
          statement_descriptor_suffix: "DONATION",
          // Text on credit card statement (max 22 chars)
          metadata: {
            donationId: donationId.toString(),
            donation_type: donation?.type || "unknown",
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          }
        }, {
          idempotencyKey
        });
        console.log(`[STRIPE-DEBUG] Created new PaymentIntent ${paymentIntent.id} with idempotency key ${idempotencyKey}`);
      }
      console.log(`[STRIPE-DEBUG] Final PaymentIntent for donation ${donationId}: ${paymentIntent.id}`);
      console.log(`[STRIPE-DEBUG] PaymentIntent status: ${paymentIntent.status}`);
      await storage.updateDonationStatus(
        donationId,
        "processing",
        `${paymentIntent.id}|${paymentIntent.client_secret}`
      );
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        isExisting: !!existingPaymentIntentIdToUse && paymentIntent.metadata?.updated_at
      });
    } catch (error) {
      console.error("Error creating/updating payment intent:", error.message);
      res.status(500).json({ message: `Error creating/updating payment intent: ${error.message}` });
    }
  });
  app2.post("/api/create-setup-intent", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const { donationId } = req.body;
      if (!donationId) {
        return res.status(400).json({ message: "Donation ID is required" });
      }
      const donation = await storage.getDonation(Number(donationId));
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ["card"],
        // Limit to card payments only
        usage: "off_session",
        // Allow using this payment method for future off-session charges
        description: "Recurring donation to Aafiyaa Ltd.",
        // Set the company name in authorization text
        metadata: {
          donationId: donationId.toString(),
          isSubscription: "true",
          company_name: "Aafiyaa Ltd."
        }
      });
      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error("Error creating setup intent:", error.message);
      res.status(500).json({ message: `Error creating setup intent: ${error.message}` });
    }
  });
  app2.post("/api/update-donation-payment", async (req, res) => {
    try {
      const { donationId, paymentIntentId, status } = req.body;
      if (!donationId || !paymentIntentId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      await storage.updateDonationStatus(donationId, status || "completed", paymentIntentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating donation payment:", error.message);
      res.status(500).json({ message: `Error updating donation payment: ${error.message}` });
    }
  });
  app2.post("/api/create-subscription", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const {
        donationId,
        amount,
        currency = "AUD",
        email,
        name,
        paymentMethodId,
        frequency = "monthly"
      } = req.body;
      if (!donationId || !amount || !email || !paymentMethodId) {
        return res.status(400).json({
          message: "Donation ID, amount, email, and payment method ID are required"
        });
      }
      const donation = await storage.getDonation(Number(donationId));
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      const amountInCents = Math.round(amount * 100);
      let interval;
      let intervalCount;
      if (frequency === "weekly") {
        interval = "week";
        intervalCount = 1;
      } else if (frequency === "monthly") {
        interval = "month";
        intervalCount = 1;
      } else if (frequency === "quarterly") {
        interval = "month";
        intervalCount = 3;
      } else if (frequency === "yearly") {
        interval = "year";
        intervalCount = 1;
      } else {
        interval = "month";
        intervalCount = 1;
      }
      console.log(`Setting up subscription with interval: ${interval}, count: ${intervalCount}, frequency: ${frequency}`);
      let user = await storage.getUserByEmail(email);
      let stripeCustomerId = null;
      if (user && user.stripeCustomerId) {
        stripeCustomerId = user.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email,
          name,
          payment_method: paymentMethodId,
          description: "Aafiyaa Ltd. donor",
          invoice_settings: {
            default_payment_method: paymentMethodId,
            custom_fields: null,
            footer: "Aafiyaa Ltd. - Helping those in need"
          },
          metadata: {
            company_name: "Aafiyaa Ltd."
          }
        });
        stripeCustomerId = customer.id;
        if (user) {
          user = await storage.updateUserPaymentInfo(user.id, stripeCustomerId);
        } else {
          user = await storage.createUser({
            username: email.split("@")[0] + Math.floor(Math.random() * 1e4),
            password: Math.random().toString(36).substring(2, 15),
            email
          });
          await storage.updateUserPaymentInfo(user.id, stripeCustomerId);
        }
        if (user) {
          await storage.updateDonationStatus(
            donation.id,
            "processing",
            void 0
          );
        }
      }
      console.log("Creating price with the following data:");
      console.log("- Amount in cents:", amountInCents);
      console.log("- Currency:", currency.toLowerCase());
      console.log("- Interval:", interval);
      console.log("- Interval count:", intervalCount);
      const price = await stripe.prices.create({
        unit_amount: amountInCents,
        currency: currency.toLowerCase(),
        recurring: {
          interval,
          interval_count: intervalCount
        },
        product_data: {
          name: `${donation.type} Donation (${frequency}) - ${donation.destinationProject || "Aafiyaa Charity Clinics"}`
        }
      });
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription"
        },
        // Show correct company name in payment confirmation
        payment_behavior: "default_incomplete",
        application_fee_percent: 0,
        description: "Recurring donation to Aafiyaa Ltd.",
        metadata: {
          donationId: donationId.toString(),
          donationType: donation.type,
          currency,
          amount: amount.toString(),
          userId: user?.id ? user.id.toString() : ""
        }
      });
      console.log(`Created subscription ${subscription.id} for donation ${donationId}`);
      let nextPaymentDate = null;
      if (subscription && typeof subscription === "object" && "current_period_end" in subscription) {
        const periodEnd = subscription.current_period_end;
        if (periodEnd && typeof periodEnd === "number") {
          nextPaymentDate = new Date(periodEnd * 1e3);
          console.log("Next payment date set to:", nextPaymentDate);
        } else {
          console.log("current_period_end is not a valid number:", periodEnd);
        }
      } else {
        console.log("Subscription has no current_period_end property");
      }
      await storage.updateDonationSubscription(
        donation.id,
        "stripe",
        subscription.id,
        subscription.status,
        nextPaymentDate
      );
      if (user && user.id && !donation.userId) {
        const updatedDonation = await storage.getDonation(Number(donationId));
        if (updatedDonation) {
          await storage.updateDonationStatus(
            donation.id,
            updatedDonation.status,
            updatedDonation.stripePaymentId || void 0
          );
        }
      }
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
      let paymentIntent;
      const invoiceData = invoice;
      const paymentIntentId = typeof invoiceData.payment_intent === "string" ? invoiceData.payment_intent : invoiceData.payment_intent?.id;
      if (!paymentIntentId) {
        console.log("No payment intent found - creating one for this invoice specifically");
        try {
          const paidInvoice = await stripe.invoices.pay(invoice.id);
          console.log("Invoice manually paid:", paidInvoice.id, "Status:", paidInvoice.status);
          const paidInvoiceData = paidInvoice;
          const paidInvoicePaymentIntent = paidInvoiceData.payment_intent;
          if (paidInvoicePaymentIntent) {
            const paidPaymentIntentId = typeof paidInvoicePaymentIntent === "string" ? paidInvoicePaymentIntent : paidInvoicePaymentIntent.id;
            if (paidPaymentIntentId) {
              console.log("Getting payment intent from paid invoice:", paidPaymentIntentId);
              paymentIntent = await stripe.paymentIntents.retrieve(paidPaymentIntentId);
            }
          }
        } catch (payError) {
          console.error("Error paying invoice:", payError.message);
        }
      } else {
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (piError) {
          console.error("Error retrieving payment intent:", piError.message);
        }
      }
      console.log("Subscription created:", {
        id: subscription.id,
        status: subscription.status,
        invoiceId: invoice.id
      });
      if (paymentIntent) {
        console.log("Payment intent details:", {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        });
      } else {
        console.log("No payment intent found for subscription");
      }
      const clientSecret = paymentIntent?.client_secret;
      let responseNextPaymentDate = null;
      if (nextPaymentDate instanceof Date) {
        responseNextPaymentDate = nextPaymentDate;
      }
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        nextPaymentDate: responseNextPaymentDate,
        invoiceId: invoice.id,
        paymentIntentId: paymentIntent?.id,
        clientSecret
      });
    } catch (error) {
      console.error("Error creating subscription:", error.message);
      res.status(500).json({ message: `Error creating subscription: ${error.message}` });
    }
  });
  app2.get("/api/cases", async (req, res) => {
    try {
      const cases2 = await storage.getCases();
      res.json(cases2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });
  app2.get("/api/active-zakaat-cases", async (req, res) => {
    try {
      const cases2 = await storage.getActiveZakaatCases();
      res.json(cases2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active zakaat cases" });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const isValid = await storage.validateAdminCredentials(username, password);
      if (isValid) {
        req.session.adminAuthenticated = true;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session during login:", err);
            return res.status(500).json({ message: "Session error during login" });
          }
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
  app2.post("/api/admin/logout", (req, res) => {
    req.session.adminAuthenticated = false;
    req.session.regenerate((err) => {
      if (err) {
        console.error("Error regenerating session during logout:", err);
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/payment-history", isAdminAuthenticated, async (req, res) => {
    try {
      const donations2 = await storage.getDonations();
      const allCases = await storage.getCases();
      const enhancedDonations = donations2.filter((donation) => donation.status === "completed").map((donation) => {
        if (donation.caseId) {
          const matchingCase = allCases.find((c) => c.id === donation.caseId);
          return {
            ...donation,
            caseName: matchingCase?.title || "Unknown Case"
          };
        }
        return donation;
      });
      res.json(enhancedDonations);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });
  app2.post("/api/admin/finalize-subscription", isAdminAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`Admin attempting to finalize subscription ${subscriptionId}, current status: ${subscription.status}`);
      if (subscription.status !== "incomplete") {
        return res.json({
          message: `Subscription is already in ${subscription.status} state, no action needed`,
          subscription
        });
      }
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
      const paidInvoice = await stripe.invoices.pay(invoice.id);
      console.log("Invoice manually paid by admin:", paidInvoice.id, "Status:", paidInvoice.status);
      const updatedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      res.json({
        message: "Subscription finalized successfully",
        previousStatus: subscription.status,
        currentStatus: updatedSubscription.status,
        invoiceStatus: paidInvoice.status,
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error("Error finalizing subscription:", error.message);
      res.status(500).json({ message: `Error finalizing subscription: ${error.message}` });
    }
  });
  app2.get("/api/payment-statistics", isAdminAuthenticated, async (req, res) => {
    try {
      const donations2 = await storage.getDonations();
      const byStatus = donations2.reduce((acc, donation) => {
        const status = donation.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const byType = donations2.reduce((acc, donation) => {
        const type = donation.type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      const byPaymentMethod = donations2.reduce((acc, donation) => {
        const method = donation.paymentMethod || "unknown";
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});
      const totalDonated = donations2.filter((d) => d.status === "completed").reduce((sum, donation) => sum + donation.amount, 0);
      const byDestination = donations2.filter((d) => d.status === "completed").reduce((acc, donation) => {
        let destination = "unknown";
        if (donation.caseId) {
          destination = `Case ID: ${donation.caseId}`;
        } else if (donation.destinationProject) {
          destination = donation.destinationProject;
        }
        acc[destination] = (acc[destination] || 0) + donation.amount;
        return acc;
      }, {});
      res.json({
        totalDonations: donations2.length,
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
  app2.get("/api/cases/:id", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
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
  app2.post("/api/cases", async (req, res) => {
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
  app2.put("/api/cases/:id", async (req, res) => {
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
  app2.delete("/api/cases/:id", async (req, res) => {
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
  app2.patch("/api/cases/:id/toggle-status", async (req, res) => {
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
  app2.patch("/api/cases/:id/amount-collected", async (req, res) => {
    try {
      const caseId = parseInt(req.params.id);
      const { additionalAmount } = req.body;
      if (typeof additionalAmount !== "number" || additionalAmount <= 0) {
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
  app2.post("/api/admin/sync-stripe-payments", isAdminAuthenticated, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      console.log("[STRIPE-SYNC] Starting manual sync for stuck processing payments");
      const allDonations = await storage.getDonations();
      const stuckDonations = allDonations.filter(
        (donation) => donation.status === "processing" && donation.stripePaymentId
      );
      console.log(`[STRIPE-SYNC] Found ${stuckDonations.length} donations to sync`);
      let syncedCount = 0;
      let errors = [];
      for (const donation of stuckDonations) {
        try {
          const paymentIntentId = donation.stripePaymentId.split("|")[0];
          console.log(`[STRIPE-SYNC] Checking payment intent ${paymentIntentId} for donation ${donation.id}`);
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.status === "succeeded") {
            console.log(`[STRIPE-SYNC] PaymentIntent ${paymentIntentId} succeeded in Stripe, updating donation ${donation.id}`);
            await storage.updateDonationStatus(donation.id, "completed", paymentIntentId);
            syncedCount++;
          } else {
            console.log(`[STRIPE-SYNC] PaymentIntent ${paymentIntentId} status in Stripe: ${paymentIntent.status}`);
          }
        } catch (error) {
          console.error(`[STRIPE-SYNC] Error syncing donation ${donation.id}:`, error.message);
          errors.push({ donationId: donation.id, error: error.message });
        }
      }
      console.log(`[STRIPE-SYNC] Sync completed: ${syncedCount} payments synced, ${errors.length} errors`);
      res.json({
        success: true,
        message: `Synced ${syncedCount} stuck payments`,
        syncedCount,
        totalChecked: stuckDonations.length,
        errors
      });
    } catch (error) {
      console.error("[STRIPE-SYNC] Sync failed:", error.message);
      res.status(500).json({ message: `Sync failed: ${error.message}` });
    }
  });
  app2.post("/api/webhook", async (req, res) => {
    const startTime = Date.now();
    if (!stripe) {
      if (newrelic2?.recordCustomEvent) {
        newrelic2.recordCustomEvent("WebhookError", {
          error: "Stripe not configured",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    const payload = req.body;
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      const endpointSecret = config_default.STRIPE.WEBHOOK_SECRET;
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(
          payload,
          sig,
          endpointSecret
        );
      } else {
        console.log("No webhook signature, using payload directly (development mode)");
        event = payload;
      }
      console.log(`Webhook received: ${event.type}`);
      if (newrelic2?.recordCustomEvent) {
        newrelic2.recordCustomEvent("WebhookReceived", {
          eventType: event.type,
          eventId: event.id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          hasSignature: !!sig
        });
      }
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object);
          break;
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted2(event.data.object);
          break;
        case "customer.subscription.created":
          await handleSubscriptionCreated2(event.data.object);
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated2(event.data.object);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionCancelled2(event.data.object);
          break;
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded2(event.data.object);
          break;
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed2(event.data.object);
          break;
        case "payment_intent.created":
          await handlePaymentIntentCreated(event.data.object);
          break;
        case "payment_intent.canceled":
          await handlePaymentIntentCanceled(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
          if (newrelic2?.recordCustomEvent) {
            newrelic2.recordCustomEvent("WebhookUnhandled", {
              eventType: event.type,
              eventId: event.id,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
      }
      const processingTime = Date.now() - startTime;
      if (newrelic2?.recordCustomEvent) {
        newrelic2.recordCustomEvent("WebhookProcessed", {
          eventType: event.type,
          eventId: event.id,
          processingTimeMs: processingTime,
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      res.json({ received: true });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error("Webhook Error:", error.message);
      if (newrelic2?.recordCustomEvent) {
        newrelic2.recordCustomEvent("WebhookError", {
          eventType: event?.type || "unknown",
          eventId: event?.id || "unknown",
          error: error.message,
          processingTimeMs: processingTime,
          success: false,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (newrelic2?.noticeError) {
        newrelic2.noticeError(error, {
          customAttributes: {
            context: "stripe_webhook",
            eventType: event?.type || "unknown"
          }
        });
      }
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });
  const handleCheckoutSessionCompleted2 = async (session3) => {
    console.log("Checkout Session Completed:", session3.id);
    try {
      if (session3.payment_intent && stripe) {
        const stripeInstance = stripe;
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(session3.payment_intent);
        await handlePaymentIntentSucceeded(paymentIntent);
      } else if (!stripe) {
        console.error("Stripe is not configured");
      }
    } catch (error) {
      console.error("Error handling checkout session completed:", error.message);
    }
  };
  const handleSubscriptionCreated2 = async (subscription) => {
    console.log("Subscription Created:", subscription.id);
    try {
      let donation;
      if (subscription.metadata && subscription.metadata.donationId) {
        const donationId = parseInt(subscription.metadata.donationId);
        donation = await storage.getDonation(donationId);
      }
      if (!donation) {
        const donations2 = await storage.getDonations();
        donation = donations2.find((d) => d.stripeSubscriptionId === subscription.id);
      }
      if (donation) {
        await storage.updateDonationSubscription(
          donation.id,
          "stripe",
          subscription.id,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1e3)
        );
        console.log(`Updated donation ${donation.id} with subscription ${subscription.id}`);
      } else {
        console.warn(`No donation found for subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error("Error handling subscription created:", error.message);
    }
  };
  const handleSubscriptionUpdated2 = async (subscription) => {
    console.log("Subscription Updated:", subscription.id);
    try {
      const donations2 = await storage.getDonations();
      const donation = donations2.find((d) => d.stripeSubscriptionId === subscription.id);
      if (donation) {
        await storage.updateDonationSubscription(
          donation.id,
          "stripe",
          subscription.id,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1e3)
        );
        console.log(`Updated donation ${donation.id} subscription status to ${subscription.status}`);
      } else {
        console.warn(`No donation found for subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error("Error handling subscription updated:", error.message);
    }
  };
  const handleSubscriptionCancelled2 = async (subscription) => {
    console.log("Subscription Cancelled:", subscription.id);
    try {
      const donations2 = await storage.getDonations();
      const donation = donations2.find((d) => d.stripeSubscriptionId === subscription.id);
      if (donation) {
        await storage.updateDonationSubscription(
          donation.id,
          "stripe",
          subscription.id,
          "canceled",
          null
        );
        console.log(`Marked donation ${donation.id} subscription as cancelled`);
      } else {
        console.warn(`No donation found for cancelled subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error("Error handling subscription cancelled:", error.message);
    }
  };
  const handleInvoicePaymentSucceeded2 = async (invoice) => {
    console.log("Invoice Payment Succeeded:", invoice.id);
    try {
      if (!invoice.subscription) {
        console.log("No subscription associated with this invoice");
        return;
      }
      const donations2 = await storage.getDonations();
      const donation = donations2.find((d) => d.stripeSubscriptionId === invoice.subscription);
      if (!donation) {
        console.warn(`No donation found for subscription ${invoice.subscription}`);
        return;
      }
      if (stripe) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await storage.updateDonationSubscription(
          donation.id,
          "stripe",
          invoice.subscription,
          subscription.status,
          new Date((subscription.current_period_end || 0) * 1e3)
        );
        if (donation.caseId) {
          await storage.updateCaseAmountCollected(donation.caseId, donation.amount);
          console.log(`Updated case ${donation.caseId} amount collected by ${donation.amount}`);
        }
        console.log(`Updated donation ${donation.id} next payment date`);
      }
    } catch (error) {
      console.error("Error handling invoice payment succeeded:", error.message);
    }
  };
  const handleInvoicePaymentFailed2 = async (invoice) => {
    console.log("Invoice Payment Failed:", invoice.id);
    try {
      if (!invoice.subscription) {
        console.log("No subscription associated with this invoice");
        return;
      }
      const donations2 = await storage.getDonations();
      const donation = donations2.find((d) => d.stripeSubscriptionId === invoice.subscription);
      if (donation) {
        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await storage.updateDonationSubscription(
            donation.id,
            "stripe",
            invoice.subscription,
            subscription.status,
            new Date((subscription.current_period_end || 0) * 1e3)
          );
          console.log(`Updated donation ${donation.id} subscription status to ${subscription.status} due to failed payment`);
        }
      } else {
        console.warn(`No donation found for subscription ${invoice.subscription}`);
      }
    } catch (error) {
      console.error("Error handling invoice payment failed:", error.message);
    }
  };
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs4 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
console.log(`\u{1F680} Starting server in ${config_default.NODE_ENV} mode`);
validateConfig();
if (isDatabaseAvailable()) {
  runMigrations().then((success) => {
    if (success) {
      console.log("Database initialized successfully");
    } else {
      console.warn(
        "Database initialization failed, continuing with in-memory storage"
      );
    }
  }).catch((error) => {
    console.error("Error during database initialization:", error);
  });
}
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(
  session2({
    secret: config_default.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    // Changed to true to ensure session is always saved
    cookie: {
      secure: false,
      // Always false to work in the webview regardless of environment
      httpOnly: true,
      sameSite: "lax",
      // Less restrictive SameSite setting
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    },
    store: storage.sessionStore
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (config_default.IS_DEVELOPMENT) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = config_default.PORT;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
