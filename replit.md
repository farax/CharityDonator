# Aafiyaa Charity Clinics Donation Platform

## Overview

Aafiyaa Charity Clinics is a sophisticated donation platform that facilitates charitable giving for medical services worldwide. The platform provides a seamless donation experience with multiple payment methods, currency support, and comprehensive case management. Built with modern web technologies, it serves as both a public-facing donation interface and an administrative management system for charity operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type-safe component development
- **Styling**: Tailwind CSS with Shadcn UI component library for consistent design
- **State Management**: React Context API for donation flow state and currency management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express-session with configurable storage (memory or PostgreSQL)
- **Webhook Processing**: Dedicated handlers for payment provider webhooks with retry logic
- **Email Service**: Nodemailer integration for transactional emails

### Data Storage Solutions
- **Primary Database**: PostgreSQL for production with automatic schema migration
- **Fallback Storage**: In-memory storage for development and testing environments
- **Schema Management**: Drizzle Kit for database migrations and schema updates
- **Data Models**: Users, donations, cases, endorsements, statistics, contact messages, and webhook events
- **Case Management**: Full CRUD operations for donation cases with status management and progress tracking

### Payment Processing Architecture
- **Primary Provider**: Stripe for credit card processing with support for multiple currencies
- **Secondary Provider**: PayPal integration (configurable via feature flags)
- **Subscription Handling**: Automated recurring donation processing for weekly and monthly frequencies
- **Webhook Security**: Signature verification and event deduplication for reliable payment status updates
- **Currency Support**: Multi-currency donation processing with real-time exchange rate conversion

### Authentication and Authorization
- **Admin Authentication**: Session-based authentication for administrative access
- **Security**: Environment variable separation for test and production API keys
- **Access Control**: Role-based access to administrative functions and donation management
- **Admin Portal**: Comprehensive case management interface with create, edit, delete, and status toggle capabilities

### Analytics and Monitoring
- **Performance Monitoring**: New Relic integration for application performance monitoring
- **Event Tracking**: Custom event logging for payment transactions and user interactions
- **Error Handling**: Comprehensive error tracking with alert systems for critical payment issues

## External Dependencies

### Payment Gateways
- **Stripe API**: Primary payment processor supporting credit cards, Apple Pay, and Google Pay
- **PayPal SDK**: Secondary payment option for PayPal balance and account payments
- **Currency Exchange**: Real-time exchange rate API for multi-currency support

### Monitoring and Analytics
- **New Relic**: Application performance monitoring and custom event tracking
- **Browser Agent**: Client-side analytics for user interaction tracking

### Communication Services
- **Tawk.to**: Live chat widget for real-time customer support
- **Gmail SMTP**: Email service for contact form submissions and transactional emails

### Development and Deployment
- **PostgreSQL**: Production database with SSL support
- **Environment Configuration**: Comprehensive environment variable management for different deployment stages
- **Testing Framework**: Vitest for unit and integration testing with payment flow validation
- **Case Management Testing**: Comprehensive test suite covering CRUD operations, API endpoints, and integration workflows

### Third-Party Integrations
- **Social Media**: Facebook integration for community engagement
- **Currency Data**: External API for real-time exchange rates and currency detection
- **Image Assets**: Static asset management for case images and organizational logos