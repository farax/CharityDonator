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

#### PDF Receipt Generation Dependencies (VPS Deployment Only)

If deploying to a VPS (like IONOS, DigitalOcean, AWS EC2, etc.), you'll need to install system dependencies for PDF receipt generation. **Note: This is not required for managed platforms like Replit, Heroku, or Render.**

**Ubuntu/Debian systems:**
```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgtk-3-0 \
  libgtk-4-1 \
  libxss1 \
  libasound2 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libatspi2.0-0 \
  libxtst6 \
  libxrender1 \
  libcairo2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libglib2.0-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libxcb1 \
  libxcursor1
```

**CentOS/RHEL/Amazon Linux:**
```bash
sudo yum install -y \
  nss \
  atk \
  at-spi2-atk \
  cups-libs \
  libdrm \
  gtk3 \
  libXScrnSaver \
  alsa-lib \
  libX11-xcb \
  libXcomposite \
  libXdamage \
  libXext \
  libXfixes \
  libXi \
  libXrandr \
  mesa-libgbm \
  libxkbcommon \
  at-spi2-core
```

> **Why these dependencies?** The application uses Puppeteer to generate PDF receipts. While Puppeteer includes a bundled Chromium browser, it requires these system libraries to run properly on Linux servers.

#### Troubleshooting PDF Receipt Generation

If you're experiencing PDF receipt generation issues after deploying to a VPS, here are common problems and solutions:

**Problem 1: "failed to launch the browser process" or "libatk-1.0.so.0: cannot open shared object file"**

This indicates missing or incomplete system dependencies.

**Solution:**
```bash
# Check if critical libraries are installed
dpkg -l | grep -E "(libnss3|libatk|libgtk)"

# If missing, install them:
sudo apt-get update
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgtk-3-0 \
  libxss1 \
  libasound2t64

# Restart your application
pm2 restart aafiyaa  # or your app name
```

**Problem 2: Installation gets stuck on "libasound2 package selection"**

Ubuntu systems may ask you to choose between libasound2 packages.

**Solution:**
```bash
# Install the correct package for modern Ubuntu
sudo apt-get install -y libasound2t64

# Then complete the installation with remaining dependencies
sudo apt-get install -y \
  libx11-xcb1 libxcomposite1 libxdamage1 libxext6 \
  libxfixes3 libxi6 libxrandr2 libgbm1 libxkbcommon0 \
  libatspi2.0-0 libxtst6 libxrender1 libcairo2
```

**Problem 3: Testing if browser launches correctly**

Use this test command to verify Puppeteer can launch the browser:

```bash
cd /path/to/your/app
node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({
  headless: true, 
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}).then(() => {
  console.log('✅ Browser launches successfully!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Browser launch failed:', err.message);
  process.exit(1);
});
"
```

**Problem 4: Permission issues with receipts directory**

PDF files might fail to save due to permission issues:

```bash
# Create and set proper permissions for receipts directory
mkdir -p /path/to/your/app/receipts
chmod 755 /path/to/your/app/receipts
chown -R $USER:$USER /path/to/your/app/receipts
```

**Problem 5: User context issues**

Dependencies might be installed for the wrong user. Check who's running your app:

```bash
# Check which user is running your Node.js process
ps aux | grep node
pm2 status

# Install dependencies system-wide if needed
sudo apt-get install -y [dependencies from above]
```

**Verification Steps:**
1. Run the browser test command above
2. Check application logs: `pm2 logs your-app-name`
3. Make a test donation to verify PDF generation works
4. Check if receipt files are created in the `receipts/` directory

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

#### Required Environment Variables

These environment variables are required for the application to function properly:

```
# Session management
SESSION_SECRET=your_secure_random_string

# Admin authentication
ADMIN_USERNAME=your_secure_username
ADMIN_PASSWORD=your_secure_password

# Stripe integration
STRIPE_SECRET_KEY=sk_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_your_stripe_public_key

# Database connection (if using PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
# OR individual connection parameters
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name
PGHOST=localhost
PGPORT=5432
```

> **Note about Session Management**: The application uses in-memory session storage by default, which means sessions are reset when the server restarts. In a production environment, consider using a persistent session store with the PostgreSQL database.

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

