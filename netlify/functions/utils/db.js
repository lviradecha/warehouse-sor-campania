// ===================================
// DATABASE CONNECTION UTILITY
// Connessione a Neon PostgreSQL
// ===================================

const { neon } = require('@neondatabase/serverless');

// Connessione al database
const getDb = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL non configurato nelle variabili d\'ambiente');
    }
    return neon(process.env.DATABASE_URL);
};

// Query helper con error handling
async function query(sql, params = []) {
    try {
        const db = getDb();
        const result = await db(sql, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Helper per query singola riga
async function queryOne(sql, params = []) {
    const result = await query(sql, params);
    return result[0] || null;
}

// Helper per verifica esistenza
async function exists(table, field, value) {
    const result = await queryOne(
        `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${field} = $1) as exists`,
        [value]
    );
    return result.exists;
}

// Log attività
async function logActivity(userId, azione, tabella, recordId, dettagli = '') {
    try {
        await query(
            `INSERT INTO activity_log (user_id, azione, tabella, record_id, dettagli) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, azione, tabella, recordId, dettagli]
        );
    } catch (error) {
        console.error('Errore log attività:', error);
        // Non blocchiamo l'operazione principale se il log fallisce
    }
}

module.exports = {
    query,
    queryOne,
    exists,
    logActivity
};
