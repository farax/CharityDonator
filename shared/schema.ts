import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema from the original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// New schemas for the donation application
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'zakaat', 'sadqah', 'interest'
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  frequency: text("frequency").notNull().default("one-off"), // 'one-off', 'weekly', 'monthly'
  stripePaymentId: text("stripe_payment_id"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: text("email"),
  name: text("name"),
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
});

export const endorsements = pgTable("endorsements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  logoUrl: text("logo_url").notNull(),
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
