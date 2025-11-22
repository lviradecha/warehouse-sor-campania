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
        'SELECT id, username, full_name, role, primo_accesso, attivo, data_ultimo_accesso, created_at, updated_at FROM users ORDER BY created_at DESC'
      );
      return res.status(200).json(users);
    }

    // POST - Crea nuovo utente
    if (req.method === 'POST') {
      const { username, full_name, email, role } = req.body;

      if (!username || !full_name || !role) {
        return res.status(400).json({ 
          error: 'Username, nome completo e ruolo sono obbligatori' 
        });
      }

      if (!['admin', 'operatore'].includes(role)) {
        return res.status(400).json({ error: 'Ruolo non valido' });
      }

      // Verifica che lo username sia univoco
      const existing = await query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username già esistente' });
      }

      // Genera password casuale
      const password = generateRandomPassword(8);
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crea utente
      const result = await query(
        `INSERT INTO users (username, password, full_name, role, primo_accesso, attivo) 
         VALUES ($1, $2, $3, $4, true, true) 
         RETURNING id, username, full_name, role, created_at`,
        [username, hashedPassword, full_name, role]
      );

      const newUser = result[0];

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'create_user', 'user', newUser.id, 
         `Creato utente: ${username} (${role})`]
      );

      // Invia email (se configurato SendGrid)
      let emailSent = false;
      if (email && process.env.SENDGRID_API_KEY) {
        try {
          emailSent = await sendCredentialsEmail(email, full_name, username, password);
        } catch (emailError) {
          console.error('Errore invio email:', emailError);
        }
      }

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
        emailSent: emailSent,
        message: emailSent ? 
          'Utente creato e email inviata con successo' : 
          'Utente creato. Conserva la password!'
      });
    }

    // PUT - Aggiorna/Abilita/Disabilita utente
    if (req.method === 'PUT') {
      const { id, action, full_name, role, password } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Non permettere di modificare se stesso con toggle
      if (id === req.user.id && action === 'toggle') {
        return res.status(400).json({ 
          error: 'Non puoi disabilitare il tuo stesso account' 
        });
      }

      // ABILITA/DISABILITA
      if (action === 'toggle') {
        const users = await query('SELECT attivo, username FROM users WHERE id = $1', [id]);
        
        if (users.length === 0) {
          return res.status(404).json({ error: 'Utente non trovato' });
        }

        const newStatus = !users[0].attivo;
        
        await query(
          'UPDATE users SET attivo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newStatus, id]
        );

        await query(
          'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
          [req.user.id, newStatus ? 'enable_user' : 'disable_user', 'user', id,
           `${newStatus ? 'Abilitato' : 'Disabilitato'} utente: ${users[0].username}`]
        );

        return res.status(200).json({
          success: true,
          attivo: newStatus,
          message: `Utente ${newStatus ? 'abilitato' : 'disabilitato'} con successo`
        });
      }

      // MODIFICA DATI
      let sql = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
      let params = [];
      let paramCount = 0;

      if (full_name) {
        paramCount++;
        sql += `, full_name = $${paramCount}`;
        params.push(full_name);
      }

      if (role) {
        paramCount++;
        sql += `, role = $${paramCount}`;
        params.push(role);
      }

      if (password) {
        paramCount++;
        const hashedPassword = await bcrypt.hash(password, 10);
        sql += `, password = $${paramCount}, primo_accesso = true`;
        params.push(hashedPassword);
      }

      paramCount++;
      sql += ` WHERE id = $${paramCount} RETURNING id, username, full_name, role`;
      params.push(id);

      const result = await query(sql, params);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update_user', 'user', id, 
         `Aggiornato utente: ${result[0].username}`]
      );

      return res.status(200).json({
        success: true,
        user: result[0],
        message: 'Utente aggiornato con successo'
      });
    }

    // DELETE - Elimina utente
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID utente richiesto' });
      }

      // Non permettere di eliminare se stesso
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ 
          error: 'Non puoi eliminare il tuo stesso account' 
        });
      }

      // Verifica che esista almeno un altro admin
      const user = await query('SELECT role, username FROM users WHERE id = $1', [id]);
      
      if (user.length === 0) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      if (user[0].role === 'admin') {
        const adminCount = await query(
          'SELECT COUNT(*) as count FROM users WHERE role = $1 AND attivo = true',
          ['admin']
        );
        
        if (parseInt(adminCount[0].count) <= 1) {
          return res.status(400).json({ 
            error: 'Non puoi eliminare l\'ultimo admin attivo' 
          });
        }
      }

      // Elimina utente
      await query('DELETE FROM users WHERE id = $1', [id]);

      // Log attività
      await query(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'delete_user', 'user', id, 
         `Eliminato utente: ${user[0].username}`]
      );

      return res.status(200).json({
        success: true,
        message: 'Utente eliminato con successo'
      });
    }

    return res.status(405).json({ error: 'Metodo non consentito' });

  } catch (error) {
    console.error('Errore API utenti:', error);
    return res.status(500).json({ error: 'Errore del server' });
  }
}

// Genera password casuale
function generateRandomPassword(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Invia email con credenziali tramite SendGrid
async function sendCredentialsEmail(email, fullName, username, password) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid non configurato');
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'sor.campania@cri.it',
      subject: 'Credenziali Accesso - Sistema Magazzino SOR Campania',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">CROCE ROSSA ITALIANA</h1>
            <p style="color: white; margin: 5px 0;">Sistema Gestione Magazzino - SOR Campania</p>
          </div>
          
          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #d32f2f;">Benvenuto/a ${fullName}!</h2>
            
            <p>È stato creato un account per accedere al Sistema di Gestione Magazzino della Sala Operativa Regionale Campania.</p>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Le tue credenziali:</h3>
              <p style="margin: 10px 0;"><strong>Username:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 5px;">${username}</code></p>
              <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #ffeb3b; padding: 5px 10px; border-radius: 5px; font-weight: bold;">${password}</code></p>
            </div>
            
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ IMPORTANTE:</strong> Al primo accesso sarà obbligatorio cambiare la password.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://warehouse-sor-campania.vercel.app/" 
                 style="background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Accedi al Sistema
              </a>
            </div>
            
            <p style="color: #777; font-size: 14px; margin-top: 30px;">
              Per assistenza: <a href="mailto:sor.campania@cri.it">sor.campania@cri.it</a><br>
              Tel: +39 081 7810011 (selezione 2)
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2025 Croce Rossa Italiana - Comitato Regionale Campania</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('Email inviata con successo a:', email);
    return true;
    
  } catch (error) {
    console.error('Errore SendGrid:', error);
    return false;
  }
}

export default requireAdmin(handler);
