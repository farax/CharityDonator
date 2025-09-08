import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import type { Donation, Receipt } from '@shared/schema';

interface ReceiptData {
  donation: Donation;
  receiptNumber: string;
  caseTitle?: string;
}

// Ensure receipts directory exists
const receiptsDir = path.join(process.cwd(), 'receipts');
async function ensureReceiptsDir() {
  try {
    await fs.mkdir(receiptsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating receipts directory:', error);
  }
}

// Generate unique receipt number
export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  return `AC-${year}${month}${day}-${timestamp}`;
}

// Format currency amount
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD'
  }).format(amount);
}

// Format date for receipt
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get donation type label
function getDonationTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'zakaat': return 'Zakaat';
    case 'sadqah': return 'Sadqah';
    case 'interest': return 'Interest';
    default: return type;
  }
}

// Get frequency label
function getFrequencyLabel(frequency: string): string {
  switch (frequency.toLowerCase()) {
    case 'one-off': return 'One-time donation';
    case 'weekly': return 'Weekly recurring donation';
    case 'monthly': return 'Monthly recurring donation';
    default: return frequency;
  }
}

// Generate HTML receipt template
function generateReceiptHTML(data: ReceiptData): string {
  const { donation, receiptNumber, caseTitle } = data;
  const currentDate = new Date();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Receipt - ${receiptNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #14b8a6;
          padding-bottom: 30px;
        }
        
        .logo-section {
          margin-bottom: 20px;
        }
        
        .logo-icon {
          display: inline-block;
          width: 60px;
          height: 60px;
          background: #14b8a6;
          border-radius: 50%;
          margin-bottom: 15px;
          position: relative;
        }
        
        .logo-icon::before {
          content: '♡';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 30px;
        }
        
        .org-name {
          font-size: 32px;
          font-weight: bold;
          color: #14b8a6;
          margin-bottom: 5px;
        }
        
        .org-tagline {
          font-size: 14px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .receipt-title {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin: 30px 0 10px 0;
        }
        
        .receipt-subtitle {
          font-size: 16px;
          color: #6b7280;
        }
        
        .receipt-info {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .receipt-number {
          font-weight: bold;
          color: #14b8a6;
        }
        
        .receipt-date {
          color: #6b7280;
        }
        
        .donation-details {
          margin: 30px 0;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .detail-item {
          padding: 15px;
          background: #f9fafb;
          border-radius: 6px;
          border-left: 4px solid #14b8a6;
        }
        
        .detail-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }
        
        .detail-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .amount-highlight {
          grid-column: 1 / -1;
          text-align: center;
          padding: 25px;
          background: linear-gradient(135deg, #14b8a6, #10b981);
          color: white;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .amount-label {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        
        .amount-value {
          font-size: 36px;
          font-weight: bold;
        }
        
        .tax-info {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }
        
        .tax-title {
          font-size: 18px;
          font-weight: bold;
          color: #065f46;
          margin-bottom: 10px;
        }
        
        .tax-text {
          color: #047857;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        
        .contact-info {
          margin-top: 20px;
        }
        
        .thank-you {
          background: #fef3f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          text-align: center;
        }
        
        .thank-you h3 {
          color: #dc2626;
          font-size: 20px;
          margin-bottom: 10px;
        }
        
        .thank-you p {
          color: #7f1d1d;
          font-size: 16px;
        }
        
        @media print {
          body { margin: 0; }
          .container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo and Organization Info -->
        <div class="header">
          <div class="logo-section">
            <div class="logo-icon"></div>
            <div class="org-name">AAFIYAA</div>
            <div class="org-name" style="font-size: 20px; color: #6b7280; font-weight: normal;">Charity Clinics</div>
            <div class="org-tagline">Healthcare & Compassion</div>
          </div>
          
          <h1 class="receipt-title">Official Donation Receipt</h1>
          <p class="receipt-subtitle">Tax Deductible Charitable Donation</p>
        </div>
        
        <!-- Receipt Information -->
        <div class="receipt-info">
          <div>
            <strong>Receipt Number:</strong><br>
            <span class="receipt-number">${receiptNumber}</span>
          </div>
          <div style="text-align: right;">
            <strong>Date Issued:</strong><br>
            <span class="receipt-date">${formatDate(currentDate)}</span>
          </div>
        </div>
        
        <!-- Donation Details -->
        <div class="donation-details">
          <h2 class="section-title">Donation Details</h2>
          
          <div class="amount-highlight">
            <div class="amount-label">Total Donation Amount</div>
            <div class="amount-value">${formatCurrency(donation.amount, donation.currency)}</div>
          </div>
          
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Donation Type</div>
              <div class="detail-value">${getDonationTypeLabel(donation.type)}</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">Frequency</div>
              <div class="detail-value">${getFrequencyLabel(donation.frequency)}</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">Payment Method</div>
              <div class="detail-value">${donation.paymentMethod || 'Online Payment'}</div>
            </div>
            
            <div class="detail-item">
              <div class="detail-label">Transaction Date</div>
              <div class="detail-value">${formatDate(new Date(donation.createdAt))}</div>
            </div>
            
            ${donation.name ? `
            <div class="detail-item">
              <div class="detail-label">Donor Name</div>
              <div class="detail-value">${donation.name}</div>
            </div>
            ` : ''}
            
            ${donation.email ? `
            <div class="detail-item">
              <div class="detail-label">Email Address</div>
              <div class="detail-value">${donation.email}</div>
            </div>
            ` : ''}
            
            ${caseTitle ? `
            <div class="detail-item" style="grid-column: 1 / -1;">
              <div class="detail-label">Supporting Case</div>
              <div class="detail-value">${caseTitle}</div>
            </div>
            ` : ''}
            
            ${donation.destinationProject ? `
            <div class="detail-item" style="grid-column: 1 / -1;">
              <div class="detail-label">Destination Project</div>
              <div class="detail-value">${donation.destinationProject}</div>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Tax Information -->
        <div class="tax-info">
          <h3 class="tax-title">Tax Deduction Information</h3>
          <p class="tax-text">
            This receipt confirms your charitable donation to Aafiyaa Charity Clinics. 
            Your contribution is tax-deductible to the extent allowed by law. Please consult 
            with your tax advisor regarding the deductibility of your charitable contributions. 
            Keep this receipt for your tax records.
          </p>
        </div>
        
        <!-- Thank You Message -->
        <div class="thank-you">
          <h3>Thank You for Your Generosity!</h3>
          <p>Your donation helps us provide essential healthcare services to communities in need around the world.</p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p><strong>Aafiyaa Charity Clinics</strong></p>
          <div class="contact-info">
            <p>Email: info@aafiyaa.com | Website: www.aafiyaa.com</p>
            <p>This is an official receipt for tax purposes. Please retain for your records.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF receipt
export async function generatePDFReceipt(receiptData: ReceiptData): Promise<string> {
  await ensureReceiptsDir();
  
  const filename = `receipt_${receiptData.receiptNumber}.pdf`;
  const filepath = path.join(receiptsDir, filename);
  
  let browser;
  try {
    // Launch browser with system Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set page size and margins
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Generate HTML content
    const htmlContent = generateReceiptHTML(receiptData);
    
    // Set HTML content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Generate PDF
    await page.pdf({
      path: filepath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });
    
    console.log(`PDF receipt generated successfully: ${filepath}`);
    return filepath;
    
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
    throw new Error(`Failed to generate PDF receipt: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Clean up old receipt files (optional - run periodically)
export async function cleanupOldReceipts(daysOld: number = 30): Promise<void> {
  try {
    const files = await fs.readdir(receiptsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(receiptsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old receipt: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old receipts:', error);
  }
}