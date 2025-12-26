import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '../types';

export const generateQuotationPDF = (quotation: Quotation) => {
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

  // --- Customer Details ---
  doc.setFontSize(12);
  doc.text('Bill To:', 14, 50);
  doc.setFontSize(10);
  doc.text(quotation.customer.name, 14, 56);
  doc.text(quotation.customer.company || '', 14, 61);
  doc.text(quotation.customer.address, 14, 66);
  doc.text(quotation.customer.phone, 14, 71);

  // --- Table ---
  const tableColumn = ["Item", "Description", "Qty", "Unit Price", "Total"];
  const tableRows: any[] = [];

  quotation.items.forEach(item => {
    const itemData = [
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
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' }
    }
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
