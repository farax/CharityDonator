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
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AAFY-${timestamp}${randomNum}`;
}

// Format currency amount
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD'
  }).format(amount);
}

// Load logo as base64
async function getLogoBase64(): Promise<string> {
  try {
    const logoPath = path.join(process.cwd(), 'server', 'assets', 'aafiyaa-logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    return logoBuffer.toString('base64');
  } catch (error) {
    console.error('Error loading logo:', error);
    return '';
  }
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
async function generateReceiptHTML(data: ReceiptData): Promise<string> {
  const { donation, receiptNumber } = data;
  const currentDate = new Date();
  
  // Format payment method display
  const paymentMethodDisplay = donation.paymentMethod ? 
    `${donation.paymentMethod.toUpperCase()} - ${donation.stripePaymentId ? donation.stripePaymentId.slice(-4) : '****'}` :
    'CARD - ****';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Receipt - ${receiptNumber}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #374151;
          background: #f9fafb;
          margin: 0;
          padding: 40px 20px;
        }
        
        .receipt-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%);
          padding: 40px 40px 20px 40px;
          color: white;
          position: relative;
        }
        
        .header::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          right: 0;
          height: 20px;
          background: white;
          transform: skewY(-1deg);
          transform-origin: left;
        }
        
        .logo-circle {
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
          font-size: 28px;
          font-weight: bold;
          color: #14b8a6;
        }
        
        .header-title {
          text-align: center;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .receipt-number {
          text-align: center;
          font-size: 16px;
          opacity: 0.9;
        }
        
        .content {
          padding: 40px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        
        .info-item {
          text-align: left;
        }
        
        .info-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .info-value {
          font-size: 16px;
          color: #111827;
          font-weight: 600;
        }
        
        .summary-section {
          margin-bottom: 30px;
        }
        
        .summary-title {
          font-size: 18px;
          color: #111827;
          font-weight: 600;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-line:last-child {
          border-bottom: 2px solid #14b8a6;
          font-weight: 600;
          color: #111827;
        }
        
        .summary-description {
          font-size: 16px;
        }
        
        .summary-amount {
          font-size: 16px;
          font-weight: 600;
        }
        
        .tax-notice {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 20px;
          margin: 30px 0;
        }
        
        .tax-notice p {
          margin: 0;
          font-size: 14px;
          color: #0369a1;
          line-height: 1.6;
        }
        
        .contact-section {
          text-align: center;
          padding: 20px 0;
          border-top: 1px solid #e5e7eb;
          margin-top: 30px;
          font-size: 14px;
          color: #6b7280;
        }
        
        .contact-section p {
          margin: 5px 0;
        }
        
        .footer {
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 30px;
          line-height: 1.6;
        }
        
        .footer p {
          margin: 10px 0;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .receipt-container {
            box-shadow: none;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="logo-circle">A</div>
          <h1 class="header-title">Donation Receipt from Aafiyaa LTD</h1>
          <p class="receipt-number">Receipt #${receiptNumber}</p>
        </div>
        
        <div class="content">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Amount Donated</div>
              <div class="info-value">${formatCurrency(donation.amount, donation.currency)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date Donated</div>
              <div class="info-value">${new Date(donation.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Payment Method</div>
              <div class="info-value">${paymentMethodDisplay}</div>
            </div>
          </div>
          
          <div class="summary-section">
            <h2 class="summary-title">Summary</h2>
            <div class="summary-line">
              <span class="summary-description">[${getDonationTypeLabel(donation.type)}] Donation to Aafiyaa LTD</span>
              <span class="summary-amount">${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
            <div class="summary-line">
              <span class="summary-description">Total Amount Donated</span>
              <span class="summary-amount">${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
          </div>
          
          <div class="tax-notice">
            <p>This donation is tax-deductible. Please retain this receipt for your tax records.</p>
          </div>
          
          <div class="contact-section">
            <p>If you have any questions, contact us at <strong>info@aafiyaa.com</strong> or visit <strong>aafiyaa.org</strong></p>
          </div>
          
          <div class="footer">
            <p>Something wrong with this email? View it in your browser.</p>
            <p>You're receiving this email because you made a donation to Aafiyaa LTD. Aafiyaa partners with Stripe to provide secure payment processing.</p>
            <p><strong>Aafiyaa LTD, ABN: 47684746987</strong></p>
            <p>Application Name: Aafiyaa Donation Platform<br>
            Transaction ID: ${donation.stripePaymentId || 'N/A'}</p>
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
    const htmlContent = await generateReceiptHTML(receiptData);
    
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