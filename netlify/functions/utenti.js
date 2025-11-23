// ===================================
// UTENTI API
// Gestione utenti (Solo Admin)
// ===================================

const bcrypt = require('bcryptjs');
const { query, queryOne, exists, logActivity } = require('./utils/db');
const { authenticate, requireAdmin, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        const user = authenticate(event);
        requireAdmin(user); // Solo admin può gestire utenti

        const path = parsePath(event.path, 'utenti');
        const segments = path.split('/').filter(s => s);
        const userId = segments[0];

        // GET - Lista utenti o singolo utente
        if (event.httpMethod === 'GET') {
            if (userId && !segments[1]) {
                const targetUser = await queryOne(
                    `SELECT id, username, role, nome, cognome, email, attivo, created_at, last_login 
                     FROM users WHERE id = $1`,
                    [userId]
                );

                if (!targetUser) {
                    return errorResponse('Utente non trovato', 404);
                }

                return successResponse(targetUser);
            }

            // Lista tutti gli utenti (senza password)
            const users = await query(
                `SELECT id, username, role, nome, cognome, email, attivo, created_at, last_login 
                 FROM users ORDER BY created_at DESC`
            );

            return successResponse(users);
        }

        // POST - Crea nuovo utente
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            if (!data.username || !data.password || !data.nome || !data.cognome || !data.role) {
                return errorResponse('Dati obbligatori mancanti');
            }

            // Verifica unicità username
            const usernameExists = await exists('users', 'username', data.username);
            if (usernameExists) {
                return errorResponse('Username già esistente');
            }

            // Hash password
            const password_hash = await bcrypt.hash(data.password, 10);

            const newUser = await queryOne(
                `INSERT INTO users (username, password_hash, role, nome, cognome, email, attivo) 
                 VALUES ($1, $2, $3, $4, $5, $6, true)
                 RETURNING id, username, role, nome, cognome, email, attivo, created_at`,
                [
                    data.username,
                    password_hash,
                    data.role,
                    data.nome,
                    data.cognome,
                    data.email || null
                ]
            );

            await logActivity(
                user.id,
                'CREATE',
                'users',
                newUser.id,
                `Nuovo utente: ${newUser.username} (${newUser.role})`
            );

            return successResponse(newUser, 201);
        }

        // PUT - Aggiorna utente
        if (event.httpMethod === 'PUT' && userId) {
            const data = JSON.parse(event.body);

            // Non può modificare se stesso (per sicurezza)
            if (parseInt(userId) === user.id) {
                return errorResponse('Non puoi modificare il tuo stesso account da questa interfaccia');
            }

            const existingUser = await queryOne(
                `SELECT * FROM users WHERE id = $1`,
                [userId]
            );

            if (!existingUser) {
                return errorResponse('Utente non trovato', 404);
            }

            const updatedUser = await queryOne(
                `UPDATE users SET
                    nome = COALESCE($1, nome),
                    cognome = COALESCE($2, cognome),
                    email = COALESCE($3, email),
                    role = COALESCE($4, role),
                    attivo = COALESCE($5, attivo)
                WHERE id = $6
                RETURNING id, username, role, nome, cognome, email, attivo, created_at, last_login`,
                [
                    data.nome,
                    data.cognome,
                    data.email,
                    data.role,
                    data.attivo === 'true' || data.attivo === true,
                    userId
                ]
            );

            await logActivity(
                user.id,
                'UPDATE',
                'users',
                userId,
                `Utente aggiornato: ${updatedUser.username}`
            );

            return successResponse(updatedUser);
        }

        // PATCH - Cambia password
        if (event.httpMethod === 'PATCH' && userId && segments[1] === 'password') {
            const { newPassword } = JSON.parse(event.body);

            if (!newPassword || newPassword.length < 8) {
                return errorResponse('Password deve essere almeno 8 caratteri');
            }

            const password_hash = await bcrypt.hash(newPassword, 10);

            await query(
                `UPDATE users SET password_hash = $1 WHERE id = $2`,
                [password_hash, userId]
            );

            await logActivity(
                user.id,
                'CHANGE_PASSWORD',
                'users',
                userId,
                'Password cambiata'
            );

            return successResponse({ message: 'Password aggiornata con successo' });
        }

        // DELETE - Elimina utente
        if (event.httpMethod === 'DELETE' && userId) {
            // Non può eliminare se stesso
            if (parseInt(userId) === user.id) {
                return errorResponse('Non puoi eliminare il tuo stesso account');
            }

            // Verifica che l'utente esista
            const targetUser = await queryOne(
                `SELECT username FROM users WHERE id = $1`,
                [userId]
            );

            if (!targetUser) {
                return errorResponse('Utente non trovato', 404);
            }

            await query(`DELETE FROM users WHERE id = $1`, [userId]);

            await logActivity(
                user.id,
                'DELETE',
                'users',
                userId,
                `Utente eliminato: ${targetUser.username}`
            );

            return successResponse({ message: 'Utente eliminato con successo' });
        }

        return errorResponse('Richiesta non valida', 400);

    } catch (error) {
        console.error('Errore API utenti:', error);
        
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        
        return errorResponse('Errore interno del server', 500);
    }
};
