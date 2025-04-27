#!/bin/bash

# Update repository with latest changes
echo "Pulling latest changes from GitHub..."
cd /var/www/aafiyaa
git pull origin main

# Install or update dependencies
echo "Installing dependencies..."
npm install

# Build the project (if necessary)
echo "Building the project..."
npm run build

# Restart PM2 process (or application) if you're using PM2
echo "Restarting PM2..."
pm2 restart aafiyaa

# Optionally, restart nginx or any other service
echo "Restarting Nginx..."
systemctl restart nginx

echo "Deployment completed successfully!"
