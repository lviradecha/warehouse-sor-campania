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
    // GET - Lista materiali con filtri
    if (req.method === 'GET') {
      const { status, category, search } = req.query;
      
      let sql = 'SELECT * FROM materials WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        sql += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (category) {
        paramCount++;
        sql += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (search) {
        paramCount++;
        sql += ` AND (name ILIKE $${paramCount} OR barcode ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      sql += ' ORDER BY created_at DESC';

      const materials = await query(sql, params);
      return res.status(200).json(materials);
    }

    // POST - Crea nuovo materiale
    if (req.method === 'POST') {
      const { barcode, name, category, description, purchase_date, purchase_price } = req.body;

      if (!barcode || !name || !category) {
        return res.status(400).json({ error: 'Barcode, nome e categoria sono obbligatori' });
      }

      // Verifica che il barcode sia univoco
      const existing = await query('SELECT id FROM materials WHERE barcode = $1', [barcode]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Codice a barre già esistente' });
      }

      const result = await query(
        `INSERT INTO materials (barcode, name, category, description, purchase_date, purchase_price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'disponibile') 
         RETURNING *`,
        [barcode, name, category, description, purchase_date || null, purchase_price || null]
      );

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'create', 'material', result[0].id, `Creato materiale: ${name} (${barcode})`]
      );

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna materiale
    if (req.method === 'PUT') {
      const { id, name, category, description, purchase_date, purchase_price, status, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID materiale richiesto' });
      }

      // Solo admin può cambiare lo status in dismesso
      if (status === 'dismesso' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admin può dismettere materiali' });
      }

      const result = await query(
        `UPDATE materials 
         SET name = $1, category = $2, description = $3, purchase_date = $4, 
             purchase_price = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 
         RETURNING *`,
        [name, category, description, purchase_date, purchase_price, status, notes, id]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update', 'material', id, `Aggiornato materiale: ${name}`]
      );

      return res.status(200).json(result[0]);
    }

    // DELETE - Elimina materiale (solo admin)
    if (req.method === 'DELETE') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo admin può eliminare materiali' });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID materiale richiesto' });
      }

      // Verifica che non ci siano assegnazioni attive
      const assignments = await query(
        'SELECT id FROM assignments WHERE material_id = $1 AND status = $2',
        [id, 'assegnato']
      );

      if (assignments.length > 0) {
        return res.status(400).json({ error: 'Impossibile eliminare: materiale attualmente assegnato' });
      }

      await query('DELETE FROM materials WHERE id = $1', [id]);

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'delete', 'material', id, `Eliminato materiale ID: ${id}`]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API materiali:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
