import { query } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { material_id } = req.body;

    if (!material_id) {
      return res.status(400).json({ error: 'ID materiale richiesto' });
    }

    // Recupera dati materiale
    const materials = await query(
      'SELECT * FROM materials WHERE id = $1',
      [material_id]
    );

    if (materials.length === 0) {
      return res.status(404).json({ error: 'Materiale non trovato' });
    }

    const material = materials[0];

    // Genera HTML per etichetta con codice a barre
    const labelHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etichetta - ${material.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page {
      size: 10cm 5cm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .label {
      width: 10cm;
      height: 5cm;
      padding: 0.5cm;
      box-sizing: border-box;
      border: 2px solid #000;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .info-row {
      margin: 2px 0;
      font-size: 11px;
    }
    .info-label {
      font-weight: bold;
      display: inline-block;
      width: 80px;
    }
    .barcode-container {
      text-align: center;
      margin-top: 5px;
    }
    .barcode {
      max-width: 100%;
      height: auto;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">MAGAZZINO SOR CAMPANIA</div>
    <div class="info">
      <div class="info-row">
        <span class="info-label">Materiale:</span>
        <span>${material.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Categoria:</span>
        <span>${material.category}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Stato:</span>
        <span>${material.status}</span>
      </div>
      ${material.purchase_date ? `
      <div class="info-row">
        <span class="info-label">Acquisto:</span>
        <span>${new Date(material.purchase_date).toLocaleDateString('it-IT')}</span>
      </div>
      ` : ''}
    </div>
    <div class="barcode-container">
      <svg id="barcode"></svg>
    </div>
  </div>
  <script>
    JsBarcode("#barcode", "${material.barcode}", {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 12,
      margin: 5
    });
    // Auto-print dopo caricamento
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `;

    // Log attività
    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'print_label', 'material', material_id, `Stampata etichetta per: ${material.name}`]
    );

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(labelHtml);

  } catch (error) {
    console.error('Errore generazione etichetta:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
