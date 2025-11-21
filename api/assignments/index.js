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
    // GET - Lista assegnazioni con dettagli
    if (req.method === 'GET') {
      const { status, volunteer_id, material_id } = req.query;
      
      let sql = `
        SELECT 
          a.*,
          m.name as material_name,
          m.barcode as material_barcode,
          m.category as material_category,
          v.full_name as volunteer_name,
          v.code as volunteer_code,
          u1.full_name as assigned_by_name,
          u2.full_name as returned_by_name
        FROM assignments a
        LEFT JOIN materials m ON a.material_id = m.id
        LEFT JOIN volunteers v ON a.volunteer_id = v.id
        LEFT JOIN users u1 ON a.assigned_by = u1.id
        LEFT JOIN users u2 ON a.returned_by = u2.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        sql += ` AND a.status = $${paramCount}`;
        params.push(status);
      }

      if (volunteer_id) {
        paramCount++;
        sql += ` AND a.volunteer_id = $${paramCount}`;
        params.push(volunteer_id);
      }

      if (material_id) {
        paramCount++;
        sql += ` AND a.material_id = $${paramCount}`;
        params.push(material_id);
      }

      sql += ' ORDER BY a.assignment_date DESC';

      const assignments = await query(sql, params);
      return res.status(200).json(assignments);
    }

    // POST - Crea nuova assegnazione
    if (req.method === 'POST') {
      const { material_id, volunteer_id, event_name, assignment_date, expected_return_date } = req.body;

      if (!material_id || !volunteer_id || !event_name || !assignment_date) {
        return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati' });
      }

      // Verifica che il materiale sia disponibile
      const material = await query(
        'SELECT id, status, name FROM materials WHERE id = $1',
        [material_id]
      );

      if (material.length === 0) {
        return res.status(404).json({ error: 'Materiale non trovato' });
      }

      if (material[0].status !== 'disponibile') {
        return res.status(400).json({ error: `Materiale non disponibile (stato: ${material[0].status})` });
      }

      // Verifica che il volontario esista ed è attivo
      const volunteer = await query(
        'SELECT id, active, full_name FROM volunteers WHERE id = $1',
        [volunteer_id]
      );

      if (volunteer.length === 0) {
        return res.status(404).json({ error: 'Volontario non trovato' });
      }

      if (!volunteer[0].active) {
        return res.status(400).json({ error: 'Volontario non attivo' });
      }

      // Crea assegnazione
      const result = await query(
        `INSERT INTO assignments 
         (material_id, volunteer_id, event_name, assignment_date, expected_return_date, assigned_by, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'assegnato') 
         RETURNING *`,
        [material_id, volunteer_id, event_name, assignment_date, expected_return_date || null, req.user.id]
      );

      // Aggiorna stato materiale
      await query(
        'UPDATE materials SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['assegnato', material_id]
      );

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'assign', 'assignment', result[0].id, 
         `Assegnato ${material[0].name} a ${volunteer[0].full_name} per evento: ${event_name}`]
      );

      return res.status(201).json(result[0]);
    }

    // PUT - Registra rientro materiale
    if (req.method === 'PUT') {
      const { id, actual_return_date, return_notes, damaged } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID assegnazione richiesto' });
      }

      // Verifica che l'assegnazione esista e sia attiva
      const assignment = await query(
        'SELECT * FROM assignments WHERE id = $1 AND status = $2',
        [id, 'assegnato']
      );

      if (assignment.length === 0) {
        return res.status(404).json({ error: 'Assegnazione non trovata o già rientrata' });
      }

      const newStatus = damaged ? 'danneggiato' : 'rientrato';
      const materialStatus = damaged ? 'fuori_servizio' : 'disponibile';

      // Aggiorna assegnazione
      const result = await query(
        `UPDATE assignments 
         SET actual_return_date = $1, return_notes = $2, status = $3, returned_by = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 
         RETURNING *`,
        [actual_return_date || new Date(), return_notes, newStatus, req.user.id, id]
      );

      // Aggiorna stato materiale
      await query(
        'UPDATE materials SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [materialStatus, damaged ? return_notes : null, assignment[0].material_id]
      );

      // Se danneggiato, crea record manutenzione
      if (damaged) {
        await query(
          `INSERT INTO maintenance_history 
           (material_id, maintenance_type, description, maintenance_date, outcome, created_by, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [assignment[0].material_id, 'riparazione', 'Materiale rientrato danneggiato', 
           new Date(), 'in_attesa', req.user.id, return_notes]
        );
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'return', 'assignment', id, 
         `Rientro materiale ${damaged ? 'danneggiato' : 'OK'} dall'evento: ${assignment[0].event_name}`]
      );

      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API assegnazioni:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
