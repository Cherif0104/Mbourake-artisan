/**
 * Générateur de Devis PDF avec jspdf
 * Crée un PDF professionnel téléchargeable pour les devis artisans
 */

import { jsPDF } from 'jspdf';

export interface QuoteData {
  quote_number: string;
  artisan_name: string;
  artisan_phone?: string;
  artisan_email?: string;
  project_title: string;
  client_name?: string;
  amount: number;
  labor_cost?: number;
  materials_cost?: number;
  urgent_surcharge_percent?: number;
  urgent_surcharge?: number;
  message?: string;
  estimated_duration?: string;
  proposed_date?: string;
  proposed_time_start?: string;
  proposed_time_end?: string;
  validity_hours?: number;
  created_at: string;
}

/**
 * Génère et télécharge un PDF de devis avec jspdf
 */
export function downloadQuotePDF(quote: QuoteData): void {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  const lineHeight = 7;
  
  // Couleurs (RGB)
  const primaryColor = [59, 130, 246]; // brand-500
  const textColor = [31, 41, 55]; // gray-900
  const secondaryColor = [107, 114, 128]; // gray-500
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${quote.quote_number}`, pageWidth - margin, 25, { align: 'right' });
  
  yPos = 50;
  doc.setTextColor(...textColor);
  
  // Informations Artisan et Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ARTISAN', margin, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += lineHeight;
  doc.setFontSize(11);
  doc.text(quote.artisan_name, margin, yPos);
  yPos += lineHeight;
  if (quote.artisan_phone) {
    doc.setFontSize(10);
    doc.text(`Tél: ${quote.artisan_phone}`, margin, yPos);
    yPos += lineHeight;
  }
  if (quote.artisan_email) {
    doc.text(`Email: ${quote.artisan_email}`, margin, yPos);
    yPos += lineHeight;
  }
  
  // Date à droite
  const dateText = new Date(quote.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'bold');
  doc.text('DATE', pageWidth - margin, 50, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(dateText, pageWidth - margin, 57, { align: 'right' });
  if (quote.validity_hours) {
    doc.text(`Validité: ${quote.validity_hours} heures`, pageWidth - margin, 64, { align: 'right' });
  }
  
  yPos = 80;
  
  // Titre projet (box avec fond)
  doc.setFillColor(239, 246, 255); // bg-blue-50
  doc.setDrawColor(...primaryColor);
  doc.rect(margin - 5, yPos - 10, pageWidth - 2 * margin + 10, 20, 'FD');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // text-blue-800
  doc.text(quote.project_title, margin, yPos);
  if (quote.client_name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text(`Client: ${quote.client_name}`, margin, yPos + 8);
  }
  
  yPos += 25;
  doc.setTextColor(...textColor);
  
  // Tableau détail des coûts
  const totalAmount = quote.amount || 0;
  const laborCost = quote.labor_cost || 0;
  const materialsCost = quote.materials_cost || 0;
  const baseAmount = laborCost + materialsCost;
  const urgentSurcharge = quote.urgent_surcharge || 
    (quote.urgent_surcharge_percent && baseAmount 
      ? baseAmount * (quote.urgent_surcharge_percent / 100) 
      : 0);
  
  const tableStartY = yPos;
  const col1X = margin;
  const col2X = pageWidth - margin - 60;
  
  // En-tête tableau
  doc.setFillColor(243, 244, 246); // bg-gray-100
  doc.rect(col1X - 5, tableStartY - 8, pageWidth - 2 * margin + 10, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('DESCRIPTION', col1X, tableStartY - 2);
  doc.text('MONTANT', col2X, tableStartY - 2, { align: 'right' });
  
  yPos = tableStartY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  
  // Lignes du tableau
  const rows: Array<{ desc: string; amount: number; isTotal?: boolean }> = [];
  
  if (laborCost > 0) {
    rows.push({ desc: "Main d'œuvre", amount: laborCost });
  }
  if (materialsCost > 0) {
    rows.push({ desc: 'Matériaux', amount: materialsCost });
  }
  if (baseAmount > 0 && laborCost === 0 && materialsCost === 0) {
    rows.push({ desc: 'Prestation', amount: baseAmount });
  }
  if (urgentSurcharge > 0) {
    rows.push({ 
      desc: `Majoration urgence (${quote.urgent_surcharge_percent || 0}%)`, 
      amount: urgentSurcharge 
    });
  }
  rows.push({ desc: 'TOTAL', amount: totalAmount, isTotal: true });
  
  rows.forEach((row, index) => {
    if (row.isTotal) {
      doc.setFillColor(239, 246, 255);
      doc.rect(col1X - 5, yPos - 6, pageWidth - 2 * margin + 10, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
    }
    
    doc.text(row.desc, col1X, yPos);
    doc.text(
      `${row.amount.toLocaleString('fr-FR')} FCFA`, 
      col2X + 60, 
      yPos, 
      { align: 'right' }
    );
    
    yPos += row.isTotal ? 12 : 8;
    
    // Ligne séparatrice
    if (!row.isTotal && index < rows.length - 1) {
      doc.setDrawColor(229, 231, 235);
      doc.line(col1X, yPos - 2, pageWidth - margin, yPos - 2);
      yPos += 3;
    }
  });
  
  yPos += 10;
  
  // Message/Description si présent
  if (quote.message) {
    doc.setFillColor(249, 250, 251);
    doc.rect(margin - 5, yPos - 5, pageWidth - 2 * margin + 10, 30, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('DESCRIPTION', margin, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    
    const messageLines = doc.splitTextToSize(quote.message, pageWidth - 2 * margin);
    doc.text(messageLines, margin, yPos);
    yPos += messageLines.length * lineHeight + 10;
  }
  
  // Détails supplémentaires (Durée, Date proposée)
  if (quote.estimated_duration || quote.proposed_date) {
    const detailsY = yPos;
    const detailWidth = (pageWidth - 2 * margin) / 2 - 5;
    
    if (quote.estimated_duration) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin - 5, detailsY - 5, detailWidth, 15, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text('DURÉE ESTIMÉE', margin, detailsY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(quote.estimated_duration, margin, detailsY + 8);
    }
    
    if (quote.proposed_date) {
      const dateText = new Date(quote.proposed_date).toLocaleDateString('fr-FR');
      const timeText = quote.proposed_time_start && quote.proposed_time_end
        ? ` de ${quote.proposed_time_start} à ${quote.proposed_time_end}`
        : '';
      
      doc.setFillColor(249, 250, 251);
      doc.rect(margin + detailWidth + 5, detailsY - 5, detailWidth, 15, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text('DATE PROPOSÉE', margin + detailWidth + 5, detailsY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(dateText + timeText, margin + detailWidth + 5, detailsY + 8);
    }
    
    yPos = detailsY + 20;
  }
  
  // Footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Ce devis est valable ${quote.validity_hours || 48} heures à compter de sa date d'émission.`,
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );
  doc.text(
    'Document généré par Mbourake - Plateforme de mise en relation artisans/clients',
    pageWidth / 2,
    footerY + 15,
    { align: 'center' }
  );
  
  // Télécharger le PDF
  doc.save(`Devis-${quote.quote_number}.pdf`);
}

/**
 * Fonction legacy pour compatibilité (génère toujours un PDF téléchargeable)
 */
export function generateQuotePDF(quote: QuoteData): void {
  downloadQuotePDF(quote);
}
