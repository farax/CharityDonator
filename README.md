# Aafiyaa Charity Clinics Donation Platform

A sophisticated donation platform for Aafiyaa Charity Clinics, leveraging modern web technologies to create an engaging and user-friendly charitable giving experience.

## Features

- Donation processing with multiple payment methods (Stripe, PayPal, Apple Pay, Google Pay)
- Multiple donation types (Zakaat, Sadqah, Interest Disposal)
- Support for recurring donations (one-off, weekly, monthly)
- Real-time currency conversion
- Case management for specific donation targets
- Admin dashboard for donation management and statistics
- Mobile-responsive design
- Comprehensive analytics tracking

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Express.js
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: React Context API
- **Payment Processing**: Stripe and PayPal integrations
- **Analytics**: New Relic browser agent
- **Database**: Support for in-memory storage (development) and PostgreSQL (production)

## Deployment

This application is designed to be easily deployable to any hosting environment. Follow the instructions below to deploy to your preferred hosting provider.

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- PostgreSQL (optional, for production)

### Environment Configuration

1. Copy the `.env.example` file to `.env` and fill in the required environment variables:

```bash
cp .env.example .env
```

2. Update the `.env` file with your specific configuration values:
   - Payment gateway API keys (Stripe, PayPal)
   - Session secret
   - Database credentials (if using PostgreSQL)
   - Analytics credentials (if using New Relic)

### Database Setup (PostgreSQL, Optional)

If you're using PostgreSQL for production:

1. Create a PostgreSQL database for the application
2. Run the database initialization script:

```bash
node db/setup-db.js
```

### Installation and Build

1. Install dependencies:

```bash
npm install
```

2. Build the application:

```bash
npm run build
```

3. Start the server:

```bash
npm start
```

The application will be available at http://localhost:5000 (or the port specified in your environment configuration).

### Deploying to a VPS

1. Clone the repository on your server
2. Follow the installation steps above
3. Use a process manager like PM2 to keep the application running:

```bash
npm install -g pm2
pm2 start npm --name "aafiyaa" -- start
```

4. Set up a reverse proxy with Nginx or Apache to serve the application on your domain

### Deploying to a Platform as a Service (PaaS)

The application is compatible with most PaaS platforms like Heroku, Render, or Railway:

1. Connect your git repository to your PaaS provider
2. Configure the environment variables in your PaaS dashboard
3. Deploy the application

## Development

To run the application in development mode:

```bash
npm run dev
```

The application will be available at http://localhost:5000 with hot-reloading enabled.

## License

All rights reserved. This codebase is proprietary and confidential.