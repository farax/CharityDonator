/**
 * Email service for Aafiyaa Charity Clinics
 * Handles sending emails via Nodemailer
 */
import nodemailer from 'nodemailer';
import { ContactMessage } from '@shared/schema';
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