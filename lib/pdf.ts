import jsPDF from 'jspdf';
import { Sale } from './types';

// Company Details
const COMPANY = {
  name: 'GOVI SEWANA',
  tagline: 'Agro Solution',
  address: 'Govi Sewana Agro Solutions',
  phone1: '076 821 6062',
  phone2: '071 055 6068',
  country: 'Sri Lanka',
};

function openPdfPreview(doc: jsPDF, fileName: string) {
  if (typeof window === 'undefined') {
    doc.save(fileName);
    return;
  }

  const blobUrl = doc.output('bloburl');
  const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  // Fallback if popup is blocked by the browser.
  if (!previewWindow) {
    doc.save(fileName);
  }
}

async function getLogoAsBase64(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const response = await fetch('/api/logo');
    const data = await response.json();
    if (data.url) {
      const img = await fetch(data.url);
      const blob = await img.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error('Failed to load logo:', error);
  }
  return null;
}

async function addHeaderWithBrandingAndLogo(doc: jsPDF, w: number, y: number, logoBase64?: string | null) {
  let currentY = y;
  
  // Add logo if available
  if (logoBase64) {
    try {
      const logoHeight = 12;
      const logoWidth = 15;
      const logoX = w / 2 - logoWidth / 2;
      doc.addImage(logoBase64, 'PNG', logoX, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 2;
    } catch (error) {
      console.error('Failed to add logo to PDF:', error);
    }
  }
  
  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 120, 60);
  doc.text(COMPANY.name, w / 2, currentY, { align: 'center' });
  currentY += 5;
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY.tagline, w / 2, currentY, { align: 'center' });
  currentY += 3;
  
  // Address
  doc.setFontSize(8);
  doc.text(COMPANY.address, w / 2, currentY, { align: 'center' });
  currentY += 3;
  
  // Phone numbers
  doc.setFontSize(7);
  doc.text(`Tel: ${COMPANY.phone1}`, w / 2, currentY, { align: 'center' });
  currentY += 2;
  doc.text(`${COMPANY.phone2}`, w / 2, currentY, { align: 'center' });
  currentY += 3;
  doc.text(COMPANY.country, w / 2, currentY, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  return currentY + 3;
}

