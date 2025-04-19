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
  
  if (!fs.existsSync(schemaPath)) {
    console.error('Error: Schema file not found at', schemaPath);
    process.exit(1);
  }

  console.log('Setting up Aafiyaa Charity Clinics database...');

  // Construct the psql command
  let psqlCommand;
  if (useConnectionUrl) {
    psqlCommand = `psql "${process.env.DATABASE_URL}" -f "${schemaPath}"`;
  } else {
    const envVars = Object.entries({
      PGUSER: dbConfig.user,
      PGPASSWORD: dbConfig.password,
      PGDATABASE: dbConfig.database,
      PGHOST: dbConfig.host,
      PGPORT: dbConfig.port,
    })
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    psqlCommand = `${envVars} psql -f "${schemaPath}"`;
  }

  // Run the command
  exec(psqlCommand, (err, stdout, stderr) => {
    if (err) {
      console.error('Error executing SQL:', stderr);
      process.exit(1);
    }

    console.log('Database setup complete!');
    console.log(stdout);
  });
});