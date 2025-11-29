// ===================================
// REPORT API
// Dashboard e statistiche
// ===================================

const { query, queryOne } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        const user = authenticate(event);
        requireOperator(user);

        const path = parsePath(event.path, 'report');
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

            // Statistiche automezzi
            const vehiclesStats = await queryOne(`
                SELECT 
                    COUNT(*) as totale,
                    COUNT(*) FILTER (WHERE stato = 'disponibile') as disponibili,
                    COUNT(*) FILTER (WHERE stato = 'in_uso') as in_uso,
                    COUNT(*) FILTER (WHERE stato = 'manutenzione') as in_manutenzione,
                    COUNT(*) FILTER (WHERE stato = 'fuori_servizio') as fuori_servizio
                FROM vehicles
            `);

            // Assegnazioni automezzi attive
            const vehicleAssignmentsStats = await queryOne(`
                SELECT 
                    COUNT(*) FILTER (WHERE stato = 'in_corso') as in_corso,
                    COUNT(*) FILTER (WHERE stato = 'completato') as completati
                FROM vehicle_assignments
            `);

            // Km totali percorsi ultimo mese
            const kmStats = await queryOne(`
                SELECT 
                    COALESCE(SUM(km_percorsi), 0) as km_ultimo_mese,
                    COUNT(*) as assegnazioni_ultimo_mese
                FROM vehicle_assignments
                WHERE data_uscita >= CURRENT_DATE - INTERVAL '30 days'
                AND stato = 'completato'
            `);

            // Prossime scadenze (prossimi 30 giorni)
            const upcomingDeadlines = await query(`
                SELECT vd.*, v.targa, v.tipo,
                       (vd.data_scadenza - CURRENT_DATE) as giorni_rimanenti
                FROM vehicle_deadlines vd
                JOIN vehicles v ON vd.vehicle_id = v.id
                WHERE vd.stato = 'attivo'
                AND vd.data_scadenza BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                ORDER BY vd.data_scadenza ASC
                LIMIT 5
            `);

            // Rifornimenti ultimo mese
            const refuelingStats = await queryOne(`
                SELECT 
                    COUNT(*) as rifornimenti_ultimo_mese,
                    COALESCE(SUM(litri), 0) as litri_totali,
                    COALESCE(SUM(importo), 0) as spesa_totale
                FROM vehicle_refueling
                WHERE data_rifornimento >= CURRENT_DATE - INTERVAL '30 days'
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
                vehicles: vehiclesStats,
                vehicle_assignments: vehicleAssignmentsStats,
                km_stats: kmStats,
                upcoming_deadlines: upcomingDeadlines,
                refueling_stats: refuelingStats,
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

        // GET /report/automezzi-utilizzo
        if (reportType === 'automezzi-utilizzo') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.data_da) {
                paramCount++;
                filters.push(`va.data_uscita >= $${paramCount}`);
                values.push(params.data_da);
            }

            if (params.data_a) {
                paramCount++;
                filters.push(`va.data_uscita <= $${paramCount}`);
                values.push(params.data_a);
            }

            if (params.vehicle_id) {
                paramCount++;
                filters.push(`va.vehicle_id = $${paramCount}`);
                values.push(params.vehicle_id);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const usage = await query(
                `SELECT 
                    v.id, v.targa, v.tipo, v.modello,
                    COUNT(va.id) as num_assegnazioni,
                    COALESCE(SUM(va.km_percorsi), 0) as km_totali,
                    COALESCE(AVG(va.km_percorsi), 0) as km_medi,
                    MIN(va.data_uscita) as prima_assegnazione,
                    MAX(va.data_rientro) as ultima_assegnazione
                 FROM vehicles v
                 LEFT JOIN vehicle_assignments va ON v.id = va.vehicle_id AND va.stato = 'completato'
                 ${whereClause}
                 GROUP BY v.id, v.targa, v.tipo, v.modello
                 ORDER BY km_totali DESC`,
                values
            );

            return successResponse(usage);
        }

        // GET /report/automezzi-assegnazioni
        if (reportType === 'automezzi-assegnazioni') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.data_da) {
                paramCount++;
                filters.push(`va.data_uscita >= $${paramCount}`);
                values.push(params.data_da);
            }

            if (params.data_a) {
                paramCount++;
                filters.push(`va.data_uscita <= $${paramCount}`);
                values.push(params.data_a);
            }

            if (params.volunteer_id) {
                paramCount++;
                filters.push(`va.volunteer_id = $${paramCount}`);
                values.push(params.volunteer_id);
            }

            if (params.vehicle_id) {
                paramCount++;
                filters.push(`va.vehicle_id = $${paramCount}`);
                values.push(params.vehicle_id);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const assignments = await query(
                `SELECT va.*, 
                        v.targa, v.tipo as vehicle_tipo, v.modello,
                        vol.nome as volunteer_nome, vol.cognome as volunteer_cognome,
                        vol.gruppo as volunteer_gruppo
                 FROM vehicle_assignments va
                 JOIN vehicles v ON va.vehicle_id = v.id
                 JOIN volunteers vol ON va.volunteer_id = vol.id
                 ${whereClause}
                 ORDER BY va.data_uscita DESC`,
                values
            );

            return successResponse(assignments);
        }

        // GET /report/automezzi-manutenzioni
        if (reportType === 'automezzi-manutenzioni') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.data_da) {
                paramCount++;
                filters.push(`vm.data_programmata >= $${paramCount}`);
                values.push(params.data_da);
            }

            if (params.data_a) {
                paramCount++;
                filters.push(`vm.data_programmata <= $${paramCount}`);
                values.push(params.data_a);
            }

            if (params.vehicle_id) {
                paramCount++;
                filters.push(`vm.vehicle_id = $${paramCount}`);
                values.push(params.vehicle_id);
            }

            if (params.stato) {
                paramCount++;
                filters.push(`vm.stato = $${paramCount}`);
                values.push(params.stato);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const maintenance = await query(
                `SELECT vm.*, 
                        v.targa, v.tipo as vehicle_tipo
                 FROM vehicle_maintenance vm
                 JOIN vehicles v ON vm.vehicle_id = v.id
                 ${whereClause}
                 ORDER BY vm.data_programmata DESC`,
                values
            );

            // Calcola statistiche costi
            const costStats = await queryOne(
                `SELECT 
                    COUNT(*) as totale_manutenzioni,
                    COALESCE(SUM(costo), 0) as costo_totale,
                    COALESCE(AVG(costo), 0) as costo_medio
                 FROM vehicle_maintenance vm
                 ${whereClause}
                 AND vm.costo IS NOT NULL`,
                values
            );

            return successResponse({
                maintenance: maintenance,
                stats: costStats
            });
        }

        // GET /report/automezzi-rifornimenti
        if (reportType === 'automezzi-rifornimenti') {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.data_da) {
                paramCount++;
                filters.push(`vr.data_rifornimento >= $${paramCount}`);
                values.push(params.data_da);
            }

            if (params.data_a) {
                paramCount++;
                filters.push(`vr.data_rifornimento <= $${paramCount}`);
                values.push(params.data_a);
            }

            if (params.vehicle_id) {
                paramCount++;
                filters.push(`vr.vehicle_id = $${paramCount}`);
                values.push(params.vehicle_id);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const refueling = await query(
                `SELECT vr.*, 
                        v.targa, v.tipo as vehicle_tipo,
                        u.nome as user_nome, u.cognome as user_cognome
                 FROM vehicle_refueling vr
                 JOIN vehicles v ON vr.vehicle_id = v.id
                 LEFT JOIN users u ON vr.user_id = u.id
                 ${whereClause}
                 ORDER BY vr.data_rifornimento DESC`,
                values
            );

            // Statistiche rifornimenti
            const refuelStats = await queryOne(
                `SELECT 
                    COUNT(*) as totale_rifornimenti,
                    COALESCE(SUM(litri), 0) as litri_totali,
                    COALESCE(AVG(litri), 0) as litri_medi,
                    COALESCE(SUM(importo), 0) as spesa_totale,
                    COALESCE(AVG(importo), 0) as spesa_media,
                    COALESCE(AVG(importo / NULLIF(litri, 0)), 0) as prezzo_medio_litro
                 FROM vehicle_refueling vr
                 ${whereClause}
                 AND vr.importo IS NOT NULL AND vr.litri > 0`,
                values
            );

            return successResponse({
                refueling: refueling,
                stats: refuelStats
            });
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