### Detailed Guide for IONOS VPS Deployment

#### 1. Initial VPS Setup

1. **Login to your IONOS control panel** and access your VPS
2. **Choose an operating system** - Ubuntu Server (20.04 LTS or newer) is recommended for Node.js applications
3. **Set up SSH access** to safely connect to your server

#### 2. Server Preparation

Connect to your VPS via SSH and install the necessary dependencies:

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js (v16.x or newer recommended for this project)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials and git
sudo apt install -y build-essential git

# Check installations
node -v
npm -v
git --version
```

#### 3. Create a Deployment User (Optional but Recommended)

```bash
# Create a deployment user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Switch to the new user for deployment tasks
su - deploy
```

#### 4. Clone Your Application

```bash
# Create a directory for your application
mkdir -p /var/www/aafiyaa
cd /var/www/aafiyaa

# Clone your application from git (or transfer files using SCP/SFTP)
git clone <your-repository-url> .
```

#### 5. Environment Setup

Create a `.env` file with your production environment variables:

```bash
nano .env
```

Include all necessary environment variables:

```
# Server
NODE_ENV=production
PORT=3000

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx

# PayPal (if used)
PAYPAL_SECRET_KEY=xxxxx
VITE_PAYPAL_CLIENT_ID=xxxxx

# New Relic (if used)
NEW_RELIC_LICENSE_KEY=xxxxx
VITE_NEW_RELIC_ACCOUNT_ID=xxxxx
VITE_NEW_RELIC_APPLICATION_ID=xxxxx
VITE_NEW_RELIC_BROWSER_LICENSE_KEY=xxxxx

# Admin access
ADMIN_USERNAME=your_secure_username
ADMIN_PASSWORD=your_secure_password

# Other settings as needed
```

#### 6. Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build the application for production
npm run build
```

#### 7. Set Up Process Manager (PM2)

PM2 will keep your Node.js application running and restart it if it crashes:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your application
pm2 start server/index.js --name aafiyaa

# Configure PM2 to start on system boot
pm2 startup
# Run the command that PM2 outputs

# Save the current PM2 configuration
pm2 save
```

#### 8. Set Up Nginx as a Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create a new Nginx configuration
sudo nano /etc/nginx/sites-available/aafiyaa
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/aafiyaa /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 9. Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts to configure HTTPS
```

#### 10. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Enable the firewall
sudo ufw enable
```

#### 11. Set Up Stripe Webhooks for Production

1. Login to your Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Add a new endpoint with your production URL:
   `https://your-domain.com/api/webhooks/stripe`
4. Select the relevant events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`

#### 12. Monitor and Maintain

```bash
# Monitor system performance
htop

# Monitor PM2 processes and stats
pm2 monit

# Update your application
cd /var/www/aafiyaa
git pull
npm install
npm run build
pm2 restart aafiyaa
```

#### Accessing Application Logs

The application generates detailed logs that are useful for monitoring, debugging, and auditing. On a VPS deployment with PM2, logs are stored automatically:

```bash
# View real-time logs (most useful for debugging)
pm2 logs aafiyaa

# View only the most recent 100 lines
pm2 logs aafiyaa --lines 100

# View only error logs
pm2 logs aafiyaa --err

# Access log files directly
cat ~/.pm2/logs/aafiyaa-out.log    # Standard output
cat ~/.pm2/logs/aafiyaa-error.log  # Error output

# Search logs for specific events
grep "payment" ~/.pm2/logs/aafiyaa-out.log
```

PM2 handles log rotation automatically to prevent logs from growing too large.

#### 13. Set Up Regular Backups

```bash
# Install database backup tools if needed
sudo apt install -y postgresql-client

# Create a backup script
nano backup.sh
```

Add backup commands to the script and schedule regular backups with cron.

#### Additional Considerations for IONOS VPS

1. **Configure IONOS DNS**: Point your domain to your VPS IP address
2. **Resource Monitoring**: Use IONOS monitoring tools or install monitoring software like Netdata
3. **Regular Updates**: Set up automatic security updates with `unattended-upgrades`
4. **Database**: If you're using a database, consider setting it up separately for better scalability

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