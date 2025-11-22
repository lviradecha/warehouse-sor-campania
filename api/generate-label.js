import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
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

  const sql = neon(process.env.DATABASE_URL);

  try {
    const { materiale_id } = req.body;

    if (!materiale_id) {
      return res.status(400).json({ error: 'ID materiale richiesto' });
    }

    // Recupera dati materiale
    const materiali = await sql`
      SELECT * FROM materiali WHERE id = ${materiale_id}
    `;

    if (materiali.length === 0) {
      return res.status(404).json({ error: 'Materiale non trovato' });
    }

    const materiale = materiali[0];

    // Genera HTML per etichetta con codice a barre
    const labelHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etichetta - ${materiale.nome}</title>
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
      border: 2px solid #d32f2f;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: white;
    }
    .header {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      color: #d32f2f;
      border-bottom: 2px solid #d32f2f;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    .logo {
      font-size: 16px;
      font-weight: bold;
      color: #d32f2f;
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
      color: #333;
    }
    .info-value {
      color: #000;
    }
    .barcode-container {
      text-align: center;
      margin-top: 5px;
      padding: 5px;
      background: #f5f5f5;
      border-radius: 4px;
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
      .label {
        border: 2px solid #d32f2f;
      }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="logo">CROCE ROSSA ITALIANA</div>
      <div style="font-size: 10px; margin-top: 2px;">Sala Operativa Regionale - Campania</div>
      <div style="font-size: 9px; margin-top: 2px;">Sistema Gestione Magazzino</div>
    </div>
    <div class="info">
      <div class="info-row">
        <span class="info-label">Codice:</span>
        <span class="info-value"><strong>${materiale.codice}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Materiale:</span>
        <span class="info-value">${materiale.nome}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Categoria:</span>
        <span class="info-value">${materiale.categoria}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Stato:</span>
        <span class="info-value" style="color: ${
          materiale.stato === 'disponibile' ? '#4caf50' : 
          materiale.stato === 'assegnato' ? '#ff9800' : 
          materiale.stato === 'manutenzione' ? '#2196f3' : '#f44336'
        }">
          <strong>${materiale.stato.toUpperCase()}</strong>
        </span>
      </div>
      ${materiale.data_acquisto ? `
      <div class="info-row">
        <span class="info-label">Acquisto:</span>
        <span class="info-value">${new Date(materiale.data_acquisto).toLocaleDateString('it-IT')}</span>
      </div>
      ` : ''}
    </div>
    <div class="barcode-container">
      <svg id="barcode"></svg>
    </div>
  </div>
  <script>
    JsBarcode("#barcode", "${materiale.codice}", {
      format: "CODE128",
      width: 2,
      height: 45,
      displayValue: true,
      fontSize: 12,
      margin: 3,
      background: "#f5f5f5",
      lineColor: "#000000"
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

    // Log attività (opzionale, dipende se hai un sistema di log)
    try {
      await sql`
        INSERT INTO activity_log (action, entity_type, entity_id, details) 
        VALUES ('print_label', 'materiale', ${materiale_id}, ${`Stampata etichetta per: ${materiale.nome}`})
      `;
    } catch (logError) {
      // Ignora errori di log se la tabella non esiste
      console.log('Log non salvato (activity_log potrebbe non esistere)');
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(labelHtml);

  } catch (error) {
    console.error('Errore generazione etichetta:', error);
    return res.status(500).json({ 
      error: 'Errore del server',
      details: error.message 
    });
  }
}
