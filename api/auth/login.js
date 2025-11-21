import { query } from '../../lib/db.js';
import { generateToken } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // CORS headers
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    // Cerca utente
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result[0];

    // Verifica password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Genera token
    const token = generateToken(user);

    // Log attività
    await query(
      'INSERT INTO activity_log (user_id, action, entity_type, details) VALUES ($1, $2, $3, $4)',
      [user.id, 'login', 'user', `Login effettuato da ${username}`]
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Errore login:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}
