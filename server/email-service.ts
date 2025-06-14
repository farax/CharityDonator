/**
 * Email service for Aafiyaa Charity Clinics
 * Handles sending emails via Nodemailer
 */
import nodemailer from 'nodemailer';
import { ContactMessage, Donation } from '@shared/schema';
import config from './config';

// Variable to hold the transporter
let transporter: nodemailer.Transporter;

// Create a testing account if no SMTP credentials are provided
async function createTransporter() {
  if (config.EMAIL.SMTP_USER && config.EMAIL.SMTP_PASS) {
    console.log('Using configured SMTP settings for Gmail');
    
    // Remove any spaces from the app password (common issue with Gmail app passwords)
    const password = config.EMAIL.SMTP_PASS.replace(/\s+/g, '');
    console.log(`Using email: ${config.EMAIL.SMTP_USER}`);
    console.log(`Password length: ${password.length} characters (spaces removed)`);
    
    // Create a Gmail-specific transporter
    return nodemailer.createTransport({
      service: 'gmail',  // This uses Gmail's predefined settings
      auth: {
        user: config.EMAIL.SMTP_USER,
        pass: password,  // Using the cleaned password without spaces
      },
      // Debugging for development
      debug: config.IS_DEVELOPMENT,
      logger: config.IS_DEVELOPMENT
    });
  } else {
    console.log('No SMTP credentials configured, contact form will save messages without sending emails');
    // Return a placeholder transporter that will fail silently
    return {
      sendMail: async () => {
        console.log('Email sending skipped: No SMTP credentials');
        return { messageId: 'no-email-sent' };
      },
      verify: async () => {
        return false;
      }
    } as any;
  }
}

// Initialize the transporter
(async () => {
  transporter = await createTransporter();
})();

/**
 * Send a contact form email
 */
export async function sendContactFormEmail(message: ContactMessage): Promise<boolean> {
  try {
    // Make sure transporter is initialized
    if (!transporter) {
      transporter = await createTransporter();
    }

    // Skip verification - if transporter fails, it will be caught in the try/catch
    
    // Prepare the email content
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config.EMAIL.FROM}>`,
      to: config.EMAIL.TO,
      subject: `New Contact Form Message: ${message.subject}`,
      text: `
Name: ${message.name}
Email: ${message.email}
Subject: ${message.subject}

Message:
${message.message}

Submitted on: ${new Date(message.createdAt).toLocaleString()}
`,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${message.name}</p>
<p><strong>Email:</strong> ${message.email}</p>
<p><strong>Subject:</strong> ${message.subject}</p>
<h3>Message:</h3>
<p>${message.message.replace(/\n/g, '<br>')}</p>
<p><small>Submitted on: ${new Date(message.createdAt).toLocaleString()}</small></p>
`,
    };

    // Send the email
    const info = await transporter.sendMail(emailContent);
    console.log('Contact form email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return false;
  }
}

/**
 * Send a donation receipt email
 */
export async function sendDonationReceipt(donation: Donation, userEmail?: string): Promise<boolean> {
  try {
    // Skip if no transporter or no recipient email
    if (!transporter || !userEmail) {
      console.log(`Email sending skipped: ${!transporter ? 'No transporter' : 'No recipient email'}`);
      return false;
    }

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: donation.currency || 'AUD'
    }).format(donation.amount);

    // Determine if this is a one-time or recurring donation
    const isRecurring = donation.frequency !== 'one-off';
    const donationType = isRecurring ? `Recurring ${donation.frequency}` : 'One-time';
    
    // Format date
    const donationDate = new Date().toLocaleString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create email content
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config.EMAIL.FROM}>`,
      to: userEmail,
      subject: `Receipt for Your ${donationType} Donation to Aafiyaa Charity Clinics`,
      text: `
Thank you for your donation to Aafiyaa Charity Clinics!

Donation Details:
- Amount: ${formattedAmount}
- Type: ${donation.type}
- Frequency: ${donationType}
- Date: ${donationDate}
${donation.caseId ? `- For Case: ID #${donation.caseId}` : ''}

Your generosity helps us continue our mission to provide medical care to those in need.

For any questions about your donation, please contact us at ${config.EMAIL.FROM}.

Thank you again for your support!

