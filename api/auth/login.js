import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    // Cerca utente nella tabella users
    const users = await sql`
      SELECT id, username, password_hash, role, nome, cognome, email, enabled
      FROM users 
      WHERE username = ${username}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = users[0];

    // Verifica se l'utente è abilitato
    if (!user.enabled) {
      return res.status(403).json({ error: 'Account disabilitato. Contatta l\'amministratore.' });
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Log accesso (opzionale, ignora errore se tabella non esiste)
    try {
      await sql`
        INSERT INTO activity_log (user_id, action, entity_type, details) 
        VALUES (${user.id}, 'login', 'auth', 'Login effettuato')
      `;
    } catch (logError) {
      console.log('Activity log non salvato');
    }

    // Aggiorna ultimo accesso
    await sql`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    // Genera token semplice (per compatibilità frontend)
    // In produzione, usa JWT
    const token = `${user.id}-${Date.now()}-${Math.random().toString(36)}`;

    // Restituisci dati nel formato atteso dal frontend
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email
      },
      token: token
    });

  } catch (error) {
    console.error('Errore login:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
