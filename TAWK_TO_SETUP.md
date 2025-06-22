# Tawk.to Live Chat Setup Guide

## Step 1: Create Tawk.to Account
1. Go to [https://www.tawk.to/](https://www.tawk.to/)
2. Sign up for a free account
3. Complete the registration process

## Step 2: Get Your Property ID and Widget ID
1. After logging in, go to your Dashboard
2. Click on "Administration" → "Property"
3. Copy your **Property ID** (format: `5xxxxxxxxxxxxxxx`)
4. Copy your **Widget ID** (format: `1xxxxxxx`)

## Step 3: Add Environment Variables
Add these to your `.env` file:

```
VITE_TAWK_TO_PROPERTY_ID=your_property_id_here
VITE_TAWK_TO_WIDGET_ID=your_widget_id_here
```

## Step 4: Deploy and Test
1. After adding the environment variables, restart your application
2. The chat widget will appear in the bottom-right corner of your website
3. Test by sending a message from your website
4. Log into your Tawk.to dashboard to respond to messages

## Customization Options
- **Widget Position**: Can be changed in Tawk.to dashboard
- **Widget Color**: Matches your site's teal theme automatically
- **Operating Hours**: Set availability in dashboard
- **Automated Messages**: Configure welcome messages
- **Department Routing**: Set up for donations, support, etc.

## Features Included
- Real-time messaging
- File sharing capability
- Visitor information (page they're on, location, etc.)
- Message history
- Mobile responsive
- Offline message collection
- Multiple agent support

## Integration Benefits for Charity
- Direct donor support during donation process
- Quick answers about donation allocation
- Case-specific inquiries
- Payment troubleshooting
- General charity information

The chat widget is now integrated and will automatically appear on all pages of your website once you configure the environment variables.