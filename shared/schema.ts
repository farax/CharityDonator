import { pgTable, text, serial, integer, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema with payment provider information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  paypalCustomerId: text("paypal_customer_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// New schemas for the donation application
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  amountRequired: real("amount_required").notNull(),
  amountCollected: real("amount_collected").notNull().default(0),
  active: boolean("active").notNull().default(true),
  recurringAllowed: boolean("recurring_allowed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  amountCollected: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  amountRequired: z.number().min(1, "Amount must be at least 1"),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'zakaat', 'sadqah', 'interest'
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  frequency: text("frequency").notNull().default("one-off"), // 'one-off', 'weekly', 'monthly'
  stripePaymentId: text("stripe_payment_id"),
  stripeSubscriptionId: text("stripe_subscription_id"), // For recurring payments
  paypalSubscriptionId: text("paypal_subscription_id"), // For PayPal recurring payments
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'active-subscription', 'subscription-cancelled'
  subscriptionStatus: text("subscription_status"), // 'active', 'past_due', 'cancelled', 'incomplete', etc.
  nextPaymentDate: timestamp("next_payment_date"), // Next scheduled payment date for subscriptions
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: text("email"),
  name: text("name"),
  userId: integer("user_id"), // Link to a user for recurring payments
  paymentMethod: text("payment_method"), // 'stripe', 'apple_pay', 'paypal'
  caseId: integer("case_id"), // For case-specific donations
  destinationProject: text("destination_project"), // For non-case specific donations
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["zakaat", "sadqah", "interest"], {
    required_error: "Please select a donation type",
  }),
  amount: z.number().min(0.01, "Amount must be at least 0.01"),
  currency: z.string().min(3, "Currency must be a valid 3-letter code"),
  frequency: z.enum(["one-off", "weekly", "monthly"], {
    required_error: "Please select a frequency",
  }),
});

export const endorsements = pgTable("endorsements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  logoUrl: text("logo_url").notNull(),
  url: text("url"),
});

export const insertEndorsementSchema = createInsertSchema(endorsements).omit({
  id: true,
});

export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  totalPatients: integer("total_patients").notNull().default(0),
  monthlyPatients: integer("monthly_patients").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertStatsSchema = createInsertSchema(stats).omit({
  id: true,
  lastUpdated: true,
});

// Define types based on the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

export type InsertEndorsement = z.infer<typeof insertEndorsementSchema>;
export type Endorsement = typeof endorsements.$inferSelect;

export type InsertStats = z.infer<typeof insertStatsSchema>;
export type Stats = typeof stats.$inferSelect;

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

// Extending schemas with validation
export const donationFormSchema = insertDonationSchema.extend({
  amount: z.number().min(1, "Amount must be at least 1"),
  type: z.enum(["zakaat", "sadqah", "interest"], {
    required_error: "Please select a donation type",
  }),
  frequency: z.enum(["one-off", "weekly", "monthly"], {
    required_error: "Please select a frequency",
  }),
});

export type DonationFormData = z.infer<typeof donationFormSchema>;

// Contact messages schema
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Contact form schema with validation
export const contactFormSchema = insertContactMessageSchema.extend({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' })
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Webhook events logging table
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // payment_intent.succeeded, etc.
  stripeEventId: text("stripe_event_id"), // Stripe's event ID
  paymentIntentId: text("payment_intent_id"),
  subscriptionId: text("subscription_id"),
  donationId: integer("donation_id"), // Reference to donations table
  matchStrategy: text("match_strategy"), // how donation was found
  status: text("status").notNull(), // processed, orphaned, failed
  rawData: json("raw_data"), // Full webhook payload
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Orphaned payments tracking table
export const orphanedPayments = pgTable("orphaned_payments", {
  id: serial("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("unresolved"), // unresolved, resolved, ignored
  resolvedDonationId: integer("resolved_donation_id"), // If manually linked to donation
  stripeMetadata: json("stripe_metadata"),
  description: text("description"),
  stripeCreatedAt: timestamp("stripe_created_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"), // admin username who resolved it
  notes: text("notes"), // Admin notes about resolution
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

export const insertOrphanedPaymentSchema = createInsertSchema(orphanedPayments).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export type InsertOrphanedPayment = z.infer<typeof insertOrphanedPaymentSchema>;
export type OrphanedPayment = typeof orphanedPayments.$inferSelect;

// PDF Receipts tracking table
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  donationId: integer("donation_id").notNull(), // Reference to donations table
  receiptNumber: text("receipt_number").notNull().unique(), // Unique receipt identifier
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  donorName: text("donor_name"),
  donorEmail: text("donor_email").notNull(),
  donationType: text("donation_type").notNull(), // zakaat, sadqah, interest
  caseId: integer("case_id"), // If donation was for specific case
  filePath: text("file_path"), // Path to generated PDF
  status: text("status").notNull().default("pending"), // pending, generated, sent, failed
  generatedAt: timestamp("generated_at"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"), // If generation or sending failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
