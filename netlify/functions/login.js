// ===================================
// LOGIN API
// Autenticazione utente
// ===================================

const bcrypt = require('bcryptjs');
const { queryOne, logActivity } = require('./utils/db');
const { generateToken, successResponse, errorResponse } = require('./utils/auth');

exports.handler = async (event) => {
    // Gestione CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    // Solo POST permesso
    if (event.httpMethod !== 'POST') {
        return errorResponse('Metodo non permesso', 405);
    }

    try {
        const { username, password } = JSON.parse(event.body);

        // Validazione input
        if (!username || !password) {
            return errorResponse('Username e password sono obbligatori');
        }

        // Cerca utente
        const user = await queryOne(
            `SELECT * FROM users WHERE username = $1 AND attivo = true`,
            [username]
        );

        if (!user) {
            return errorResponse('Credenziali non valide', 401);
        }

        // Verifica password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return errorResponse('Credenziali non valide', 401);
        }

        // Aggiorna ultimo login
        await queryOne(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
        );

        // Log attività
        await logActivity(user.id, 'LOGIN', 'users', user.id, 'Login effettuato');

        // Genera token
        const token = generateToken(user);

        // Prepara dati utente (senza password)
        const userData = {
            id: user.id,
            username: user.username,
            role: user.role,
            nome: user.nome,
            cognome: user.cognome,
            email: user.email
        };

        return successResponse({
            token,
            user: userData,
            message: 'Login effettuato con successo'
        });

    } catch (error) {
        console.error('Errore login:', error);
        return errorResponse('Errore durante l\'autenticazione', 500);
    }
};
