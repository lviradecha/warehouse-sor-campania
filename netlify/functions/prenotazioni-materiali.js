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
    const path = event.path.replace('/.netlify/functions/prenotazioni-materiali', '');
    const method = event.httpMethod;

    // GET - Lista prenotazioni con filtri
    if (method === 'GET' && !path) {
      const { data_inizio, data_fine, stato, materiale_id } = event.queryStringParameters || {};
      
      let query = `
        SELECT pm.*, m.nome as materiale_nome, m.codice_barre as materiale_codice,
               u.username as creato_da_username
        FROM prenotazioni_materiali pm
        JOIN materials m ON pm.materiale_id = m.id
        LEFT JOIN users u ON pm.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (data_inizio) {
        query += ` AND pm.data_fine >= $${paramCount}`;
        params.push(data_inizio);
        paramCount++;
      }
      if (data_fine) {
        query += ` AND pm.data_inizio <= $${paramCount}`;
        params.push(data_fine);
        paramCount++;
      }
      if (stato) {
        query += ` AND pm.stato = $${paramCount}`;
        params.push(stato);
        paramCount++;
      }
      if (materiale_id) {
        query += ` AND pm.materiale_id = $${paramCount}`;
        params.push(materiale_id);
        paramCount++;
      }

      query += ' ORDER BY pm.data_inizio ASC';

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
        SELECT pm.*, m.nome as materiale_nome, m.codice_barre as materiale_codice,
               u.username as creato_da_username
        FROM prenotazioni_materiali pm
        JOIN materials m ON pm.materiale_id = m.id
        LEFT JOIN users u ON pm.created_by = u.id
        WHERE pm.id = $1
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

    // GET - Verifica disponibilità
    if (method === 'GET' && path === '/check-disponibilita') {
      const { materiale_id, data_inizio, data_fine, quantita, exclude_id } = event.queryStringParameters;

      // Verifica quantità totale materiale
      const materialResult = await client.query(
        'SELECT quantita as quantity, quantita_assegnata as assigned FROM materials WHERE id = $1',
        [materiale_id]
      );

      if (materialResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Materiale non trovato' })
        };
      }

      const { quantity, assigned } = materialResult.rows[0];
      const disponibileOra = quantity - assigned;

      // Calcola quantità prenotata nel periodo
      let prenotateQuery = `
        SELECT COALESCE(SUM(quantita), 0) as totale_prenotato
        FROM prenotazioni_materiali
        WHERE materiale_id = $1
        AND stato IN ('prenotata', 'confermata')
        AND NOT (data_fine < $2 OR data_inizio > $3)
      `;
      const prenotateParams = [materiale_id, data_inizio, data_fine];

      if (exclude_id) {
        prenotateQuery += ' AND id != $4';
        prenotateParams.push(exclude_id);
      }

      const prenotateResult = await client.query(prenotateQuery, prenotateParams);
      const totalePrenotato = parseInt(prenotateResult.rows[0].totale_prenotato);

      const disponibilePeriodo = disponibileOra - totalePrenotato;
      const sufficiente = disponibilePeriodo >= parseInt(quantita);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          disponibile: sufficiente,
          quantita_disponibile: disponibilePeriodo,
          quantita_richiesta: parseInt(quantita),
          quantita_totale: quantity,
          quantita_assegnata: assigned,
          quantita_prenotata: totalePrenotato
        })
      };
    }

    // POST - Crea nuova prenotazione
    if (method === 'POST') {
      const data = JSON.parse(event.body);
      const { materiale_id, quantita, data_inizio, data_fine, evento, richiedente, note, created_by } = data;

      // Verifica disponibilità
      const checkResult = await client.query(`
        SELECT COALESCE(SUM(quantita), 0) as totale_prenotato
        FROM prenotazioni_materiali
        WHERE materiale_id = $1
        AND stato IN ('prenotata', 'confermata')
        AND NOT (data_fine < $2 OR data_inizio > $3)
      `, [materiale_id, data_inizio, data_fine]);

      const materialResult = await client.query(
        'SELECT quantita as quantity, quantita_assegnata as assigned FROM materials WHERE id = $1',
        [materiale_id]
      );

      const disponibile = materialResult.rows[0].quantity - materialResult.rows[0].assigned - 
                         parseInt(checkResult.rows[0].totale_prenotato);

      if (disponibile < quantita) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Quantità non disponibile per il periodo selezionato',
            disponibile: disponibile
          })
        };
      }

      const result = await client.query(`
        INSERT INTO prenotazioni_materiali 
        (materiale_id, quantita, data_inizio, data_fine, evento, richiedente, note, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [materiale_id, quantita, data_inizio, data_fine, evento, richiedente, note, created_by]);

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
      const { quantita, data_inizio, data_fine, evento, richiedente, note, stato } = data;

      const result = await client.query(`
        UPDATE prenotazioni_materiali
        SET quantita = COALESCE($1, quantita),
            data_inizio = COALESCE($2, data_inizio),
            data_fine = COALESCE($3, data_fine),
            evento = COALESCE($4, evento),
            richiedente = COALESCE($5, richiedente),
            note = COALESCE($6, note),
            stato = COALESCE($7, stato),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `, [quantita, data_inizio, data_fine, evento, richiedente, note, stato, id]);

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
        'DELETE FROM prenotazioni_materiali WHERE id = $1 RETURNING *',
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
