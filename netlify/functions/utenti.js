// ===================================
// UTENTI API
// Gestione utenti (Solo Admin)
// ===================================

const bcrypt = require('bcryptjs');
const { query, queryOne, exists, logActivity } = require('./utils/db');
const { authenticate, requireAdmin, successResponse, errorResponse, parsePath } = require('./utils/auth');
const { sendNewUserCredentials } = require('./utils/email');

// =====================
// HELPER FUNCTIONS
// =====================

// Genera password casuale sicura
function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Garantisce almeno 1 carattere per tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Riempie il resto
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mescola i caratteri
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

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
                    `SELECT id, username, role, nome, cognome, email, attivo, email_sent, email_sent_at, created_at, last_login 
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
                `SELECT id, username, role, nome, cognome, email, attivo, email_sent, email_sent_at, created_at, last_login 
                 FROM users ORDER BY created_at DESC`
            );

            return successResponse(users);
        }

        // POST - Crea nuovo utente
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            // Password non più richiesta - viene generata automaticamente
            if (!data.username || !data.nome || !data.cognome || !data.role || !data.email) {
                return errorResponse('Dati obbligatori mancanti (username, nome, cognome, role, email)');
            }

            // Verifica unicità username
            const usernameExists = await exists('users', 'username', data.username);
            if (usernameExists) {
                return errorResponse('Username già esistente');
            }

            // 🔐 Genera password casuale sicura
            const generatedPassword = generateSecurePassword(12);
            console.log('🔑 Password generata per:', data.username);

            // Hash password
            const password_hash = await bcrypt.hash(generatedPassword, 10);

            const newUser = await queryOne(
                `INSERT INTO users (username, password_hash, role, nome, cognome, email, attivo, email_sent, email_sent_at, first_login) 
                 VALUES ($1, $2, $3, $4, $5, $6, true, false, NULL, true)
                 RETURNING id, username, role, nome, cognome, email, attivo, email_sent, email_sent_at, first_login, created_at`,
                [
                    data.username,
                    password_hash,
                    data.role,
                    data.nome,
                    data.cognome,
                    data.email
                ]
            );

            await logActivity(
                user.id,
                'CREATE',
                'users',
                newUser.id,
                `Nuovo utente: ${newUser.username} (${newUser.role})`
            );

            // Invia email con credenziali (password generata automaticamente)
            let emailSuccess = false;
            try {
                const emailResult = await sendNewUserCredentials(
                    newUser.email,
                    newUser.nome,
                    newUser.cognome,
                    newUser.username,
                    generatedPassword
                );
                
                if (emailResult.success) {
                    emailSuccess = true;
                    console.log('✅ Email credenziali inviata a:', newUser.email);
                    
                    // Aggiorna stato invio email
                    await queryOne(
                        `UPDATE users SET email_sent = true, email_sent_at = NOW() WHERE id = $1`,
                        [newUser.id]
                    );
                    newUser.email_sent = true;
                    newUser.email_sent_at = new Date();
                } else {
                    console.warn('⚠️ Email non inviata:', emailResult.message);
                }
            } catch (emailError) {
                console.error('❌ Errore invio email:', emailError.message);
                // Non blocchiamo la creazione utente se l'email fallisce
            }

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

            // Aggiorna password e imposta first_login a false
            await query(
                `UPDATE users SET password_hash = $1, first_login = false WHERE id = $2`,
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

        // POST - Reset password (genera nuova password e invia email)
        if (event.httpMethod === 'POST' && userId && segments[1] === 'reset-password') {
            // Non può resettare se stesso
            if (parseInt(userId) === user.id) {
                return errorResponse('Non puoi resettare la tua stessa password da qui');
            }

            // Recupera dati utente
            const targetUser = await queryOne(
                `SELECT id, username, nome, cognome, email FROM users WHERE id = $1`,
                [userId]
            );

            if (!targetUser) {
                return errorResponse('Utente non trovato', 404);
            }

            if (!targetUser.email) {
                return errorResponse('Utente senza email configurata');
            }

            // 🔐 Genera nuova password casuale
            const newPassword = generateSecurePassword(12);
            console.log('🔑 Password reset generata per:', targetUser.username);

            // Hash password
            const password_hash = await bcrypt.hash(newPassword, 10);

            // Aggiorna password e imposta first_login a true
            await query(
                `UPDATE users SET password_hash = $1, first_login = true, email_sent = false WHERE id = $2`,
                [password_hash, userId]
            );

            // Invia email con nuove credenziali
            let emailSuccess = false;
            try {
                const emailResult = await sendNewUserCredentials(
                    targetUser.email,
                    targetUser.nome,
                    targetUser.cognome,
                    targetUser.username,
                    newPassword
                );
                
                if (emailResult.success) {
                    emailSuccess = true;
                    console.log('✅ Email reset password inviata a:', targetUser.email);
                    
                    // Aggiorna stato invio email
                    await queryOne(
                        `UPDATE users SET email_sent = true, email_sent_at = NOW() WHERE id = $1`,
                        [userId]
                    );
                } else {
                    console.warn('⚠️ Email reset non inviata:', emailResult.message);
                }
            } catch (emailError) {
                console.error('❌ Errore invio email reset:', emailError.message);
            }

            await logActivity(
                user.id,
                'RESET_PASSWORD',
                'users',
                userId,
                `Password resettata per: ${targetUser.username}${emailSuccess ? ' (email inviata)' : ' (email NON inviata)'}`
            );

            return successResponse({ 
                message: 'Password rigenerata e inviata via email',
                email_sent: emailSuccess
            });
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
