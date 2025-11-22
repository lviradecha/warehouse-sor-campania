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
    // GET - Lista maintenance con join
    if (req.method === 'GET') {
      const { material_id, stato } = req.query;
      
      let query = `
        SELECT 
          m.*,
          mat.codice as materiale_codice,
          mat.nome as materiale_nome,
          mat.categoria as materiale_categoria
        FROM maintenance m
        LEFT JOIN materials mat ON m.material_id = mat.id
        WHERE 1=1
      `;
      const params = [];

      if (material_id) {
        params.push(material_id);
        query += ` AND m.material_id = $${params.length}`;
      }

      if (stato) {
        params.push(stato);
        query += ` AND m.stato = $${params.length}`;
      }

      query += ' ORDER BY m.data_inizio DESC';

      const maintenance = params.length > 0 
        ? await sql(query, params)
        : await sql(query);

      return res.status(200).json(maintenance);
    }

    // POST - Crea nuova manutenzione
    if (req.method === 'POST') {
      const { material_id, tipo, descrizione, costo } = req.body;

      if (!material_id || !tipo || !descrizione) {
        return res.status(400).json({ 
          error: 'ID materiale, tipo e descrizione sono obbligatori' 
        });
      }

      // Verifica che il materiale esista
      const materiale = await sql`
        SELECT id, stato FROM materials WHERE id = ${material_id}
      `;
      
      if (materiale.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      // Crea manutenzione
      const manutenzione = await sql`
        INSERT INTO maintenance (material_id, tipo, descrizione, costo, stato) 
        VALUES (${material_id}, ${tipo}, ${descrizione}, ${costo || null}, 'in_corso')
        RETURNING *
      `;

      // Aggiorna stato materiale a "manutenzione"
      await sql`
        UPDATE materials 
        SET stato = 'manutenzione' 
        WHERE id = ${material_id}
      `;

      return res.status(201).json(manutenzione[0]);
    }

    // PUT - Completa manutenzione
    if (req.method === 'PUT') {
      const { id, note_completamento, costo } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID manutenzione richiesto' });
      }

      // Ottieni info manutenzione
      const manutenzione = await sql`
        SELECT material_id FROM maintenance WHERE id = ${id}
      `;

      if (manutenzione.length === 0) {
        return res.status(404).json({ error: 'Manutenzione non trovata' });
      }

      // Aggiorna manutenzione
      const result = await sql`
        UPDATE maintenance 
        SET stato = 'completata',
            data_completamento = CURRENT_TIMESTAMP,
            note_completamento = ${note_completamento || null},
            costo = ${costo || null}
        WHERE id = ${id} 
        RETURNING *
      `;

      // Riporta materiale a disponibile
      await sql`
        UPDATE materials 
        SET stato = 'disponibile'
        WHERE id = ${manutenzione[0].material_id}
      `;

      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API maintenance:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
