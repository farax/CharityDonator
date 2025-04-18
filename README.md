# Aafiyaa Charity Clinics - Donation Platform

A modern donation platform for Aafiyaa Charity Clinics, built with React, TypeScript, and Express, enabling easy charitable giving with features like multi-currency support and Stripe integration.

## Features

- Responsive design optimized for all devices
- Multi-currency support with automatic exchange rates
- Secure payment processing via Stripe and PayPal
- Different donation types (Zakaat, Sadqah, Interest Disposal)
- Admin dashboard with donation tracking and statistics
- Contact form with database storage
- Case management for specific charitable causes

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- A Stripe account with API keys
- (Optional) A SendGrid account for email notifications

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=production
SESSION_SECRET=your_random_session_secret

# Stripe Configuration
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Email Configuration
SENDGRID_API_KEY=SG...
```

## VPS Deployment Guide

### 1. Server Setup

#### 1.1 Set Up a VPS with Ubuntu 22.04 LTS

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pm2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Set up firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

#### 1.2 Clone the Repository

```bash
# Create a directory for the application
mkdir -p /var/www/aafiyaa
cd /var/www/aafiyaa

# Clone the repository
git clone https://github.com/yourusername/aafiyaa-charity-clinics.git .

# Install dependencies
npm install
```

### 2. Application Configuration

#### 2.1 Environment Configuration

```bash
# Create .env file
nano .env

# Add your environment variables as outlined above
```

#### 2.2 Build the Client

```bash
# Build the frontend
npm run build
```

#### 2.3 Set Up PM2 for Process Management

```bash
# Start the application with PM2
pm2 start server/index.js --name aafiyaa-charity

# Set PM2 to start on system boot
pm2 startup
pm2 save
```

### 3. Nginx Configuration

#### 3.1 Create Nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/aafiyaa
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3.2 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/aafiyaa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Configuration

#### 4.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 4.2 Obtain and Configure SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 5. Database Setup (for persistent storage)

If you want to use a persistent database instead of the in-memory storage:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create a database and user
sudo -u postgres psql

postgres=# CREATE DATABASE aafiyaa;
postgres=# CREATE USER aafiyaa_user WITH ENCRYPTED PASSWORD 'your_password';
postgres=# GRANT ALL PRIVILEGES ON DATABASE aafiyaa TO aafiyaa_user;
postgres=# \q

# Update your .env file with database connection info
echo "DATABASE_URL=postgresql://aafiyaa_user:your_password@localhost:5432/aafiyaa" >> .env
```

### 6. Maintenance and Updates

#### 6.1 Update Application Code

```bash
cd /var/www/aafiyaa
git pull
npm install
npm run build
pm2 restart aafiyaa-charity
```

#### 6.2 Monitor Application

```bash
# View logs
pm2 logs aafiyaa-charity

# Monitor performance
pm2 monit
```

#### 6.3 Database Backup (if using PostgreSQL)

```bash
# Create a backup
sudo -u postgres pg_dump aafiyaa > aafiyaa_backup_$(date +%F).sql

# Set up automatic backups with cron
(crontab -l 2>/dev/null; echo "0 3 * * * sudo -u postgres pg_dump aafiyaa > /var/backups/aafiyaa_backup_$(date +\%F).sql") | crontab -
```

## Webhook Setup for Stripe

For Stripe webhooks, make sure your webhook endpoint is publicly accessible:

1. In your Stripe Dashboard, go to Developers > Webhooks
2. Add a new endpoint: `https://yourdomain.com/api/webhook`
3. Subscribe to events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Get the signing secret and add it to your `.env` file

## Support and Troubleshooting

Common issues:

- **Application won't start**: Check your environment variables and make sure all required ones are set
- **Stripe payments failing**: Ensure your Stripe API keys are correct and that your account is properly configured
- **504 Gateway Timeout**: Adjust Nginx timeout settings if needed for long-running operations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact support@aafiyaaclinics.org