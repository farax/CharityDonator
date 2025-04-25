/**
 * Database initialization script for Aafiyaa Charity Clinics
 * 
 * This script can be used to initialize a PostgreSQL database with the schema defined in schema.sql
 * It requires the following environment variables to be set:
 * - DATABASE_URL or PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT
 * 
 * Usage: node init-db.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables if dotenv is available
try {
  require('dotenv').config();
} catch (error) {
  console.log('Dotenv not available, using environment variables as is');
}

// Get connection parameters from environment variables
const connectionString = process.env.DATABASE_URL;
const client = connectionString 
  ? new Client({ connectionString }) 
  : new Client({
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
    });

async function initializeDatabase() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully');

    // Read the schema and seed SQL files
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    // Execute the schema SQL
    console.log('Creating database schema...');
    await client.query(schemaSQL);
    console.log('Schema created successfully');

    // Execute the seed SQL
    console.log('Seeding database with initial data...');
    await client.query(seedSQL);
    console.log('Database seeded successfully');

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the initialization
initializeDatabase();