Aafiyaa Charity Clinics Team
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #008080; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; border: 1px solid #eee; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .donation-details { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #008080; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Your Donation!</h1>
    </div>
    <div class="content">
      <p>Dear Supporter,</p>
      <p>Thank you for your generous donation to Aafiyaa Charity Clinics. Your support makes a meaningful difference in providing healthcare to those in need.</p>
      
      <div class="donation-details">
        <h3>Donation Details:</h3>
        <p><strong>Amount:</strong> ${formattedAmount}</p>
        <p><strong>Purpose:</strong> ${donation.type}</p>
        <p><strong>Frequency:</strong> ${donationType}</p>
        <p><strong>Date:</strong> ${donationDate}</p>
        ${donation.caseId ? `<p><strong>For Case:</strong> ID #${donation.caseId}</p>` : ''}
      </div>
      
      ${isRecurring ? `<p>Your recurring donation has been set up successfully. You will be charged ${formattedAmount} ${donation.frequency}.</p>` : ''}
      
      <p>If you have any questions about your donation, please don't hesitate to contact us at <a href="mailto:${config.EMAIL.FROM}">${config.EMAIL.FROM}</a>.</p>
      
      <p>With gratitude,<br>The Aafiyaa Charity Clinics Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`,
    };

    // Send the email
    const info = await transporter.sendMail(emailContent);
    console.log('Donation receipt email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending donation receipt email:', error);
    return false;
  }
}

/**
 * Send a subscription confirmation email
 */
export async function sendSubscriptionConfirmation(donation: Donation, userEmail?: string): Promise<boolean> {
  try {
    // Skip if no transporter or no recipient email
    if (!transporter || !userEmail) {
      console.log(`Email sending skipped: ${!transporter ? 'No transporter' : 'No recipient email'}`);
      return false;
    }

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: donation.currency || 'AUD'
    }).format(donation.amount);
    
    // Format next payment date if available
    let nextPaymentDate = 'soon';
    if (donation.nextPaymentDate) {
      nextPaymentDate = new Date(donation.nextPaymentDate).toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Create email content
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config.EMAIL.FROM}>`,
      to: userEmail,
      subject: `Your Recurring Donation to Aafiyaa Charity Clinics Has Been Set Up`,
      text: `
Thank you for setting up a recurring donation to Aafiyaa Charity Clinics!

Subscription Details:
- Amount: ${formattedAmount} ${donation.frequency}
- Type: ${donation.type}
- Next payment date: ${nextPaymentDate}
${donation.caseId ? `- For Case: ID #${donation.caseId}` : ''}

Your continued support helps us provide consistent medical care to those in need.

For any questions about your subscription, please contact us at ${config.EMAIL.FROM}.

Thank you again for your ongoing support!

Aafiyaa Charity Clinics Team
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #008080; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; border: 1px solid #eee; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .subscription-details { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #008080; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recurring Donation Confirmed</h1>
    </div>
    <div class="content">
      <p>Dear Supporter,</p>
      <p>Thank you for setting up a recurring donation to Aafiyaa Charity Clinics. Your ongoing support allows us to plan and provide consistent healthcare services to those in need.</p>
      
      <div class="subscription-details">
        <h3>Subscription Details:</h3>
        <p><strong>Amount:</strong> ${formattedAmount} ${donation.frequency}</p>
        <p><strong>Purpose:</strong> ${donation.type}</p>
        <p><strong>Next payment:</strong> ${nextPaymentDate}</p>
        ${donation.caseId ? `<p><strong>For Case:</strong> ID #${donation.caseId}</p>` : ''}
      </div>
      
      <p>Your first payment has been processed successfully, and future payments will be automatically charged according to the schedule.</p>
      
      <p>If you need to modify or cancel your subscription, or if you have any questions, please contact us at <a href="mailto:${config.EMAIL.FROM}">${config.EMAIL.FROM}</a>.</p>
      
      <p>With gratitude,<br>The Aafiyaa Charity Clinics Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`,
    };

    // Send the email
    const info = await transporter.sendMail(emailContent);
    console.log('Subscription confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error);
    return false;
  }
}

/**
 * Verify SMTP connection
 * Useful for checking if the email service is properly configured
 */
export async function verifyEmailService(): Promise<boolean> {
  // Make sure transporter is initialized
  if (!transporter) {
    transporter = await createTransporter();
  }
  
  // If no credentials, return false but don't log a warning (already logged in createTransporter)
  if (!config.EMAIL.SMTP_USER || !config.EMAIL.SMTP_PASS) {
    return false;
  }

  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service verification failed:', error);
    return false;
  }
}