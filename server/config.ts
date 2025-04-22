/**
 * Configuration module for Aafiyaa Charity Clinics
 * 
 * This module loads environment variables from .env file
 * and provides a central configuration object for the application
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Determine which .env file to load
const envPath = path.resolve(process.cwd(), '.env');

// Load environment variables from .env file
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found. Using environment variables directly.');
  dotenv.config();
}

// Log key configuration details but not the actual values
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Stripe configuration: ${process.env.STRIPE_SECRET_KEY ? '✓ Secret key found' : '✗ Missing secret key'}`);
console.log(`Stripe public key: ${process.env.VITE_STRIPE_PUBLIC_KEY ? '✓ Public key found' : '✗ Missing public key'}`);

// App Configuration
export const config = {
  // App settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  SESSION_SECRET: process.env.SESSION_SECRET || 'aafiyaa_dev_session_secret',
  
  // New Relic
  NEW_RELIC: {
    LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
    ACCOUNT_ID: process.env.VITE_NEW_RELIC_ACCOUNT_ID,
    APPLICATION_ID: process.env.VITE_NEW_RELIC_APPLICATION_ID,
    BROWSER_LICENSE_KEY: process.env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY,
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
    
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  
  PAYPAL: {
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    SECRET_KEY: process.env.PAYPAL_SECRET_KEY,
    CLIENT_ID_PUBLIC: process.env.VITE_PAYPAL_CLIENT_ID,
  },
  
  // Email
  SENDGRID: {
    API_KEY: process.env.SENDGRID_API_KEY,
  },
  
  // SMTP Email Configuration
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM: process.env.EMAIL_FROM || 'noreply@aafiyaaclinic.org',
    TO: process.env.EMAIL_TO || 'admin@aafiyaaclinic.org',
  },
  
  // Database
  DATABASE: {
    URL: process.env.DATABASE_URL,
    USER: process.env.PGUSER,
    PASSWORD: process.env.PGPASSWORD,
    NAME: process.env.PGDATABASE,
    HOST: process.env.PGHOST,
    PORT: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  },
  
  // Derived settings
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
};

// Validate required configuration variables
export function validateConfig() {
  const missingVars: string[] = [];
  
  // Only validate these in production
  if (config.IS_PRODUCTION) {
    // Add required production variables here
    if (!config.STRIPE.SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');
    if (!config.STRIPE.PUBLIC_KEY) missingVars.push('VITE_STRIPE_PUBLIC_KEY');
    if (!config.SESSION_SECRET || config.SESSION_SECRET === 'aafiyaa_dev_session_secret') {
      missingVars.push('SESSION_SECRET');
    }
  }
  
  // Always validate these regardless of environment
  if (config.STRIPE.SECRET_KEY && !config.STRIPE.PUBLIC_KEY) {
    missingVars.push('VITE_STRIPE_PUBLIC_KEY (required when STRIPE_SECRET_KEY is set)');
  }
  
  if (config.PAYPAL.CLIENT_ID && !config.PAYPAL.SECRET_KEY) {
    missingVars.push('PAYPAL_SECRET_KEY (required when PAYPAL_CLIENT_ID is set)');
  }
  
  // Report any missing variables
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing required environment variables:');
    missingVars.forEach(variable => {
      console.warn(`  - ${variable}`);
    });
    
    if (config.IS_PRODUCTION) {
      throw new Error('Cannot start in production mode with missing configuration.');
    }
  }
  
  return missingVars.length === 0;
}

export default config;