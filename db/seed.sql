-- Aafiyaa Charity Clinics Seed Data
-- This file contains initial data for the database

-- Truncate tables to ensure clean data
TRUNCATE TABLE "endorsements" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "cases" RESTART IDENTITY CASCADE;

-- Seed endorsements data
INSERT INTO "endorsements" ("name", "type", "logo_url", "url") VALUES
  ('Rahbar Foundation', 'Medication supply partner', 'rahbar-trust', 'https://rahbartrust.org/'),
  ('Al-Ihsan Institute', 'Religious rulings partner', 'al-ihsan', 'https://www.al-ihsan.com.au/');

-- Seed donation cases
INSERT INTO "cases" ("title", "description", "image_url", "target_amount", "amount_collected", "status", "case_type") VALUES
  ('Emergency Medical Supplies for Flood Victims', 'Providing essential medical supplies to families affected by recent flooding in rural communities. Your donation will help us deliver critical medications, first aid kits, and clean water tablets.', '/images/cases/flood-victims.jpg', 5000.00, 0.00, 'active', 'zakaat'),
  
  ('Children''s Immunization Program', 'Funding immunization programs for children in underserved areas. These vaccinations protect against preventable diseases and save lives.', '/images/cases/immunization.jpg', 7500.00, 0.00, 'active', 'zakaat'),
  
  ('Mobile Medical Clinic', 'Supporting our mobile medical clinic that provides healthcare to remote villages without access to medical facilities. The clinic offers basic health screenings, treatments, and health education.', '/images/cases/mobile-clinic.jpg', 12000.00, 0.00, 'active', 'zakaat'),
  
  ('Medical Equipment for Rural Clinic', 'Purchasing essential medical equipment for our rural clinic that serves hundreds of patients weekly. This equipment will enhance diagnostic capabilities and treatment options.', '/images/cases/rural-clinic.jpg', 8500.00, 0.00, 'active', 'zakaat'),
  
  ('Maternal Health Services', 'Funding prenatal and postnatal care for expectant mothers in underserved communities. Your donation helps provide safe deliveries and healthy starts for mothers and babies.', '/images/cases/maternal-health.jpg', 6000.00, 0.00, 'active', 'zakaat');

-- Initial data - Stats (if not already in schema.sql)
INSERT INTO "stats" ("id", "total_patients", "monthly_patients") 
VALUES (1, 124568, 3247)
ON CONFLICT (id) DO UPDATE SET 
  total_patients = EXCLUDED.total_patients,
  monthly_patients = EXCLUDED.monthly_patients,
  updated_at = CURRENT_TIMESTAMP;

-- Initial admin user (if not already in schema.sql)
INSERT INTO "users" ("username", "password", "role") 
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;