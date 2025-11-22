import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET - Lista volontari
    if (req.method === 'GET') {
      const { ricerca } = req.query;
      
      let volontari;
      if (ricerca) {
        volontari = await sql`
          SELECT * FROM volontari 
          WHERE nome ILIKE ${'%' + ricerca + '%'} 
             OR cognome ILIKE ${'%' + ricerca + '%'}
             OR codice_volontario ILIKE ${'%' + ricerca + '%'}
          ORDER BY cognome, nome
        `;
      } else {
        volontari = await sql`
          SELECT * FROM volontari 
          ORDER BY cognome, nome
        `;
      }

      return res.status(200).json(volontari);
    }

    // POST - Crea nuovo volontario
    if (req.method === 'POST') {
      const { codice_volontario, nome, cognome, email, telefono } = req.body;

      if (!codice_volontario || !nome || !cognome) {
        return res.status(400).json({ 
          error: 'Codice volontario, nome e cognome sono obbligatori' 
        });
      }

      // Verifica che il codice sia univoco
      const existing = await sql`
        SELECT id FROM volontari WHERE codice_volontario = ${codice_volontario}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Codice volontario già esistente' });
      }

      const result = await sql`
        INSERT INTO volontari (codice_volontario, nome, cognome, email, telefono) 
        VALUES (${codice_volontario}, ${nome}, ${cognome}, ${email || null}, ${telefono || null})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna volontario
    if (req.method === 'PUT') {
      const { id, nome, cognome, email, telefono } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID volontario richiesto' });
      }

      const result = await sql`
        UPDATE volontari 
        SET nome = ${nome}, 
            cognome = ${cognome}, 
            email = ${email || null}, 
            telefono = ${telefono || null},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} 
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Volontario non trovato' });
      }

      return res.status(200).json(result[0]);
    }

    // DELETE - Elimina volontario
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID volontario richiesto' });
      }

      // Verifica che non ci siano assegnazioni attive
      const assegnazioni = await sql`
        SELECT id FROM assegnazioni 
        WHERE volontario_id = ${id} AND stato = 'assegnato'
      `;

      if (assegnazioni.length > 0) {
        return res.status(400).json({ 
          error: 'Impossibile eliminare: volontario ha assegnazioni attive' 
        });
      }

      await sql`DELETE FROM volontari WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Volontario eliminato' });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API volontari:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
