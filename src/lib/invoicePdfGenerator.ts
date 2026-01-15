/**
 * Générateur de Factures PDF avec jspdf
 * Crée un PDF professionnel téléchargeable pour les factures
 */

import { jsPDF } from 'jspdf';

export interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  client_name?: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
  artisan_name?: string;
  artisan_address?: string;
  artisan_phone?: string;
  artisan_email?: string;
  project_title: string;
  project_number?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price: number;
    amount: number;
  }>;
  subtotal: number;
  tax_amount?: number;
  tax_percent?: number;
  total_amount: number;
  status: string;
  notes?: string;
}

/**
 * Génère et télécharge un PDF de facture avec jspdf
 */
export function downloadInvoicePDF(invoice: InvoiceData): void {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  const lineHeight = 7;
  
  // Couleurs
  const primaryColor = [59, 130, 246]; // brand-500
  const textColor = [31, 41, 55]; // gray-900
  const secondaryColor = [107, 114, 128]; // gray-500
  const successColor = [34, 197, 94]; // green-500
  
  // Header avec logo/couleur
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', margin, 20);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${invoice.invoice_number}`, pageWidth - margin, 20, { align: 'right' });
  
  // Date et statut
  const issueDateText = new Date(invoice.issue_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(9);
  doc.text(`Date d'émission: ${issueDateText}`, pageWidth - margin, 28, { align: 'right' });
  
  if (invoice.due_date) {
    const dueDateText = new Date(invoice.due_date).toLocaleDateString('fr-FR');
    doc.text(`Échéance: ${dueDateText}`, pageWidth - margin, 34, { align: 'right' });
  }
  
  yPos = 45;
  doc.setTextColor(...textColor);
  
  // Informations Artisan (émetteur)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉMETTEUR', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  yPos += lineHeight;
  if (invoice.artisan_name) {
    doc.text(invoice.artisan_name, margin, yPos);
    yPos += lineHeight;
  }
  if (invoice.artisan_address) {
    doc.text(invoice.artisan_address, margin, yPos);
    yPos += lineHeight * 1.5;
  }
  if (invoice.artisan_phone) {
    doc.text(`Tél: ${invoice.artisan_phone}`, margin, yPos);
    yPos += lineHeight;
  }
  if (invoice.artisan_email) {
    doc.text(`Email: ${invoice.artisan_email}`, margin, yPos);
  }
  
  // Informations Client (destinataire) à droite
  const clientX = pageWidth / 2 + 10;
  yPos = 45;
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', clientX, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += lineHeight;
  if (invoice.client_name) {
    doc.text(invoice.client_name, clientX, yPos);
    yPos += lineHeight;
  }
  if (invoice.client_address) {
    doc.text(invoice.client_address, clientX, yPos);
    yPos += lineHeight * 1.5;
  }
  if (invoice.client_phone) {
    doc.text(`Tél: ${invoice.client_phone}`, clientX, yPos);
    yPos += lineHeight;
  }
  if (invoice.client_email) {
    doc.text(`Email: ${invoice.client_email}`, clientX, yPos);
  }
  
  // Projet
  yPos = 95;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...primaryColor);
  doc.rect(margin - 5, yPos - 8, pageWidth - 2 * margin + 10, 15, 'FD');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(`Projet: ${invoice.project_title}`, margin, yPos);
  if (invoice.project_number) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text(`N° ${invoice.project_number}`, margin, yPos + 8);
  }
  
  yPos += 20;
  doc.setTextColor(...textColor);
  
  // Tableau des éléments
  const tableStartY = yPos;
  const col1X = margin;
  const col2X = col1X + 70;
  const col3X = col1X + 100;
  const col4X = col1X + 120;
  const col5X = pageWidth - margin;
  
  // En-tête tableau
  doc.setFillColor(243, 244, 246);
  doc.rect(col1X - 5, tableStartY - 8, pageWidth - 2 * margin + 10, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('DESCRIPTION', col1X, tableStartY - 2);
  doc.text('QTÉ', col2X, tableStartY - 2, { align: 'center' });
  doc.text('P.U.', col3X, tableStartY - 2, { align: 'right' });
  doc.text('MONTANT', col5X, tableStartY - 2, { align: 'right' });
  
  yPos = tableStartY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  
  // Si pas d'items, créer un item par défaut
  const items = invoice.items && invoice.items.length > 0 
    ? invoice.items 
    : [{
        description: invoice.project_title || 'Prestation',
        quantity: 1,
        unit_price: invoice.subtotal,
        amount: invoice.subtotal
      }];
  
  items.forEach((item) => {
    const descLines = doc.splitTextToSize(item.description || 'Prestation', col2X - col1X - 5);
    const itemHeight = Math.max(descLines.length * lineHeight, 8);
    
    doc.text(descLines, col1X, yPos);
    
    if (item.quantity) {
      doc.text(item.quantity.toString(), col2X, yPos, { align: 'center' });
    }
    if (item.unit_price) {
      doc.text(
        `${item.unit_price.toLocaleString('fr-FR')} FCFA`,
        col3X,
        yPos,
        { align: 'right' }
      );
    }
    doc.text(
      `${item.amount.toLocaleString('fr-FR')} FCFA`,
      col5X,
      yPos,
      { align: 'right' }
    );
    
    yPos += itemHeight + 3;
    
    // Ligne séparatrice
    doc.setDrawColor(229, 231, 235);
    doc.line(col1X, yPos - 2, pageWidth - margin, yPos - 2);
    yPos += 2;
  });
  
  yPos += 5;
  
  // Totaux
  const totalsX = pageWidth - margin - 60;
  
  // Sous-total
  doc.setFontSize(10);
  doc.text('Sous-total', totalsX, yPos, { align: 'right' });
  doc.text(
    `${invoice.subtotal.toLocaleString('fr-FR')} FCFA`,
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );
  yPos += 8;
  
  // TVA si présente
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    const taxLabel = invoice.tax_percent 
      ? `TVA (${invoice.tax_percent}%)`
      : 'TVA';
    doc.text(taxLabel, totalsX, yPos, { align: 'right' });
    doc.text(
      `${invoice.tax_amount.toLocaleString('fr-FR')} FCFA`,
      pageWidth - margin,
      yPos,
      { align: 'right' }
    );
    yPos += 8;
  }
  
  // Total (mise en évidence)
  doc.setFillColor(239, 246, 255);
  doc.rect(totalsX - 10, yPos - 8, 70, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL', totalsX, yPos, { align: 'right' });
  doc.text(
    `${invoice.total_amount.toLocaleString('fr-FR')} FCFA`,
    pageWidth - margin,
    yPos,
    { align: 'right' }
  );
  
  yPos += 20;
  doc.setTextColor(...textColor);
  
  // Notes si présentes
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    const noteLines = doc.splitTextToSize(`Note: ${invoice.notes}`, pageWidth - 2 * margin);
    doc.text(noteLines, margin, yPos);
    yPos += noteLines.length * lineHeight + 10;
  }
  
  // Statut
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (invoice.status === 'paid') {
    doc.setTextColor(...successColor);
    doc.text('✓ PAYÉE', margin, yPos);
  } else if (invoice.status === 'overdue') {
    doc.setTextColor(239, 68, 68); // red-500
    doc.text('EN RETARD', margin, yPos);
  } else {
    doc.setTextColor(251, 191, 36); // yellow-500
    doc.text('EN ATTENTE', margin, yPos);
  }
  
  // Footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    'Document généré par Mbourake - Plateforme de mise en relation artisans/clients',
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );
  doc.text(
    'Facture conforme aux normes en vigueur au Sénégal',
    pageWidth / 2,
    footerY + 15,
    { align: 'center' }
  );
  
  // Télécharger le PDF
  doc.save(`Facture-${invoice.invoice_number}.pdf`);
}
