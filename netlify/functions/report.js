// ===================================
// REPORT API
// Dashboard e statistiche
// ===================================

const { query, queryOne } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        const user = authenticate(event);
        requireOperator(user);

        const path = event.path.replace('/.netlify/functions/report', '');
        const segments = path.split('/').filter(s => s);
        const reportType = segments[0];

        // GET /report/dashboard
        if (reportType === 'dashboard') {
            // Statistiche materiali
            const materialsStats = await queryOne(`
                SELECT 
                    COUNT(*) as totale,
                    COUNT(*) FILTER (WHERE stato = 'disponibile') as disponibili,
                    COUNT(*) FILTER (WHERE stato = 'assegnato') as assegnati,
                    COUNT(*) FILTER (WHERE stato = 'in_manutenzione') as in_manutenzione,
                    COUNT(*) FILTER (WHERE stato = 'fuori_servizio') as fuori_servizio,
                    COUNT(*) FILTER (WHERE stato = 'dismesso') as dismessi
                FROM materials
            `);

            // Statistiche volontari
            const volunteersStats = await queryOne(`
                SELECT 
                    COUNT(*) FILTER (WHERE attivo = true) as attivi,
                    COUNT(*) FILTER (WHERE attivo = false) as non_attivi
                FROM volunteers
            `);

            // Statistiche assegnazioni
            const assignmentsStats = await queryOne(`
                SELECT 
                    COUNT(*) FILTER (WHERE stato = 'in_corso') as in_corso,
                    COUNT(*) FILTER (WHERE stato = 'rientrato') as rientrati,
                    COUNT(*) FILTER (WHERE stato = 'danneggiato') as danneggiati
                FROM assignments
            `);

            // Attività recenti (ultime 10)
            const recentActivity = await query(`
                SELECT a.*, u.nome as user_nome, u.cognome as user_cognome
                FROM activity_log a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 10
            `);

            return successResponse({
                materials: materialsStats,
                volunteers: volunteersStats,
                assignments: assignmentsStats,
                recent_activity: recentActivity
            });
        }

        // GET /report/materiali
        if (reportType === 'materiali') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.categoria) {
                paramCount++;
                filters.push(`categoria = $${paramCount}`);
                values.push(params.categoria);
            }

            if (params.stato) {
                paramCount++;
                filters.push(`stato = $${paramCount}`);
                values.push(params.stato);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const materials = await query(
                `SELECT * FROM materials ${whereClause} ORDER BY created_at DESC`,
                values
            );

            return successResponse(materials);
        }

        // GET /report/assegnazioni
        if (reportType === 'assegnazioni') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.data_da) {
                paramCount++;
                filters.push(`data_uscita >= $${paramCount}`);
                values.push(params.data_da);
            }

            if (params.data_a) {
                paramCount++;
                filters.push(`data_uscita <= $${paramCount}`);
                values.push(params.data_a);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const assignments = await query(
                `SELECT a.*, 
                        m.nome as material_nome,
                        v.nome as volunteer_nome, v.cognome as volunteer_cognome
                 FROM assignments a
                 JOIN materials m ON a.material_id = m.id
                 JOIN volunteers v ON a.volunteer_id = v.id
                 ${whereClause}
                 ORDER BY a.data_uscita DESC`,
                values
            );

            return successResponse(assignments);
        }

        // GET /report/attivita
        if (reportType === 'attivita') {
            const params = event.queryStringParameters || {};
            const limit = params.limit || 50;

            const activities = await query(
                `SELECT a.*, u.nome as user_nome, u.cognome as user_cognome
                 FROM activity_log a
                 LEFT JOIN users u ON a.user_id = u.id
                 ORDER BY a.created_at DESC
                 LIMIT $1`,
                [limit]
            );

            return successResponse(activities);
        }

        return errorResponse('Report non trovato', 404);

    } catch (error) {
        console.error('Errore API report:', error);
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        return errorResponse('Errore interno del server', 500);
    }
};
