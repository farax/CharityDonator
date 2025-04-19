/**
 * This script extracts the Drizzle ORM schema definitions from shared/schema.ts
 * and transforms them into raw SQL DDL statements in db/schema.sql
 * 
 * Run this script whenever you make changes to the schema to keep the SQL file in sync
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const schemaPath = path.join(__dirname, '../shared/schema.ts');
const outputPath = path.join(__dirname, './schema.sql');

console.log('Generating SQL schema from Drizzle ORM definitions...');

// Ensure the drizzle-kit is installed
exec('npx drizzle-kit --version', (err) => {
  if (err) {
    console.error('Error: drizzle-kit is not installed. Please install it with "npm install drizzle-kit"');
    process.exit(1);
  }

  // Generate SQL schema using drizzle-kit
  exec('npx drizzle-kit generate:pg', (err, stdout, stderr) => {
    if (err) {
      console.error('Error generating schema:', stderr);
      process.exit(1);
    }

    console.log('Schema generated successfully!');
    console.log('You can find the SQL schema in:', outputPath);
    
    // Add a comment at the top of the file
    const sqlContent = fs.readFileSync(outputPath, 'utf8');
    const updatedContent = `-- Aafiyaa Charity Clinics Database Schema
-- Generated from Drizzle ORM schema definitions
-- Last updated: ${new Date().toISOString()}

${sqlContent}`;
    
    fs.writeFileSync(outputPath, updatedContent);
    console.log('Added timestamp to schema file.');
  });
});