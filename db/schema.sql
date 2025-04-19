-- Aafiyaa Charity Clinics Database Schema
-- Generated from Drizzle ORM schema definitions

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(255) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "role" VARCHAR(50) DEFAULT 'user',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" VARCHAR(255),
  "stripe_subscription_id" VARCHAR(255)
);

-- Cases table
CREATE TABLE IF NOT EXISTS "cases" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "target_amount" DECIMAL(10, 2) NOT NULL,
  "amount_collected" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(50) NOT NULL DEFAULT 'active',
  "case_type" VARCHAR(50) NOT NULL DEFAULT 'zakaat',
  "image_url" VARCHAR(255),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Donations table
CREATE TABLE IF NOT EXISTS "donations" (
  "id" SERIAL PRIMARY KEY,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'AUD',
  "type" VARCHAR(50) NOT NULL,
  "frequency" VARCHAR(50) NOT NULL DEFAULT 'one-off',
  "payment_method" VARCHAR(50) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "donor_name" VARCHAR(255),
  "donor_email" VARCHAR(255),
  "case_id" INTEGER REFERENCES "cases"("id"),
  "destination_project" VARCHAR(255),
  "cover_fees" BOOLEAN NOT NULL DEFAULT false,
  "processing_fee" DECIMAL(10, 2) DEFAULT 0.00,
  "stripe_payment_id" VARCHAR(255),
  "paypal_order_id" VARCHAR(255),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Endorsements table
CREATE TABLE IF NOT EXISTS "endorsements" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "logo_url" VARCHAR(255),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stats table for clinic statistics
CREATE TABLE IF NOT EXISTS "stats" (
  "id" SERIAL PRIMARY KEY,
  "total_patients" INTEGER NOT NULL DEFAULT 0,
  "monthly_patients" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session storage table for admin sessions
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_donations_case_id" ON "donations"("case_id");
CREATE INDEX IF NOT EXISTS "idx_donations_status" ON "donations"("status");
CREATE INDEX IF NOT EXISTS "idx_donations_type" ON "donations"("type");
CREATE INDEX IF NOT EXISTS "idx_cases_status" ON "cases"("status");
CREATE INDEX IF NOT EXISTS "idx_cases_case_type" ON "cases"("case_type");
CREATE INDEX IF NOT EXISTS "idx_contact_messages_read" ON "contact_messages"("read");

-- Initial data - Admin user
INSERT INTO "users" ("username", "password", "role") 
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Initial data - Stats
INSERT INTO "stats" ("id", "total_patients", "monthly_patients") 
VALUES (1, 124568, 3254)
ON CONFLICT (id) DO NOTHING;