// ===================================
// AUTHENTICATION UTILITY
// Gestione JWT e verifica permessi
// ===================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';

// Genera token JWT
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
        nome: user.nome,
        cognome: user.cognome
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

// Verifica token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Token non valido o scaduto');
    }
}

// Middleware per autenticazione
function authenticate(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Token di autenticazione mancante');
    }
    
    const token = authHeader.substring(7); // Rimuovi "Bearer "
    const user = verifyToken(token);
    
    return user;
}

// Middleware per verifica ruolo admin
function requireAdmin(user) {
    if (user.role !== 'admin') {
        throw new Error('Accesso negato: solo gli amministratori possono eseguire questa operazione');
    }
    return true;
}

// Verifica permessi operatore (può fare tutto tranne gestione utenti)
function requireOperator(user) {
    if (user.role !== 'admin' && user.role !== 'operatore') {
        throw new Error('Accesso negato: permessi insufficienti');
    }
    return true;
}

// Response helper con CORS
function createResponse(statusCode, body, headers = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            ...headers
        },
        body: JSON.stringify(body)
    };
}

// Success response
function successResponse(data, statusCode = 200) {
    return createResponse(statusCode, data);
}

// Error response
function errorResponse(message, statusCode = 400) {
    return createResponse(statusCode, { error: message });
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    requireAdmin,
    requireOperator,
    successResponse,
    errorResponse
};
