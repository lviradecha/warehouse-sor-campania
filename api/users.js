import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

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
    // GET - Lista users (senza password)
    if (req.method === 'GET') {
      const users = await sql`
        SELECT id, username, role, nome, cognome, email, enabled, created_at, last_login
        FROM users 
        ORDER BY cognome, nome
      `;

      return res.status(200).json(users);
    }

    // POST - Crea nuovo utente
    if (req.method === 'POST') {
      const { username, password, role, nome, cognome, email } = req.body;

      if (!username || !password || !role || !nome || !cognome) {
        return res.status(400).json({ 
          error: 'Username, password, ruolo, nome e cognome sono obbligatori' 
        });
      }

      // Verifica che username sia univoco
      const existing = await sql`
        SELECT id FROM users WHERE username = ${username}
      `;
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username già esistente' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Crea utente
      const result = await sql`
        INSERT INTO users (username, password_hash, role, nome, cognome, email, enabled) 
        VALUES (${username}, ${password_hash}, ${role}, ${nome}, ${cognome}, ${email || null}, true)
        RETURNING id, username, role, nome, cognome, email, enabled, created_at
      `;

      return res.status(201).json(result[0]);
    }

    // PUT - Aggiorna utente
    if (req.method === 'PUT') {
      const { id, role, nome, cognome, email, enabled, new_password } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Se c'è una nuova password, hash it
      if (new_password) {
        const password_hash = await bcrypt.hash(new_password, 10);
        
        const result = await sql`
          UPDATE users 
          SET role = ${role},
              nome = ${nome},
              cognome = ${cognome},
              email = ${email || null},
              enabled = ${enabled},
              password_hash = ${password_hash},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING id, username, role, nome, cognome, email, enabled
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Utente non trovato' });
        }

        return res.status(200).json(result[0]);
      } else {
        // Aggiorna senza cambiare password
        const result = await sql`
          UPDATE users 
          SET role = ${role},
              nome = ${nome},
              cognome = ${cognome},
              email = ${email || null},
              enabled = ${enabled},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING id, username, role, nome, cognome, email, enabled
        `;

        if (result.length === 0) {
          return res.status(404).json({ error: 'Utente non trovato' });
        }

        return res.status(200).json(result[0]);
      }
    }

    // DELETE - Elimina utente
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Non permettere eliminazione se è l'unico admin
      const user = await sql`SELECT role FROM users WHERE id = ${id}`;
      
      if (user.length > 0 && user[0].role === 'admin') {
        const adminCount = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND enabled = true`;
        
        if (adminCount[0].count <= 1) {
          return res.status(400).json({ 
            error: 'Impossibile eliminare: deve esistere almeno un admin attivo' 
          });
        }
      }

      await sql`DELETE FROM users WHERE id = ${id}`;

      return res.status(200).json({ success: true, message: 'Utente eliminato' });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API users:', error);
    return res.status(500).json({ 
      error: 'Errore del server', 
      details: error.message 
    });
  }
}
