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
  const logoBase64 = await getLogoBase64();
  
  // Format payment method display
  const paymentMethodDisplay = donation.paymentMethod ? 
    `${donation.paymentMethod.toUpperCase()} - ${donation.stripePaymentId ? donation.stripePaymentId.slice(-4) : '****'}` :
    'CARD - ****';
  
  // Format dates
  const donationDate = new Date(donation.createdAt).toLocaleDateString('en-AU', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const issueDate = currentDate.toLocaleDateString('en-AU', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
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
          line-height: 1.4;
          color: #1f2937;
          background: white;
          margin: 0;
          padding: 40px;
          font-size: 12px;
        }
        
        .receipt-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        
        .company-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .company-logo {
          width: 120px;
          height: 120px;
          margin-bottom: 12px;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .receipt-title {
          text-align: right;
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        
        .receipt-details {
          text-align: right;
          color: #6b7280;
        }
        
        .receipt-details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          min-width: 250px;
        }
        
        .receipt-details-label {
          font-weight: 500;
          color: #374151;
        }
        
        .bill-to-section {
          margin: 40px 0;
        }
        
        .bill-to-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .bill-to-info {
          color: #6b7280;
          line-height: 1.6;
        }
        
        .donation-table {
          width: 100%;
          border-collapse: collapse;
          margin: 40px 0;
        }
        
        .donation-table th {
          text-align: left;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          font-weight: 600;
          color: #374151;
          font-size: 12px;
        }
        
        .donation-table td {
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
          color: #6b7280;
          vertical-align: top;
        }
        
        .donation-description {
          max-width: 400px;
        }
        
        .amount-cell {
          text-align: right;
          font-weight: 500;
          color: #1f2937;
        }
        
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin: 30px 0;
        }
        
        .totals-table {
          min-width: 300px;
        }
        
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .totals-row.total {
          border-bottom: 2px solid #1f2937;
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .totals-label {
          color: #6b7280;
        }
        
        .totals-amount {
          text-align: right;
          font-weight: 500;
          color: #1f2937;
        }
        
        .footer-note {
          background: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 40px 0 30px 0;
          color: #6b7280;
          font-size: 11px;
          line-height: 1.6;
        }
        
        .footer-info {
          color: #9ca3af;
          font-size: 10px;
          line-height: 1.6;
          margin-top: 30px;
          border-top: 1px solid #f3f4f6;
          padding-top: 20px;
        }
        
        .footer-contact {
          text-align: center;
          margin: 20px 0;
          color: #6b7280;
          font-size: 11px;
        }
        
        @media print {
          body { 
            margin: 0;
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Header with company info and receipt title -->
        <div class="header">
          <div class="company-info">
            <div class="logo-section">
              ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Aafiyaa Logo" class="company-logo" />` : ''}
              <div class="company-name">Aafiyaa LTD</div>
            </div>
          </div>
          
          <div style="text-align: right;">
            <div class="receipt-title">Donation Receipt</div>
            <div class="receipt-details">
              <div class="receipt-details-row">
                <span class="receipt-details-label">Receipt Number</span>
                <span>${receiptNumber}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Receipt Date</span>
                <span>${issueDate}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Donation Date</span>
                <span>${donationDate}</span>
              </div>
              <div class="receipt-details-row">
                <span class="receipt-details-label">Aafiyaa ABN</span>
                <span>47684746987</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bill to section -->
        ${donation.name || donation.email ? `
        <div class="bill-to-section">
          <div class="bill-to-title">Donation from:</div>
          <div class="bill-to-info">
            ${donation.name || 'Anonymous Donor'}<br>
            ${donation.email || ''}
          </div>
        </div>
        ` : ''}
        
        <!-- Donation details table -->
        <table class="donation-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="donation-description">
                <strong>[${getDonationTypeLabel(donation.type)}] Donation to Aafiyaa LTD</strong><br>
                <span style="color: #9ca3af; font-size: 11px;">
                  Payment Method: ${paymentMethodDisplay}<br>
                  ${donation.frequency !== 'one-off' ? `Frequency: ${getFrequencyLabel(donation.frequency)}<br>` : ''}
                  Transaction ID: ${donation.stripePaymentId || 'N/A'}
                </span>
              </td>
              <td class="amount-cell">${formatCurrency(donation.amount, donation.currency)}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Totals section -->
        <div class="totals-section">
          <div class="totals-table">
            <div class="totals-row">
              <span class="totals-label">Subtotal</span>
              <span class="totals-amount">${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
            <div class="totals-row total">
              <span>Total Amount Donated</span>
              <span>${formatCurrency(donation.amount, donation.currency)}</span>
            </div>
          </div>
        </div>
        
        <!-- Footer note -->
        <div class="footer-note">
          <strong>This donation is tax-deductible.</strong> Please retain this receipt for your tax records. 
          Your contribution helps us provide essential healthcare services to communities in need.
        </div>
        
        <!-- Contact information -->
        <div class="footer-contact">
          Questions? We're here to help. Contact us at <strong>info@aafiyaa.com</strong> or visit <strong>aafiyaa.org</strong>
        </div>
        
        <!-- Footer info -->
        <div class="footer-info">
          Aafiyaa LTD is registered in New South Wales, Australia, ABN 47684746987. 
          Registered Office: 122 Westminster Street, Tallawong, NSW 2762, Australia.<br><br>
          
          This is an official donation receipt generated by the Aafiyaa Donation Platform. 
          Aafiyaa partners with Stripe to provide secure payment processing.
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
    // Launch browser with appropriate configuration for environment
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=site-per-process'
      ]
    };

    // Only set executablePath if we're in development and the path exists
    if (process.env.NODE_ENV === 'development') {
      try {
        const { execSync } = await import('child_process');
        // Try to find chromium/chrome executable
        const chromiumPath = execSync('which chromium-browser || which google-chrome || which chromium', 
          { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (chromiumPath) {
          launchOptions.executablePath = chromiumPath;
        }
      } catch (error) {
        // If we can't find a browser, let Puppeteer handle it with bundled Chromium
        console.log('Using bundled Chromium for PDF generation');
      }
    }
    
    browser = await puppeteer.launch(launchOptions);
    
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
    
  } catch (error: any) {
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