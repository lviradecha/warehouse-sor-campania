import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET - Lista assegnazioni con join
    if (req.method === 'GET') {
      const { stato, volontario_id, materiale_id } = req.query;
      
      let query = `
        SELECT 
          a.*,
          m.codice as materiale_codice,
          m.nome as materiale_nome,
          m.categoria as materiale_categoria,
          v.codice_volontario,
          v.nome as volontario_nome,
          v.cognome as volontario_cognome
        FROM assegnazioni a
        LEFT JOIN materiali m ON a.materiale_id = m.id
        LEFT JOIN volontari v ON a.volontario_id = v.id
        WHERE 1=1
      `;
      const params = [];

      if (stato) {
        params.push(stato);
        query += ` AND a.stato = $${params.length}`;
      }

      if (volontario_id) {
        params.push(volontario_id);
        query += ` AND a.volontario_id = $${params.length}`;
      }

      if (materiale_id) {
        params.push(materiale_id);
        query += ` AND a.materiale_id = $${params.length}`;
      }

      query += ' ORDER BY a.data_assegnazione DESC';

      const assegnazioni = params.length > 0 
        ? await sql(query, params)
        : await sql(query);

      return res.status(200).json(assegnazioni);
    }

    // POST - Crea nuova assegnazione
    if (req.method === 'POST') {
      const { materiale_id, volontario_id, note } = req.body;

      if (!materiale_id || !volontario_id) {
        return res.status(400).json({ 
          error: 'ID materiale e volontario sono obbligatori' 
        });
      }

      // Verifica che il materiale sia disponibile
      const materiale = await sql`
        SELECT stato FROM materiali WHERE id = ${materiale_id}
      `;
      
      if (materiale.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      if (materiale[0].stato !== 'disponibile') {
        return res.status(400).json({ 
          error: 'Materiale non disponibile per assegnazione' 
        });
      }

      // Verifica che il volontario esista
      const volontario = await sql`
        SELECT id FROM volontari WHERE id = ${volontario_id}
      `;
      
      if (volontario.length === 0) {
        return res.status(404).json({ error: 'Volontario non trovato' });
      }

      // Crea assegnazione
      const assegnazione = await sql`
        INSERT INTO assegnazioni (materiale_id, volontario_id, stato, note) 
        VALUES (${materiale_id}, ${volontario_id}, 'assegnato', ${note || null})
        RETURNING *
      `;

      // Aggiorna stato materiale
      await sql`
        UPDATE materiali 
        SET stato = 'assegnato' 
        WHERE id = ${materiale_id}
      `;

      return res.status(201).json(assegnazione[0]);
    }

    // PUT - Gestisci rientro materiale
    if (req.method === 'PUT') {
      const { id, condizioni_rientro, note_rientro } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID assegnazione richiesto' });
      }

      // Ottieni info assegnazione
      const assegnazione = await sql`
        SELECT materiale_id FROM assegnazioni WHERE id = ${id}
      `;

      if (assegnazione.length === 0) {
        return res.status(404).json({ error: 'Assegnazione non trovata' });
      }

      // Aggiorna assegnazione
      const result = await sql`
        UPDATE assegnazioni 
        SET stato = 'rientrato',
            data_rientro = CURRENT_TIMESTAMP,
            condizioni_rientro = ${condizioni_rientro || null},
            note_rientro = ${note_rientro || null}
        WHERE id = ${id} 
        RETURNING *
      `;

      // Aggiorna stato materiale basato sulle condizioni
      let nuovoStato = 'disponibile';
      if (condizioni_rientro === 'danneggiato') {
        nuovoStato = 'manutenzione';
      }

      await sql`
        UPDATE materiali 
        SET stato = ${nuovoStato}
        WHERE id = ${assegnazione[0].materiale_id}
      `;

      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API assegnazioni:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