function addHeaderWithBranding(doc: jsPDF, w: number, y: number) {
  // Company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 120, 60);
  doc.text(COMPANY.name, w / 2, y, { align: 'center' });
  y += 5;
  
  // Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY.tagline, w / 2, y, { align: 'center' });
  y += 3;
  
  // Address
  doc.setFontSize(8);
  doc.text(COMPANY.address, w / 2, y, { align: 'center' });
  y += 3;
  
  // Phone numbers
  doc.setFontSize(7);
  doc.text(`Tel: ${COMPANY.phone1} | ${COMPANY.phone2}`, w / 2, y, { align: 'center' });
  y += 3;
  doc.text(COMPANY.country, w / 2, y, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  return y + 3;
}

export async function generateReceipt(sale: Sale) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  const w = 80;
  let y = 10;

  // Try to load logo
  let logoBase64: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (error) {
    console.error('Failed to load logo for receipt:', error);
  }

  // Add logo if available
  if (logoBase64) {
    try {
      const logoHeight = 8;
      const logoWidth = 10;
      const logoX = w / 2 - logoWidth / 2;
      doc.addImage(logoBase64, 'PNG', logoX, y, logoWidth, logoHeight);
      y += logoHeight + 2;
    } catch (error) {
      console.error('Failed to add logo to receipt:', error);
    }
  }

  // Header with branding
  y = addHeaderWithBranding(doc, w, y);
  y += 4;

  // Divider
  doc.setLineWidth(0.3);
  doc.line(5, y, w - 5, y);
  y += 4;

  // Invoice info
  doc.setFontSize(8);
  doc.text(`Invoice: ${sale.invoiceNo}`, 5, y);
  y += 4;
  doc.text(`Date: ${new Date(sale.date).toLocaleDateString('en-LK')}`, 5, y);
  y += 4;
  doc.text(`Time: ${new Date(sale.date).toLocaleTimeString('en-LK')}`, 5, y);
  y += 4;
  if (sale.customerName) {
    doc.text(`Customer: ${sale.customerName}`, 5, y);
    y += 4;
  }
  doc.text(`Type: ${sale.saleType.toUpperCase()}`, 5, y);
  y += 4;
  doc.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 5, y);
  y += 5;

  // Divider
  doc.line(5, y, w - 5, y);
  y += 4;

  // Column headers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Item', 5, y);
  doc.text('Qty', 40, y, { align: 'center' });
  doc.text('Price', 55, y, { align: 'right' });
  doc.text('Total', w - 5, y, { align: 'right' });
  y += 4;
  doc.line(5, y, w - 5, y);
  y += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (const item of sale.items) {
    const name = item.productName.length > 18
      ? item.productName.substring(0, 18) + '..'
      : item.productName;
    doc.text(name, 5, y);
    doc.text(String(item.qty), 40, y, { align: 'center' });
    doc.text(item.unitPrice.toFixed(2), 55, y, { align: 'right' });
    doc.text(item.total.toFixed(2), w - 5, y, { align: 'right' });
    y += 4;
  }

  y += 2;
  doc.line(5, y, w - 5, y);
  y += 4;

  // Summary
  doc.setFontSize(8);
  doc.text('Subtotal:', 5, y);
  doc.text(`LKR ${sale.subtotal.toFixed(2)}`, w - 5, y, { align: 'right' });
  y += 4;

  if (sale.discount > 0) {
    doc.text('Discount:', 5, y);
    doc.text(`-LKR ${sale.discount.toFixed(2)}`, w - 5, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(`LKR ${sale.total.toFixed(2)}`, w - 5, y, { align: 'right' });
  y += 6;

  doc.line(5, y, w - 5, y);
  y += 5;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Thank you for your purchase!', w / 2, y, { align: 'center' });
  y += 4;
  doc.text('Govi Sewana Agro Solution', w / 2, y, { align: 'center' });

  openPdfPreview(doc, `receipt-${sale.invoiceNo}.pdf`);
}

export async function generateReport(data: {
  title: string;
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  salesCount: number;
  adminSales: number;
  adminProfit: number;
  adminPerformance: Array<{ name: string; salesCount: number; profit: number }>;
}) {
  const doc = new jsPDF();
  let y = 20;

  // Try to load logo
  let logoBase64: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (error) {
    console.error('Failed to load logo for report:', error);
  }

  // Add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, y, 20, 15);
      y += 18;
    } catch (error) {
      console.error('Failed to add logo to report:', error);
    }
  }

  const ensureSpace = (needed = 20) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  // Header with branding
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 120, 60);
  doc.text(COMPANY.name, 105, y, { align: 'center' });
  y += 7;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Agro Solution - Business Report', 105, y, { align: 'center' });
  y += 5;

  doc.setFontSize(9);
  doc.text(`Address: ${COMPANY.address}`, 105, y, { align: 'center' });
  y += 4;
  doc.text(`Tel: ${COMPANY.phone1} | ${COMPANY.phone2}`, 105, y, { align: 'center' });
  y += 6;

  // Period
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.title, 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${data.period}`, 105, y, { align: 'center' });
  y += 12;

  // Divider
  doc.setLineWidth(0.5);
  doc.setDrawColor(40, 120, 60);
  doc.line(20, y, 190, y);
  y += 10;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Summary', 20, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Revenue:', 20, y);
  doc.text(`LKR ${data.revenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
  y += 7;
  doc.text('Total Cost:', 20, y);
  doc.text(`LKR ${data.cost.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Net Profit:', 20, y);
  doc.text(`LKR ${data.profit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Total Sales:', 20, y);
  doc.text(String(data.salesCount), 190, y, { align: 'right' });
  y += 7;
  doc.text('Admin Sales:', 20, y);
  doc.text(String(data.adminSales), 190, y, { align: 'right' });
  y += 7;
  doc.text('Admin Profit:', 20, y);
  doc.text(`LKR ${data.adminProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

  if (data.adminPerformance.length > 0) {
    y += 10;
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Admin Sales and Profit', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Admin', 20, y);
    doc.text('Sales', 130, y, { align: 'right' });
    doc.text('Profit (LKR)', 190, y, { align: 'right' });
    y += 2;
    doc.line(20, y, 190, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    for (const admin of data.adminPerformance) {
      ensureSpace(8);
      doc.text(admin.name, 20, y);
      doc.text(String(admin.salesCount), 130, y, { align: 'right' });
      doc.text(admin.profit.toLocaleString('en-LK', { minimumFractionDigits: 2 }), 190, y, { align: 'right' });
      y += 6;
    }
  }

  y += 10;
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 8;

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-LK')} at ${new Date().toLocaleTimeString('en-LK')}`, 105, y, { align: 'center' });
  y += 5;
  doc.text('Govi Sewana Agro Solution - Confidential', 105, y, { align: 'center' });

  openPdfPreview(doc, `report-${data.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export async function generateQuotation(quotation: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // Try to load logo
  let logoBase64: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    }
  } catch (error) {
    console.error('Failed to load logo for quotation:', error);
  }

  // Add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 10, y, 20, 15);
      y += 18;
    } catch (error) {
      console.error('Failed to add logo to quotation:', error);
    }
  }

  // Header with branding
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 120, 60);
  doc.text(COMPANY.name, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY.tagline, pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFontSize(9);
  doc.text(COMPANY.address, pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text(`Tel: ${COMPANY.phone1}`, pageWidth / 2, y, { align: 'center' });
  y += 2;
  doc.text(`${COMPANY.phone2}`, pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text(COMPANY.country, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Divider
  doc.setDrawColor(40, 120, 60);
  doc.setLineWidth(1);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Left column - Company/Doc info, Right column - Customer info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  doc.text('QUOTATION', 15, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  y += 6;
  
  doc.text(`Quotation #: ${quotation.quotationNo}`, 15, y);
  y += 5;
  doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-LK')}`, 15, y);
  y += 5;
  doc.text(`Valid Until: ${quotation.validUntil}`, 15, y);
  y += 5;

  // Customer info (right side)
  const rightX = pageWidth / 2 + 10;
  y = 28;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', rightX, y);
  y += 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customerName || 'Customer Name', rightX, y);
  y += 4;
  if (quotation.customerPhone) {
    doc.text(`Phone: ${quotation.customerPhone}`, rightX, y);
    y += 4;
  }
  if (quotation.customerEmail) {
    doc.text(`Email: ${quotation.customerEmail}`, rightX, y);
    y += 4;
  }
  if (quotation.customerAddress) {
    doc.text(`Address: ${quotation.customerAddress}`, rightX, y);
    y += 4;
  }

  // Items table
  y = 60;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 120, 60);
  
  // Table header
  doc.text('Item Description', 15, y);
  doc.text('Qty', 95, y);
  doc.text('Unit', 115, y);
  doc.text('Unit Price', 140, y, { align: 'right' });
  doc.text('Total', pageWidth - 15, y, { align: 'right' });
  
  y += 5;
  doc.setLineWidth(0.5);
  doc.setDrawColor(40, 120, 60);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  let totalAmount = 0;
  for (const item of quotation.items) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(item.productName, 15, y);
    doc.text(String(item.qty), 95, y);
    doc.text(item.unit || 'kg', 115, y);
    doc.text(`LKR ${item.unitPrice.toFixed(2)}`, 140, y, { align: 'right' });
    doc.text(`LKR ${item.total.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
    
    totalAmount += item.total;
    y += 6;
  }

  y += 4;
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // Summary
  const summaryX = pageWidth - 60;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', summaryX, y, { align: 'right' });
  doc.text(`LKR ${quotation.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
  y += 6;

  if (quotation.discount > 0) {
    doc.text('Discount:', summaryX, y, { align: 'right' });
    doc.text(`-LKR ${quotation.discount.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 120, 60);
  doc.text('TOTAL:', summaryX, y, { align: 'right' });
  doc.text(`LKR ${quotation.total.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });

  // Notes
  if (quotation.notes) {
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 15, y);
    
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(quotation.notes, pageWidth - 30);
    doc.text(noteLines, 15, y);
  }

  // Footer
  y = pageHeight - 20;
  doc.setLineWidth(0.5);
  doc.setDrawColor(40, 120, 60);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for considering us!', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-LK')}`, pageWidth / 2, y, { align: 'center' });

  openPdfPreview(doc, `quotation-${quotation.quotationNo}.pdf`);
}
