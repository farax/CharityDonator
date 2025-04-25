# Aafiyaa Charity Clinics Database

This directory contains SQL files for working with the Aafiyaa Charity Clinics database.

## Files

- `schema.sql` - Contains the complete database schema definition. Use this to create a new database from scratch.
- `seed.sql` - Contains sample data for development and testing. Use after creating the schema to populate the database with initial data.

## Automatic Database Setup

The application is configured to automatically set up the database tables and initial data when started with a valid PostgreSQL connection (via `DATABASE_URL` environment variable). This is handled by the code in `server/db.ts` which:

1. Checks if the database connection is available
2. Creates all necessary tables if they don't exist
3. Initializes the database with sample data for endorsements, cases, and stats

## Manual Database Setup

If you need to manually set up the database, you can use the SQL files provided:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Inside the PostgreSQL console:
\i path/to/schema.sql
\i path/to/seed.sql
```

## Schema Updates

When making changes to the database schema, follow these steps:

1. Update the Drizzle schema definitions in `shared/schema.ts`
2. Update the DDL statements in `schema.sql` to match the Drizzle schema
3. Update any relevant seed data in `seed.sql`
4. Test the changes by recreating the database with the updated schema

## Database Configuration

The application uses the following environment variables for database configuration:

- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` - Individual connection parameters (used if `DATABASE_URL` is not provided)

## Fallback Mechanism

If no database connection is available, the application will automatically fall back to in-memory storage, which is suitable for development and testing but not for production use.