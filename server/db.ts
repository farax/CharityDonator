import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import config from './config';

// Check if a database URL is available
if (!config.DATABASE.URL) {
  console.log('No DATABASE_URL found. Using in-memory storage instead.');
}

// Create a connection pool with standard PostgreSQL configuration
export const pool = config.DATABASE.URL 
  ? new Pool({ 
      connectionString: config.DATABASE.URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }) 
  : null;

// Create a Drizzle ORM instance if pool is available
export const db = pool 
  ? drizzle(pool, { schema }) 
  : null;

// Helper function to check if database is available
export function isDatabaseAvailable(): boolean {
  return !!db;
}

// Helper function for migrating the database schema
export async function runMigrations() {
  if (!db || !pool) {
    console.warn('Cannot run migrations: No database connection');
    return false;
  }
  
  try {
    console.log('Checking database connection...');
    // Test the connection by performing a simple query
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Initialize database schema if needed
    try {
      console.log('Checking if tables exist...');
      
      // Check if users table exists
      const usersResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      
      if (!usersResult.rows[0].exists) {
        console.log('Tables do not exist, creating schema...');
        
        // Using the Drizzle schema to create tables
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
        
        console.log('Schema created successfully');
        
        // Insert initial data
        console.log('Inserting initial data...');
        
        // Insert stats
        await pool.query(`
          INSERT INTO stats (total_patients, monthly_patients) 
          VALUES (124568, 3247)
          ON CONFLICT DO NOTHING;
        `);
        
        // Insert sample endorsements
        await pool.query(`
          INSERT INTO endorsements (name, type, logo_url, url)
          VALUES 
            ('Rahbar Foundation', 'Medication supply partner', 'rahbar-trust', 'https://rahbartrust.org/'),
            ('Al-Ihsan Institute', 'Religious rulings partner', 'al-ihsan', 'https://www.al-ihsan.com.au/')
          ON CONFLICT DO NOTHING;
        `);
        
        // Insert sample cases
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
        
        console.log('Initial data inserted successfully');
      } else {
        console.log('Tables already exist, skipping schema creation');
      }
    } catch (schemaError) {
      console.error('Error creating schema:', schemaError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}