import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation, Product } from '../types';

/**
 * Utility to convert image URL to Base64 for PDF inclusion
 */
const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
    });
  } catch (e) {
    console.error("Failed to load image for PDF", e);
    return "";
  }
};

export const generateQuotationPDF = async (quotation: Quotation) => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('OBRA OFFICE FURNITURE', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Professional Office Solutions', 14, 26);
  doc.text('Phone: +63 915 743 9188', 14, 31);
  doc.text('Email: obrafurniture@gmail.com', 14, 36);

  // --- Quote Info ---
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('QUOTATION', 140, 20);
  
  doc.setFontSize(10);
  doc.text(`Ref No: ${quotation.number}`, 140, 28);
  doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`, 140, 33);
  doc.text(`Status: ${quotation.status.toUpperCase()}`, 140, 38);

  // --- Customer Details ---
  doc.setFontSize(12);
  doc.text('Bill To:', 14, 50);
  doc.setFontSize(10);
  doc.text(quotation.customer.name, 14, 56);
  doc.text(quotation.customer.company || '', 14, 61);
  doc.text(quotation.customer.address, 14, 66);
  doc.text(quotation.customer.phone, 14, 71);

  // --- Table with Images ---
  const tableColumn = ["", "Item", "Description", "Qty", "Unit Price", "Total"];
  const tableRows: any[] = [];

  // Pre-fetch images
  const itemImages = await Promise.all(
    quotation.items.map(item => item.images[0] ? getBase64FromUrl(item.images[0]) : Promise.resolve(""))
  );

  quotation.items.forEach((item, index) => {
    const itemData = [
      "", // Image placeholder
      item.code,
      item.name,
      item.quantity,
      `P ${item.sellingPrice.toLocaleString()}`,
      `P ${(item.sellingPrice * item.quantity).toLocaleString()}`
    ];
    tableRows.push(itemData);
  });

  // @ts-ignore
  autoTable(doc, {
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 26] },
    columnStyles: {
        0: { cellWidth: 20 },
        4: { halign: 'right' },
        5: { halign: 'right' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && itemImages[data.row.index]) {
        doc.addImage(itemImages[data.row.index], 'JPEG', data.cell.x + 2, data.cell.y + 2, 16, 16);
      }
    },
    minCellHeight: 20
  });

  // --- Totals ---
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.text('Subtotal:', 140, finalY);
  doc.text(`P ${quotation.subtotal.toLocaleString()}`, 190, finalY, { align: 'right' });

  if (quotation.discount > 0) {
    doc.text(`Discount:`, 140, finalY + 6);
    doc.text(`- P ${quotation.discount.toLocaleString()}`, 190, finalY + 6, { align: 'right' });
  }

  doc.text(`Delivery Fee:`, 140, finalY + 12);
  doc.text(`P ${quotation.deliveryFee.toLocaleString()}`, 190, finalY + 12, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', 140, finalY + 20);
  doc.text(`P ${quotation.grandTotal.toLocaleString()}`, 190, finalY + 20, { align: 'right' });

  if (quotation.paymentMethod) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${quotation.paymentMethod}`, 140, finalY + 28);
  }

  // --- Footer ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Notes:', 14, finalY + 35);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('1. Prices are valid for 30 days.', 14, finalY + 41);
  doc.text('2. 50% downpayment required for custom orders.', 14, finalY + 46);
  doc.text('3. Goods remain property of OBRA until paid in full.', 14, finalY + 51);

  doc.save(`Quotation_${quotation.number}.pdf`);
};

export const generateCatalogPDF = async (products: Product[]) => {
  const doc = new jsPDF();
  
  // Title Page
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 297, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(40);
  doc.text('OBRA', 105, 120, { align: 'center' });
  doc.setFontSize(16);
  doc.text('OFFICE FURNITURE SOLUTIONS', 105, 135, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Digital Catalog - ${new Date().getFullYear()}`, 105, 150, { align: 'center' });
  
  doc.addPage();
  doc.setTextColor(40);
  doc.setFontSize(22);
  doc.text('Product Inventory', 14, 20);

  const tableColumn = ["", "Details", "Category", "Investment"];
  const tableRows: any[] = [];

  // Group products by category
  const categories = Array.from(new Set(products.map(p => p.category)));
  
  // Pre-fetch all images for active products
  const activeProducts = products.filter(p => p.isActive);
  const itemImages = await Promise.all(
    activeProducts.map(p => p.images[0] ? getBase64FromUrl(p.images[0]) : Promise.resolve(""))
  );

  activeProducts.forEach((product, index) => {
    tableRows.push([
      "", // Image
      `${product.name}\nCode: ${product.code}\n${product.dimensions || ''}`,
      product.category,
      `P ${product.sellingPrice.toLocaleString()}`
    ]);
  });

  // @ts-ignore
  autoTable(doc, {
    startY: 30,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [194, 163, 115] }, // Accent color
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 80 },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && itemImages[data.row.index]) {
        doc.addImage(itemImages[data.row.index], 'JPEG', data.cell.x + 2, data.cell.y + 2, 26, 26);
      }
    },
    minCellHeight: 30
  });

  doc.save('OBRA_Digital_Catalog.pdf');
};
