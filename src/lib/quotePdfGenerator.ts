/**
 * Générateur de Devis PDF
 * Crée un PDF professionnel pour les devis artisans
 */

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
 * Génère un PDF de devis (version simple avec window.print)
 * Pour une version plus avancée, installer jspdf: npm install jspdf
 */
export function generateQuotePDF(quote: QuoteData): void {
  // Créer une fenêtre avec le contenu HTML formaté
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les popups pour générer le PDF');
    return;
  }

  const totalAmount = quote.amount || 0;
  const laborCost = quote.labor_cost || 0;
  const materialsCost = quote.materials_cost || 0;
  const baseAmount = laborCost + materialsCost;
  const urgentSurcharge = quote.urgent_surcharge || 
    (quote.urgent_surcharge_percent && baseAmount 
      ? baseAmount * (quote.urgent_surcharge_percent / 100) 
      : 0);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Devis ${quote.quote_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      color: #1f2937;
      background: white;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #3b82f6;
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header .quote-number {
      color: #6b7280;
      font-size: 14px;
      font-weight: bold;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box h3 {
      color: #3b82f6;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .info-box p {
      font-size: 14px;
      color: #374151;
      margin: 4px 0;
    }
    .project-title {
      background: #eff6ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #3b82f6;
    }
    .project-title h2 {
      color: #1e40af;
      font-size: 18px;
      font-weight: bold;
    }
    .breakdown {
      margin: 30px 0;
    }
    .breakdown table {
      width: 100%;
      border-collapse: collapse;
    }
    .breakdown th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb;
    }
    .breakdown td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    .breakdown .amount {
      text-align: right;
      font-weight: bold;
    }
    .total-row {
      background: #eff6ff;
      font-weight: bold;
      font-size: 16px;
    }
    .total-row td {
      padding: 15px 12px;
      color: #1e40af;
    }
    .message-section {
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .message-section h3 {
      color: #3b82f6;
      font-size: 14px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .message-section p {
      color: #374151;
      line-height: 1.6;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .detail-item {
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .detail-item label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .detail-item span {
      display: block;
      font-size: 14px;
      color: #1f2937;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEVIS</h1>
    <div class="quote-number">N° ${quote.quote_number}</div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Artisan</h3>
      <p><strong>${quote.artisan_name}</strong></p>
      ${quote.artisan_phone ? `<p>Tél: ${quote.artisan_phone}</p>` : ''}
      ${quote.artisan_email ? `<p>Email: ${quote.artisan_email}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Date</h3>
      <p>${new Date(quote.created_at).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}</p>
      ${quote.validity_hours ? `<p>Validité: ${quote.validity_hours} heures</p>` : ''}
    </div>
  </div>

  <div class="project-title">
    <h2>${quote.project_title}</h2>
    ${quote.client_name ? `<p style="margin-top: 5px; color: #6b7280;">Client: ${quote.client_name}</p>` : ''}
  </div>

  <div class="breakdown">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${laborCost > 0 ? `
        <tr>
          <td>Main d'œuvre</td>
          <td class="amount">${laborCost.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        ` : ''}
        ${materialsCost > 0 ? `
        <tr>
          <td>Matériaux</td>
          <td class="amount">${materialsCost.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        ` : ''}
        ${baseAmount > 0 && (laborCost === 0 && materialsCost === 0) ? `
        <tr>
          <td>Prestation</td>
          <td class="amount">${baseAmount.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        ` : ''}
        ${urgentSurcharge > 0 ? `
        <tr>
          <td>Majoration urgence (${quote.urgent_surcharge_percent || 0}%)</td>
          <td class="amount">+${urgentSurcharge.toLocaleString('fr-FR')} FCFA</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td><strong>TOTAL</strong></td>
          <td class="amount"><strong>${totalAmount.toLocaleString('fr-FR')} FCFA</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  ${quote.message ? `
  <div class="message-section">
    <h3>Description</h3>
    <p>${quote.message.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="details-grid">
    ${quote.estimated_duration ? `
    <div class="detail-item">
      <label>Durée estimée</label>
      <span>${quote.estimated_duration}</span>
    </div>
    ` : ''}
    ${quote.proposed_date ? `
    <div class="detail-item">
      <label>Date proposée</label>
      <span>${new Date(quote.proposed_date).toLocaleDateString('fr-FR')} 
      ${quote.proposed_time_start && quote.proposed_time_end 
        ? `de ${quote.proposed_time_start} à ${quote.proposed_time_end}` 
        : ''}</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Ce devis est valable ${quote.validity_hours || 48} heures à compter de sa date d'émission.</p>
    <p style="margin-top: 10px;">Document généré par Mbourake - Plateforme de mise en relation artisans/clients</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Alternative: Télécharger le PDF (nécessite jspdf)
 * Pour utiliser cette fonction, installer: npm install jspdf
 */
export async function downloadQuotePDF(quote: QuoteData): Promise<void> {
  // Cette fonction nécessiterait jspdf
  // Pour l'instant, on utilise la version print
  generateQuotePDF(quote);
}
