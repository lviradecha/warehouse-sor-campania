import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET - Lista materiali con filtri opzionali
    if (req.method === 'GET') {
      const { stato, categoria, ricerca } = req.query;
      
      let query = 'SELECT * FROM materiali WHERE 1=1';
      const params = [];

      if (stato) {
        params.push(stato);
        query += ` AND stato = $${params.length}`;
      }

      if (categoria) {
        params.push(categoria);
        query += ` AND categoria = $${params.length}`;
      }

      if (ricerca) {
        params.push(`%${ricerca}%`);
        query += ` AND (nome ILIKE $${params.length} OR codice ILIKE $${params.length})`;
      }

      query += ' ORDER BY codice ASC';

      const materiali = params.length > 0 
        ? await sql(query, params)
        : await sql`SELECT * FROM materiali ORDER BY codice ASC`;

      return res.status(200).json(materiali);
    }

    // POST - Crea nuovo materiale
    if (req.method === 'POST') {
      const { codice, nome, categoria, stato, data_acquisto, prezzo, note } = req.body;

      if (!codice || !nome || !categoria) {
        return res.status(400).json({ error: 'Codice, nome e categoria sono obbligatori' });
      }

      // Verifica che il codice sia univoco
      const existing = await sql`SELECT id FROM materiali WHERE codice = ${codice}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Codice già esistente' });
      }

      const result = await sql`
        INSERT INTO materiali (codice, nome, categoria, stato, data_acquisto, prezzo, note) 
        VALUES (${codice}, ${nome}, ${categoria}, ${stato || 'disponibile'}, ${data_acquisto || null}, ${prezzo || null}, ${note || null})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna materiale
    if (req.method === 'PUT') {
      const { id, nome, categoria, stato, data_acquisto, prezzo, note } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID materiale richiesto' });
      }

      const result = await sql`
        UPDATE materiali 
        SET nome = ${nome}, 
            categoria = ${categoria}, 
            stato = ${stato}, 
            data_acquisto = ${data_acquisto || null}, 
            prezzo = ${prezzo || null}, 
            note = ${note || null},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} 
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      return res.status(200).json(result[0]);
    }

    // DELETE - Elimina materiale
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID materiale richiesto' });
      }

      // Verifica che non ci siano assegnazioni attive
      const assegnazioni = await sql`
        SELECT id FROM assegnazioni 
        WHERE materiale_id = ${id} AND stato = 'assegnato'
      `;

      if (assegnazioni.length > 0) {
        return res.status(400).json({ 
          error: 'Impossibile eliminare: materiale attualmente assegnato' 
        });
      }

      await sql`DELETE FROM materiali WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Materiale eliminato' });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API materiali:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
