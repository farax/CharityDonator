/**
 * Email service for Aafiyaa Charity Clinics
 * Handles sending emails via Nodemailer
 */
import nodemailer from 'nodemailer';
import { ContactMessage, Donation } from '@shared/schema';
import config from './config';
import { promises as fs } from 'fs';
import path from 'path';

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
 * Send PDF receipt email with attachment
 */
export async function sendPDFReceipt(
  donation: Donation, 
  receiptNumber: string, 
  pdfPath: string,
  caseTitle?: string
): Promise<boolean> {
  try {
    // Skip if no transporter or no recipient email
    if (!transporter || !donation.email) {
      console.log(`PDF receipt email sending skipped: ${!transporter ? 'No transporter' : 'No recipient email'}`);
      return false;
    }

    // Check if PDF file exists
    try {
      await fs.access(pdfPath);
    } catch (error) {
      console.error('PDF file not found:', pdfPath);
      return false;
    }

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: donation.currency || 'AUD'
    }).format(donation.amount);

    // Determine donation type and frequency labels
    const donationTypeLabel = getDonationTypeLabel(donation.type);
    const frequencyLabel = getFrequencyLabel(donation.frequency);
    
    // Format date
    const donationDate = new Date(donation.createdAt).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create email content
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${config.EMAIL.FROM}>`,
      to: donation.email,
      subject: `Your Donation Receipt - ${receiptNumber}`,
      text: `
Dear ${donation.name || 'Valued Supporter'},

Thank you for your generous donation to Aafiyaa Charity Clinics!

Your donation receipt is attached as a PDF file for your records.

Donation Details:
- Receipt Number: ${receiptNumber}
- Amount: ${formattedAmount}
- Type: ${donationTypeLabel}
- Frequency: ${frequencyLabel}
- Date: ${donationDate}
${caseTitle ? `- Supporting Case: ${caseTitle}` : ''}
${donation.destinationProject ? `- Destination: ${donation.destinationProject}` : ''}

This receipt is valid for tax deduction purposes. Please consult with your tax advisor regarding the deductibility of your charitable contributions.

Your support helps us provide essential healthcare services to communities in need around the world.

Thank you again for your generosity!

With gratitude,
The Aafiyaa Charity Clinics Team

---
This receipt has been electronically generated and is valid without a signature.
Please retain this email and the attached PDF for your tax records.
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; }
    .receipt-info { background-color: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .receipt-number { font-size: 18px; font-weight: bold; color: #14b8a6; margin-bottom: 10px; }
    .donation-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: 600; color: #374151; }
    .detail-value { color: #1f2937; }
    .amount-highlight { text-align: center; background: linear-gradient(135deg, #14b8a6, #10b981); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount-text { font-size: 28px; font-weight: bold; margin: 0; }
    .tax-info { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .tax-info h3 { color: #065f46; margin: 0 0 10px 0; }
    .tax-info p { color: #047857; margin: 0; }
    .attachment-note { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .attachment-note h4 { color: #92400e; margin: 0 0 5px 0; }
    .attachment-note p { color: #d97706; margin: 0; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Aafiyaa Charity Clinics</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Healthcare & Compassion</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Generous Donation!</h2>
      
      <div class="receipt-info">
        <div class="receipt-number">Receipt Number: ${receiptNumber}</div>
        <p style="margin: 0; color: #047857;">Your official donation receipt is attached as a PDF file.</p>
      </div>
      
      <div class="amount-highlight">
        <div class="amount-text">${formattedAmount}</div>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Total Donation Amount</p>
      </div>
      
      <div class="donation-details">
        <h3 style="margin: 0 0 15px 0; color: #374151;">Donation Summary</h3>
        <div class="detail-row">
          <span class="detail-label">Type:</span>
          <span class="detail-value">${donationTypeLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Frequency:</span>
          <span class="detail-value">${frequencyLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${donationDate}</span>
        </div>
        ${donation.name ? `
        <div class="detail-row">
          <span class="detail-label">Donor:</span>
          <span class="detail-value">${donation.name}</span>
        </div>
        ` : ''}
        ${caseTitle ? `
        <div class="detail-row">
          <span class="detail-label">Supporting Case:</span>
          <span class="detail-value">${caseTitle}</span>
        </div>
        ` : ''}
        ${donation.destinationProject ? `
        <div class="detail-row">
          <span class="detail-label">Destination:</span>
          <span class="detail-value">${donation.destinationProject}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="attachment-note">
        <h4>📎 Receipt Attached</h4>
        <p>Your official PDF receipt is attached to this email. This document is valid for tax deduction purposes and should be retained for your records.</p>
      </div>
      
      <div class="tax-info">
        <h3>Tax Deduction Information</h3>
        <p>This receipt confirms your charitable donation to Aafiyaa Charity Clinics. Your contribution is tax-deductible to the extent allowed by law. Please consult with your tax advisor regarding the deductibility of your charitable contributions.</p>
      </div>
      
      <p style="margin: 30px 0 20px 0; text-align: center; color: #6b7280;">
        Your support helps us provide essential healthcare services to communities in need around the world.
      </p>
      
      <p style="text-align: center; font-weight: 600; color: #14b8a6;">
        Thank you for making a difference! 🙏
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Aafiyaa Charity Clinics</strong><br>
      Email: info@aafiyaa.com | Website: www.aafiyaa.com</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This receipt has been electronically generated and is valid without a signature.<br>
        Please retain this email and the attached PDF for your tax records.
      </p>
    </div>
  </div>
</body>
</html>
`,
      attachments: [
        {
          filename: `receipt_${receiptNumber}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send the email
    const info = await transporter.sendMail(emailContent);
    console.log(`PDF receipt email sent successfully: ${info.messageId} to ${donation.email}`);
    return true;
    
  } catch (error) {
    console.error('Error sending PDF receipt email:', error);
    return false;
  }
}

// Helper functions for donation labels
function getDonationTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'zakaat': return 'Zakaat';
    case 'sadqah': return 'Sadqah';
    case 'interest': return 'Interest';
    default: return type;
  }
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency.toLowerCase()) {
    case 'one-off': return 'One-time donation';
    case 'weekly': return 'Weekly recurring donation';
    case 'monthly': return 'Monthly recurring donation';
    default: return frequency;
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