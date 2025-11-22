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
    // GET - Lista volunteers
    if (req.method === 'GET') {
      const { ricerca } = req.query;
      
      let volunteers;
      if (ricerca) {
        volunteers = await sql`
          SELECT * FROM volunteers 
          WHERE nome ILIKE ${'%' + ricerca + '%'} 
             OR cognome ILIKE ${'%' + ricerca + '%'}
             OR codice_volunteerso ILIKE ${'%' + ricerca + '%'}
          ORDER BY cognome, nome
        `;
      } else {
        volunteers = await sql`
          SELECT * FROM volunteers 
          ORDER BY cognome, nome
        `;
      }

      return res.status(200).json(volunteers);
    }

    // POST - Crea nuovo volunteerso
    if (req.method === 'POST') {
      const { codice_volunteerso, nome, cognome, email, telefono } = req.body;

      if (!codice_volunteerso || !nome || !cognome) {
        return res.status(400).json({ 
          error: 'Codice volunteerso, nome e cognome sono obbligatori' 
        });
      }

      // Verifica che il codice sia univoco
      const existing = await sql`
        SELECT id FROM volunteers WHERE codice_volunteerso = ${codice_volunteerso}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Codice volunteerso già esistente' });
      }

      const result = await sql`
        INSERT INTO volunteers (codice_volunteerso, nome, cognome, email, telefono) 
        VALUES (${codice_volunteerso}, ${nome}, ${cognome}, ${email || null}, ${telefono || null})
        RETURNING *
      `;

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna volunteerso
    if (req.method === 'PUT') {
      const { id, nome, cognome, email, telefono } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID volunteerso richiesto' });
      }

      const result = await sql`
        UPDATE volunteers 
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

    // DELETE - Elimina volunteerso
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID volunteerso richiesto' });
      }

      // Verifica che non ci siano assegnazioni attive
      const assegnazioni = await sql`
        SELECT id FROM assegnazioni 
        WHERE volunteerso_id = ${id} AND stato = 'assegnato'
      `;

      if (assegnazioni.length > 0) {
        return res.status(400).json({ 
          error: 'Impossibile eliminare: volunteerso ha assegnazioni attive' 
        });
      }

      await sql`DELETE FROM volunteers WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Volontario eliminato' });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API volunteers:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
