import { query } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Lista manutenzioni
    if (req.method === 'GET') {
      const { material_id, outcome } = req.query;
      
      let sql = `
        SELECT 
          mh.*,
          m.name as material_name,
          m.barcode as material_barcode,
          u.full_name as created_by_name
        FROM maintenance_history mh
        LEFT JOIN materials m ON mh.material_id = m.id
        LEFT JOIN users u ON mh.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (material_id) {
        paramCount++;
        sql += ` AND mh.material_id = $${paramCount}`;
        params.push(material_id);
      }

      if (outcome) {
        paramCount++;
        sql += ` AND mh.outcome = $${paramCount}`;
        params.push(outcome);
      }

      sql += ' ORDER BY mh.maintenance_date DESC';

      const maintenances = await query(sql, params);
      return res.status(200).json(maintenances);
    }

    // POST - Crea nuova manutenzione
    if (req.method === 'POST') {
      const { material_id, maintenance_type, description, cost, maintenance_date, 
              performed_by, outcome, notes } = req.body;

      if (!material_id || !maintenance_type || !description || !maintenance_date || !outcome) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
      }

      const result = await query(
        `INSERT INTO maintenance_history 
         (material_id, maintenance_type, description, cost, maintenance_date, 
          performed_by, outcome, notes, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [material_id, maintenance_type, description, cost || null, maintenance_date, 
         performed_by || null, outcome, notes || null, req.user.id]
      );

      // Se riparato, aggiorna stato materiale
      if (outcome === 'riparato') {
        await query(
          'UPDATE materials SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['disponibile', null, material_id]
        );
      } else if (outcome === 'da_dismettere') {
        await query(
          'UPDATE materials SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['fuori_servizio', notes, material_id]
        );
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'maintenance', 'maintenance', result[0].id, 
         `Manutenzione ${maintenance_type} - Esito: ${outcome}`]
      );

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna manutenzione
    if (req.method === 'PUT') {
      const { id, maintenance_type, description, cost, maintenance_date, 
              performed_by, outcome, notes } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID manutenzione richiesto' });
      }

      const result = await query(
        `UPDATE maintenance_history 
         SET maintenance_type = $1, description = $2, cost = $3, maintenance_date = $4, 
             performed_by = $5, outcome = $6, notes = $7
         WHERE id = $8 
         RETURNING *`,
        [maintenance_type, description, cost, maintenance_date, performed_by, outcome, notes, id]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Manutenzione non trovata' });
      }

      // Aggiorna stato materiale in base all'esito
      if (outcome === 'riparato') {
        await query(
          'UPDATE materials SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['disponibile', null, result[0].material_id]
        );
      } else if (outcome === 'da_dismettere') {
        await query(
          'UPDATE materials SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['fuori_servizio', notes, result[0].material_id]
        );
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update', 'maintenance', id, `Aggiornata manutenzione - Esito: ${outcome}`]
      );

      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API manutenzioni:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
