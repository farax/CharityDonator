import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import config from './config';

// Configure neon database if needed
neonConfig.webSocketConstructor = ws;

// Check if a database URL is available
if (!config.DATABASE.URL) {
  console.log('No DATABASE_URL found. Using in-memory storage instead.');
}

// Create a connection pool
export const pool = config.DATABASE.URL 
  ? new Pool({ connectionString: config.DATABASE.URL }) 
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
  if (!db) {
    console.warn('Cannot run migrations: No database connection');
    return false;
  }
  
  try {
    console.log('Checking database connection...');
    // Test the connection by performing a simple query
    await pool!.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}