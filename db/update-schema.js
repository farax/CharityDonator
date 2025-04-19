#!/usr/bin/env node

/**
 * This script extracts the Drizzle ORM schema definitions from shared/schema.ts
 * and transforms them into raw SQL DDL statements in db/schema.sql
 * 
 * Run this script whenever you make changes to the schema to keep the SQL file in sync
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const drizzleSchemaPath = path.join(__dirname, '../shared/schema.ts');
const sqlSchemaPath = path.join(__dirname, './schema.sql');

console.log('Updating database schema SQL file...');

try {
  // Step 1: Ensure drizzle-kit is installed
  console.log('Checking drizzle-kit installation...');
  
  // Step 2: Generate SQL using drizzle-kit
  console.log('Generating SQL from Drizzle schema...');
  const output = execSync('npx drizzle-kit generate:pg').toString();
  console.log(output);
  
  // Step 3: Read the existing schema file to keep custom SQL parts
  let existingSchema = '';
  if (fs.existsSync(sqlSchemaPath)) {
    existingSchema = fs.readFileSync(sqlSchemaPath, 'utf8');
  }
  
  // Step 4: Extract header comments and custom parts
  const headerMatch = existingSchema.match(/^(--[^\n]*\n)+/);
  const header = headerMatch ? headerMatch[0] : '-- Aafiyaa Charity Clinics Database Schema\n-- This file contains the DDL (Data Definition Language) scripts for creating the database schema\n\n';
  
  // Step 5: Find the latest generated migration SQL
  const migrationsDir = path.join(__dirname, '../drizzle');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const migrations = fs.readdirSync(migrationsDir);
  const latestMigration = migrations.sort().pop();
  
  if (!latestMigration) {
    console.error('No migrations found. Make sure to run drizzle-kit generate first.');
    process.exit(1);
  }
  
  const migrationPath = path.join(migrationsDir, latestMigration);
  const generatedSql = fs.readFileSync(migrationPath, 'utf8');
  
  // Step A: Add table creation statements
  const tableCreationPart = generatedSql
    .replace(/^/gm, '-- ')
    .replace(/^-- DO/gm, 'DO')
    .replace(/^-- CREATE SCHEMA/gm, 'CREATE SCHEMA');
  
  // Step 6: Preserve custom SQL and indexes
  const customIndexesMatch = existingSchema.match(/-- Create indexes for performance[\s\S]*?;/);
  const customIndexes = customIndexesMatch ? customIndexesMatch[0] : `
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_donations_type" ON "donations" ("type");
CREATE INDEX IF NOT EXISTS "idx_donations_status" ON "donations" ("status");
CREATE INDEX IF NOT EXISTS "idx_donations_case_id" ON "donations" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_cases_type" ON "cases" ("type");
CREATE INDEX IF NOT EXISTS "idx_cases_is_active" ON "cases" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_contact_messages_is_read" ON "contact_messages" ("is_read");`;
  
  const customInsertMatch = existingSchema.match(/-- Insert initial[\s\S]*?;/g);
  const customInserts = customInsertMatch ? customInsertMatch.join('\n\n') : `
-- Insert initial admin user (username: admin, password: admin123)
INSERT INTO "users" ("username", "password", "role")
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT ("username") DO NOTHING;

-- Insert initial stats record
INSERT INTO "stats" ("id", "total_patients", "monthly_patients")
VALUES (1, 124568, 3210)
ON CONFLICT ("id") DO NOTHING;`;
  
  // Step 7: Combine all parts into the final schema file
  const finalSchema = `${header}
${tableCreationPart}

${customIndexes}

${customInserts}`;
  
  // Step 8: Write the updated schema file
  fs.writeFileSync(sqlSchemaPath, finalSchema);
  console.log(`Schema file updated: ${sqlSchemaPath}`);
  
  console.log('Database schema SQL file has been updated successfully!');
} catch (error) {
  console.error('Error updating schema:', error.message);
  process.exit(1);
}