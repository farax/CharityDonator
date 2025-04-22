/**
 * Email service for Aafiyaa Charity Clinics
 * Handles sending emails via Nodemailer
 */
import nodemailer from 'nodemailer';
import { ContactMessage } from '@shared/schema';

// Get email configuration from environment variables or use defaults for development
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@aafiyaaclinic.org';
const EMAIL_TO = process.env.EMAIL_TO || 'admin@aafiyaaclinic.org';

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send a contact form email
 */
export async function sendContactFormEmail(message: ContactMessage): Promise<boolean> {
  // Skip sending if no SMTP credentials are configured
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('Email sending skipped: SMTP credentials not configured');
    return false;
  }

  try {
    // Prepare the email content
    const emailContent = {
      from: `"Aafiyaa Charity Clinics" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: `New Contact Form Message: ${message.subject}`,
      text: `
Name: ${message.name}
Email: ${message.email}
Phone: ${message.phone || 'Not provided'}
Subject: ${message.subject}

Message:
${message.message}

Submitted on: ${new Date(message.createdAt).toLocaleString()}
`,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${message.name}</p>
<p><strong>Email:</strong> ${message.email}</p>
<p><strong>Phone:</strong> ${message.phone || 'Not provided'}</p>
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
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('Email service verification skipped: SMTP credentials not configured');
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