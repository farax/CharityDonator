/**
 * Database initialization script for Aafiyaa Charity Clinics
 * 
 * This script can be used to initialize a PostgreSQL database with the schema defined in schema.sql
 * It requires the following environment variables to be set:
 * - DATABASE_URL or PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT
 * 
 * Usage: node setup-db.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine database connection details
const useConnectionUrl = process.env.DATABASE_URL ? true : false;
const dbConfig = useConnectionUrl
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      host: process.env.PGHOST,
      port: process.env.PGPORT || 5432,
    };

// Check if psql is available
exec('which psql', (error) => {
  if (error) {
    console.error('Error: PostgreSQL client (psql) is not installed or not in PATH.');
    console.error('Please install PostgreSQL or make sure psql is in your PATH.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('Error: Schema file not found at', schemaPath);
    process.exit(1);
  }

  console.log('Setting up Aafiyaa Charity Clinics database schema...');

  // Construct the base psql command or environment variables
  let baseCommand;
  let envVars = '';
  
  if (useConnectionUrl) {
    baseCommand = `psql "${process.env.DATABASE_URL}"`;
  } else {
    envVars = Object.entries({
      PGUSER: dbConfig.user,
      PGPASSWORD: dbConfig.password,
      PGDATABASE: dbConfig.database,
      PGHOST: dbConfig.host,
      PGPORT: dbConfig.port,
    })
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
      
    baseCommand = `psql`;
  }

  // First run the schema SQL
  const schemaCommand = useConnectionUrl 
    ? `${baseCommand} -f "${schemaPath}"` 
    : `${envVars} ${baseCommand} -f "${schemaPath}"`;
    
  console.log('Applying database schema...');
  
  exec(schemaCommand, (err, stdout, stderr) => {
    if (err) {
      console.error('Error executing schema SQL:', stderr);
      process.exit(1);
    }

    console.log('Database schema setup complete!');
    console.log(stdout);
    
    // Check if seed file exists
    if (fs.existsSync(seedPath)) {
      console.log('Applying seed data...');
      
      // Now run the seed SQL if schema was successful
      const seedCommand = useConnectionUrl
        ? `${baseCommand} -f "${seedPath}"`
        : `${envVars} ${baseCommand} -f "${seedPath}"`;
        
      exec(seedCommand, (seedErr, seedStdout, seedStderr) => {
        if (seedErr) {
          console.error('Error executing seed SQL:', seedStderr);
          process.exit(1);
        }
        
        console.log('Seed data applied successfully!');
        console.log(seedStdout);
        console.log('Database setup complete!');
      });
    } else {
      console.log('No seed file found. Database setup complete!');
    }
  });
});