import { query } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Lista volontari
    if (req.method === 'GET') {
      const { active, search } = req.query;
      
      let sql = 'SELECT * FROM volunteers WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (active !== undefined) {
        paramCount++;
        sql += ` AND active = $${paramCount}`;
        params.push(active === 'true');
      }

      if (search) {
        paramCount++;
        sql += ` AND (full_name ILIKE $${paramCount} OR code ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      sql += ' ORDER BY full_name ASC';

      const volunteers = await query(sql, params);
      return res.status(200).json(volunteers);
    }

    // POST - Crea nuovo volontario
    if (req.method === 'POST') {
      const { full_name, code, phone, email } = req.body;

      if (!full_name || !code) {
        return res.status(400).json({ error: 'Nome e codice sono obbligatori' });
      }

      // Verifica che il codice sia univoco
      const existing = await query('SELECT id FROM volunteers WHERE code = $1', [code]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Codice volontario già esistente' });
      }

      const result = await query(
        `INSERT INTO volunteers (full_name, code, phone, email, active) 
         VALUES ($1, $2, $3, $4, true) 
         RETURNING *`,
        [full_name, code, phone || null, email || null]
      );

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'create', 'volunteer', result[0].id, `Creato volontario: ${full_name} (${code})`]
      );

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna volontario
    if (req.method === 'PUT') {
      const { id, full_name, code, phone, email, active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID volontario richiesto' });
      }

      const result = await query(
        `UPDATE volunteers 
         SET full_name = $1, code = $2, phone = $3, email = $4, active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING *`,
        [full_name, code, phone, email, active, id]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Volontario non trovato' });
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update', 'volunteer', id, `Aggiornato volontario: ${full_name}`]
      );

      return res.status(200).json(result[0]);
    }

    // DELETE - Elimina volontario (solo admin)
    if (req.method === 'DELETE') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admin può eliminare volontari' });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID volontario richiesto' });
      }

      // Verifica che non ci siano assegnazioni attive
      const assignments = await query(
        'SELECT id FROM assignments WHERE volunteer_id = $1 AND status = $2',
        [id, 'assegnato']
      );

      if (assignments.length > 0) {
        return res.status(400).json({ error: 'Impossibile eliminare: volontario ha materiali assegnati' });
      }

      await query('DELETE FROM volunteers WHERE id = $1', [id]);

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'delete', 'volunteer', id, `Eliminato volontario ID: ${id}`]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API volontari:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
