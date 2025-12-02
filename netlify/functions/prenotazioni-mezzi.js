const { Client } = require('pg');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

async function getClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = await getClient();

  try {
    const path = event.path.replace('/.netlify/functions/prenotazioni-mezzi', '');
    const method = event.httpMethod;

    // GET - Lista prenotazioni con filtri
    if (method === 'GET' && !path) {
      const { data_inizio, data_fine, stato, veicolo_id } = event.queryStringParameters || {};
      
      let query = `
        SELECT pv.*, v.targa, v.tipo, v.modello,
               u.username as creato_da_username
        FROM prenotazioni_mezzi pv
        JOIN vehicles v ON pv.veicolo_id = v.id
        LEFT JOIN users u ON pv.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (data_inizio) {
        query += ` AND pv.data_fine >= $${paramCount}`;
        params.push(data_inizio);
        paramCount++;
      }
      if (data_fine) {
        query += ` AND pv.data_inizio <= $${paramCount}`;
        params.push(data_fine);
        paramCount++;
      }
      if (stato) {
        query += ` AND pv.stato = $${paramCount}`;
        params.push(stato);
        paramCount++;
      }
      if (veicolo_id) {
        query += ` AND pv.veicolo_id = $${paramCount}`;
        params.push(veicolo_id);
        paramCount++;
      }

      query += ' ORDER BY pv.data_inizio ASC';

      const result = await client.query(query, params);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // GET - Singola prenotazione
    if (method === 'GET' && path.match(/^\/\d+$/)) {
      const id = path.substring(1);
      const result = await client.query(`
        SELECT pv.*, v.targa, v.tipo, v.modello,
               u.username as creato_da_username
        FROM prenotazioni_mezzi pv
        JOIN vehicles v ON pv.veicolo_id = v.id
        LEFT JOIN users u ON pv.created_by = u.id
        WHERE pv.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Prenotazione non trovata' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // GET - Verifica disponibilità veicolo
    if (method === 'GET' && path === '/check-disponibilita') {
      const { veicolo_id, data_inizio, data_fine, exclude_id } = event.queryStringParameters;

      // Verifica che il veicolo esista e sia disponibile
      const vehicleResult = await client.query(
        'SELECT id, targa, stato FROM vehicles WHERE id = $1',
        [veicolo_id]
      );

      if (vehicleResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Veicolo non trovato' })
        };
      }

      const vehicle = vehicleResult.rows[0];

      // Verifica prenotazioni sovrapposte
      let conflictQuery = `
        SELECT COUNT(*) as conflitti
        FROM prenotazioni_mezzi
        WHERE veicolo_id = $1
        AND stato IN ('prenotata', 'confermata', 'in_corso')
        AND NOT (data_fine <= $2 OR data_inizio >= $3)
      `;
      const conflictParams = [veicolo_id, data_inizio, data_fine];

      if (exclude_id) {
        conflictQuery += ' AND id != $4';
        conflictParams.push(exclude_id);
      }

      const conflictResult = await client.query(conflictQuery, conflictParams);
      const hasConflicts = parseInt(conflictResult.rows[0].conflitti) > 0;

      // Verifica manutenzioni programmate nel periodo
      const maintenanceResult = await client.query(`
        SELECT COUNT(*) as manutenzioni
        FROM maintenance_schedules
        WHERE vehicle_id = $1
        AND stato IN ('programmata', 'in_corso')
        AND NOT (data_fine <= $2 OR data_inizio >= $3)
      `, [veicolo_id, data_inizio, data_fine]);

      const hasMaintenance = parseInt(maintenanceResult.rows[0].manutenzioni) > 0;

      const disponibile = !hasConflicts && !hasMaintenance && vehicle.stato === 'disponibile';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          disponibile: disponibile,
          motivo: !disponibile ? (
            hasConflicts ? 'Veicolo già prenotato nel periodo' :
            hasMaintenance ? 'Manutenzione programmata nel periodo' :
            vehicle.stato !== 'disponibile' ? `Veicolo ${vehicle.stato}` :
            'Non disponibile'
          ) : null,
          veicolo: vehicle
        })
      };
    }

    // GET - Lista veicoli disponibili per periodo
    if (method === 'GET' && path === '/veicoli-disponibili') {
      const { data_inizio, data_fine, tipo } = event.queryStringParameters || {};

      let query = `
        SELECT v.*
        FROM vehicles v
        WHERE v.stato = 'disponibile'
        AND v.id NOT IN (
          SELECT veicolo_id 
          FROM prenotazioni_mezzi 
          WHERE stato IN ('prenotata', 'confermata', 'in_corso')
          AND NOT (data_fine <= $1 OR data_inizio >= $2)
        )
      `;
      const params = [data_inizio, data_fine];
      let paramCount = 3;

      if (tipo) {
        query += ` AND v.tipo = $${paramCount}`;
        params.push(tipo);
        paramCount++;
      }

      query += ' ORDER BY v.targa';

      const result = await client.query(query, params);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // POST - Crea nuova prenotazione
    if (method === 'POST') {
      const data = JSON.parse(event.body);
      const { veicolo_id, data_inizio, data_fine, missione, conducente, destinazione, note, created_by } = data;

      // Verifica disponibilità
      const conflictResult = await client.query(`
        SELECT COUNT(*) as conflitti
        FROM prenotazioni_mezzi
        WHERE veicolo_id = $1
        AND stato IN ('prenotata', 'confermata', 'in_corso')
        AND NOT (data_fine <= $2 OR data_inizio >= $3)
      `, [veicolo_id, data_inizio, data_fine]);

      if (parseInt(conflictResult.rows[0].conflitti) > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Veicolo già prenotato per il periodo selezionato'
          })
        };
      }

      const result = await client.query(`
        INSERT INTO prenotazioni_mezzi 
        (veicolo_id, data_inizio, data_fine, missione, conducente, destinazione, note, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [veicolo_id, data_inizio, data_fine, missione, conducente, destinazione, note, created_by]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // PUT - Aggiorna prenotazione
    if (method === 'PUT' && path.match(/^\/\d+$/)) {
      const id = path.substring(1);
      const data = JSON.parse(event.body);
      const { data_inizio, data_fine, missione, conducente, destinazione, note, stato } = data;

      const result = await client.query(`
        UPDATE prenotazioni_mezzi
        SET data_inizio = COALESCE($1, data_inizio),
            data_fine = COALESCE($2, data_fine),
            missione = COALESCE($3, missione),
            conducente = COALESCE($4, conducente),
            destinazione = COALESCE($5, destinazione),
            note = COALESCE($6, note),
            stato = COALESCE($7, stato),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `, [data_inizio, data_fine, missione, conducente, destinazione, note, stato, id]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Prenotazione non trovata' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // DELETE - Elimina prenotazione
    if (method === 'DELETE' && path.match(/^\/\d+$/)) {
      const id = path.substring(1);
      
      const result = await client.query(
        'DELETE FROM prenotazioni_mezzi WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Prenotazione non trovata' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Prenotazione eliminata', id })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint non trovato' })
    };

  } catch (error) {
    console.error('Errore:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await client.end();
  }
};
