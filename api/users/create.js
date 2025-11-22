import { query } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
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
    const { username, full_name, email, role } = req.body;

    if (!username || !full_name || !role) {
      return res.status(400).json({ error: 'Username, nome completo e ruolo sono obbligatori' });
    }

    if (!['admin', 'operatore'].includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username già esistente' });
    }

    const password = generateRandomPassword(8);
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, password, full_name, role, primo_accesso, attivo) 
       VALUES ($1, $2, $3, $4, true, true) RETURNING id, username, full_name, role, created_at`,
      [username, hashedPassword, full_name, role]
    );

    const newUser = result[0];

    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'create_user', 'user', newUser.id, `Creato utente: ${username} (${role})`]
    );

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role,
        email: email
      },
      password: password,
      message: 'Utente creato con successo. Conserva la password!'
    });

  } catch (error) {
    console.error('Errore creazione utente:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

function generateRandomPassword(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default requireAdmin(handler);
