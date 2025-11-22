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
    // GET - Lista assignments con join
    if (req.method === 'GET') {
      const { stato, volunteerso_id, material_id } = req.query;
      
      let query = `
        SELECT 
          a.*,
          m.codice as materiale_codice,
          m.nome as materiale_nome,
          m.categoria as materiale_categoria,
          v.codice_volunteerso,
          v.nome as volunteerso_nome,
          v.cognome as volunteerso_cognome
        FROM assignments a
        LEFT JOIN materials m ON a.material_id = m.id
        LEFT JOIN volunteers v ON a.volunteerso_id = v.id
        WHERE 1=1
      `;
      const params = [];

      if (stato) {
        params.push(stato);
        query += ` AND a.stato = $${params.length}`;
      }

      if (volunteerso_id) {
        params.push(volunteerso_id);
        query += ` AND a.volunteerso_id = $${params.length}`;
      }

      if (material_id) {
        params.push(material_id);
        query += ` AND a.material_id = $${params.length}`;
      }

      query += ' ORDER BY a.data_assegnazione DESC';

      const assignments = params.length > 0 
        ? await sql(query, params)
        : await sql(query);

      return res.status(200).json(assignments);
    }

    // POST - Crea nuova assegnazione
    if (req.method === 'POST') {
      const { material_id, volunteerso_id, note } = req.body;

      if (!material_id || !volunteerso_id) {
        return res.status(400).json({ 
          error: 'ID materiale e volunteerso sono obbligatori' 
        });
      }

      // Verifica che il materiale sia disponibile
      const materiale = await sql`
        SELECT stato FROM materials WHERE id = ${material_id}
      `;
      
      if (materiale.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      if (materiale[0].stato !== 'disponibile') {
        return res.status(400).json({ 
          error: 'Materiale non disponibile per assegnazione' 
        });
      }

      // Verifica che il volunteerso esista
      const volunteerso = await sql`
        SELECT id FROM volunteers WHERE id = ${volunteerso_id}
      `;
      
      if (volunteerso.length === 0) {
        return res.status(404).json({ error: 'Volontario non trovato' });
      }

      // Crea assegnazione
      const assegnazione = await sql`
        INSERT INTO assignments (material_id, volunteerso_id, stato, note) 
        VALUES (${material_id}, ${volunteerso_id}, 'assegnato', ${note || null})
        RETURNING *
      `;

      // Aggiorna stato materiale
      await sql`
        UPDATE materials 
        SET stato = 'assegnato' 
        WHERE id = ${material_id}
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
        SELECT material_id FROM assignments WHERE id = ${id}
      `;

      if (assegnazione.length === 0) {
        return res.status(404).json({ error: 'Assegnazione non trovata' });
      }

      // Aggiorna assegnazione
      const result = await sql`
        UPDATE assignments 
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
        UPDATE materials 
        SET stato = ${nuovoStato}
        WHERE id = ${assegnazione[0].material_id}
      `;

      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API assignments:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
