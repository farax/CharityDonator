-- Aafiyaa Charity Clinics Database Schema
-- Generated from Drizzle ORM schema definitions
-- Updated: April 25, 2025

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

-- Stats table for clinic statistics
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

-- Session storage table for admin sessions
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_donations_case_id" ON "donations"("case_id");
CREATE INDEX IF NOT EXISTS "idx_donations_status" ON "donations"("status");
CREATE INDEX IF NOT EXISTS "idx_donations_stripe_payment_id" ON "donations"("stripe_payment_id");
CREATE INDEX IF NOT EXISTS "idx_donations_stripe_subscription_id" ON "donations"("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_donations_paypal_subscription_id" ON "donations"("paypal_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_cases_active" ON "cases"("active");
CREATE INDEX IF NOT EXISTS "idx_contact_messages_is_read" ON "contact_messages"("is_read");