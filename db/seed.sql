-- Aafiyaa Charity Clinics Seed Data
-- This file contains initial data for the database
-- Updated: April 25, 2025

-- Option to clean data
-- TRUNCATE TABLE "endorsements" RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE "cases" RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE "stats" RESTART IDENTITY CASCADE;

-- Seed stats data
INSERT INTO "stats" ("id", "total_patients", "monthly_patients") 
VALUES (1, 124568, 3247)
ON CONFLICT (id) DO UPDATE SET 
  total_patients = EXCLUDED.total_patients,
  monthly_patients = EXCLUDED.monthly_patients,
  last_updated = NOW();

-- Seed endorsements data
INSERT INTO "endorsements" ("name", "type", "logo_url", "url") VALUES
  ('Rahbar Foundation', 'Medication supply partner', 'rahbar-trust', 'https://rahbartrust.org/'),
  ('Al-Ihsan Institute', 'Religious rulings partner', 'al-ihsan', 'https://www.al-ihsan.com.au/')
ON CONFLICT DO NOTHING;

-- Seed donation cases
INSERT INTO "cases" ("title", "description", "image_url", "amount_required", "amount_collected", "active") VALUES
  ('Emergency Medical Supplies for Flood Victims', 'Providing essential medical supplies to families affected by recent flooding in rural communities. Your donation will help us deliver critical medications, first aid kits, and clean water tablets.', '/images/cases/flood-victims.jpg', 5000, 0, true),
  
  ('Children''s Immunization Program', 'Funding immunization programs for children in underserved areas. These vaccinations protect against preventable diseases and save lives.', '/images/cases/immunization.jpg', 7500, 0, true),
  
  ('Mobile Medical Clinic', 'Supporting our mobile medical clinic that provides healthcare to remote villages without access to medical facilities. The clinic offers basic health screenings, treatments, and health education.', '/images/cases/mobile-clinic.jpg', 12000, 0, true),
  
  ('Medical Equipment for Rural Clinic', 'Purchasing essential medical equipment for our rural clinic that serves hundreds of patients weekly. This equipment will enhance diagnostic capabilities and treatment options.', '/images/cases/rural-clinic.jpg', 8500, 0, true),
  
  ('Maternal Health Services', 'Funding prenatal and postnatal care for expectant mothers in underserved communities. Your donation helps provide safe deliveries and healthy starts for mothers and babies.', '/images/cases/maternal-health.jpg', 6000, 0, true)
ON CONFLICT DO NOTHING;

-- Initial admin user can be created through the UI using the admin login page
-- The admin credentials are set in environment variables:
-- ADMIN_USERNAME and ADMIN_PASSWORD (defaults to 'admin' and 'admin123' if not set)