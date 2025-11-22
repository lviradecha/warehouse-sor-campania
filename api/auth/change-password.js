import { query } from '../../lib/db.js';
import { requireAuth } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  try {
    const { old_password, new_password, confirm_password } = req.body;

    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Le password non corrispondono' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'La password deve essere di almeno 8 caratteri' });
    }

    const users = await query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(old_password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Password attuale non corretta' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await query(
      `UPDATE users SET password = $1, primo_accesso = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hashedPassword, req.user.id]
    );

    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'change_password', 'user', req.user.id, 'Password modificata']
    );

    return res.status(200).json({
      success: true,
      message: 'Password cambiata con successo'
    });

  } catch (error) {
    console.error('Errore cambio password:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

export default requireAuth(handler);
