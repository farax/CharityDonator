-- Aafiyaa Charity Clinics Database Schema
-- This file contains the DDL (Data Definition Language) scripts for creating the database schema

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(255) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "role" VARCHAR(50) DEFAULT 'user',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cases table for charity cases that need funding
CREATE TABLE IF NOT EXISTS "cases" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(50) DEFAULT 'zakaat',
  "amount_needed" DECIMAL(10, 2) NOT NULL,
  "amount_collected" DECIMAL(10, 2) DEFAULT 0,
  "currency" VARCHAR(3) DEFAULT 'AUD',
  "is_active" BOOLEAN DEFAULT true,
  "priority" INTEGER DEFAULT 0,
  "image_url" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donations table for tracking all donations
CREATE TABLE IF NOT EXISTS "donations" (
  "id" SERIAL PRIMARY KEY,
  "type" VARCHAR(50) NOT NULL, -- 'zakaat', 'sadqah', or 'interest'
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'AUD',
  "donor_name" VARCHAR(255),
  "donor_email" VARCHAR(255),
  "frequency" VARCHAR(20) DEFAULT 'one-off', -- 'one-off', 'weekly', 'monthly'
  "payment_method" VARCHAR(50), -- 'stripe', 'paypal', etc.
  "status" VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  "stripe_payment_id" VARCHAR(255),
  "paypal_order_id" VARCHAR(255),
  "case_id" INTEGER REFERENCES "cases"("id"),
  "destination_project" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Endorsements table for testimonials and endorsements
CREATE TABLE IF NOT EXISTS "endorsements" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "organization" VARCHAR(255),
  "type" VARCHAR(50) DEFAULT 'testimonial',
  "content" TEXT NOT NULL,
  "image_url" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stats table for clinic statistics
CREATE TABLE IF NOT EXISTS "stats" (
  "id" SERIAL PRIMARY KEY,
  "total_patients" INTEGER DEFAULT 0,
  "monthly_patients" INTEGER DEFAULT 0,
  "total_donations" INTEGER DEFAULT 0,
  "last_updated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact messages table for storing contact form submissions
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50),
  "subject" VARCHAR(255),
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_donations_type" ON "donations" ("type");
CREATE INDEX IF NOT EXISTS "idx_donations_status" ON "donations" ("status");
CREATE INDEX IF NOT EXISTS "idx_donations_case_id" ON "donations" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_cases_type" ON "cases" ("type");
CREATE INDEX IF NOT EXISTS "idx_cases_is_active" ON "cases" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_contact_messages_is_read" ON "contact_messages" ("is_read");

-- Insert initial admin user (username: admin, password: admin123)
INSERT INTO "users" ("username", "password", "role")
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT ("username") DO NOTHING;

-- Insert initial stats record
INSERT INTO "stats" ("id", "total_patients", "monthly_patients")
VALUES (1, 124568, 3210)
ON CONFLICT ("id") DO NOTHING;