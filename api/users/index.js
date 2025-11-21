import { query } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Lista utenti
    if (req.method === 'GET') {
      const users = await query(
        'SELECT id, username, full_name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
      );
      return res.status(200).json(users);
    }

    // POST - Crea nuovo utente
    if (req.method === 'POST') {
      const { username, password, full_name, role } = req.body;

      if (!username || !password || !full_name || !role) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
      }

      if (!['admin', 'operatore'].includes(role)) {
        return res.status(400).json({ error: 'Ruolo non valido' });
      }

      // Verifica che lo username sia univoco
      const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username già esistente' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await query(
        `INSERT INTO users (username, password, full_name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, full_name, role, created_at`,
        [username, hashedPassword, full_name, role]
      );

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'create', 'user', result[0].id, `Creato utente: ${username} (${role})`]
      );

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna utente
    if (req.method === 'PUT') {
      const { id, username, password, full_name, role } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Non permettere di modificare se stesso
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Non puoi modificare il tuo stesso account da qui' });
      }

      let sql = 'UPDATE users SET full_name = $1, role = $2, updated_at = CURRENT_TIMESTAMP';
      let params = [full_name, role];
      let paramCount = 2;

      // Se viene fornita una nuova password, hashala
      if (password) {
        paramCount++;
        const hashedPassword = await bcrypt.hash(password, 10);
        sql += `, password = $${paramCount}`;
        params.push(hashedPassword);
      }

      paramCount++;
      sql += ` WHERE id = $${paramCount} RETURNING id, username, full_name, role, updated_at`;
      params.push(id);

      const result = await query(sql, params);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update', 'user', id, `Aggiornato utente: ${username}`]
      );

      return res.status(200).json(result[0]);
    }

    // DELETE - Elimina utente
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Non permettere di eliminare se stesso
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
      }

      // Verifica che esista almeno un altro admin
      const adminCount = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
      const userToDelete = await query('SELECT role FROM users WHERE id = $1', [id]);
      
      if (userToDelete.length > 0 && userToDelete[0].role === 'admin' && parseInt(adminCount[0].count) <= 1) {
        return res.status(400).json({ error: 'Non puoi eliminare l\'ultimo admin' });
      }

      await query('DELETE FROM users WHERE id = $1', [id]);

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'delete', 'user', id, `Eliminato utente ID: ${id}`]
      );

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API utenti:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAdmin(handler);
