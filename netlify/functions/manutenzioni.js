// ===================================
// MANUTENZIONI API
// Gestione manutenzioni e riparazioni
// ===================================

const { query, queryOne, logActivity } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        const user = authenticate(event);
        requireOperator(user);

        const path = parsePath(event.path, 'manutenzioni');
        const segments = path.split('/').filter(s => s);
        const maintenanceId = segments[0];

        // GET - Lista manutenzioni
        if (event.httpMethod === 'GET' && !maintenanceId) {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.material_id) {
                paramCount++;
                filters.push(`m.material_id = $${paramCount}`);
                values.push(params.material_id);
            }

            if (params.esito) {
                paramCount++;
                filters.push(`m.esito = $${paramCount}`);
                values.push(params.esito);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

            const maintenances = await query(
                `SELECT m.*, 
                        mat.nome as material_nome, mat.codice_barre,
                        u.nome as user_nome, u.cognome as user_cognome
                 FROM maintenance_history m
                 JOIN materials mat ON m.material_id = mat.id
                 LEFT JOIN users u ON m.user_id = u.id
                 ${whereClause}
                 ORDER BY m.created_at DESC`,
                values
            );

            return successResponse(maintenances);
        }

        // GET singola manutenzione
        if (event.httpMethod === 'GET' && maintenanceId) {
            const maintenance = await queryOne(
                `SELECT m.*, 
                        mat.nome as material_nome, mat.codice_barre,
                        u.nome as user_nome, u.cognome as user_cognome
                 FROM maintenance_history m
                 JOIN materials mat ON m.material_id = mat.id
                 LEFT JOIN users u ON m.user_id = u.id
                 WHERE m.id = $1`,
                [maintenanceId]
            );

            if (!maintenance) {
                return errorResponse('Manutenzione non trovata', 404);
            }

            return successResponse(maintenance);
        }

        // POST - Crea manutenzione
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            if (!data.material_id || !data.tipo || !data.descrizione || !data.data_inizio) {
                return errorResponse('Dati obbligatori mancanti');
            }

            const maintenance = await queryOne(
                `INSERT INTO maintenance_history (
                    material_id, tipo, descrizione, data_inizio, 
                    costo, fornitore_riparazione, esito, user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    data.material_id,
                    data.tipo,
                    data.descrizione,
                    data.data_inizio,
                    data.costo || null,
                    data.fornitore_riparazione || null,
                    data.esito || 'in_corso',
                    user.id
                ]
            );

            await logActivity(
                user.id,
                'CREATE',
                'maintenance_history',
                maintenance.id,
                `Nuova manutenzione: ${data.tipo}`
            );

            return successResponse(maintenance, 201);
        }

        // PUT - Aggiorna manutenzione
        if (event.httpMethod === 'PUT' && maintenanceId) {
            const data = JSON.parse(event.body);

            const maintenance = await queryOne(
                `UPDATE maintenance_history SET
                    descrizione = COALESCE($1, descrizione),
                    data_fine = COALESCE($2, data_fine),
                    costo = COALESCE($3, costo),
                    fornitore_riparazione = COALESCE($4, fornitore_riparazione),
                    esito = COALESCE($5, esito)
                WHERE id = $6
                RETURNING *`,
                [
                    data.descrizione,
                    data.data_fine,
                    data.costo,
                    data.fornitore_riparazione,
                    data.esito,
                    maintenanceId
                ]
            );

            if (!maintenance) {
                return errorResponse('Manutenzione non trovata', 404);
            }

            // Se completata, aggiorna stato materiale
            if (data.esito === 'riparato') {
                await query(
                    `UPDATE materials SET stato = 'disponibile' WHERE id = $1`,
                    [maintenance.material_id]
                );
            } else if (data.esito === 'non_riparabile') {
                await query(
                    `UPDATE materials SET stato = 'dismesso' WHERE id = $1`,
                    [maintenance.material_id]
                );
            }

            await logActivity(
                user.id,
                'UPDATE',
                'maintenance_history',
                maintenanceId,
                `Manutenzione aggiornata: ${data.esito || 'in corso'}`
            );

            return successResponse(maintenance);
        }

        // PATCH - Completa manutenzione
        if (event.httpMethod === 'PATCH' && maintenanceId && segments[1] === 'completa') {
            const { data_fine, esito, costo, note } = JSON.parse(event.body);

            if (!data_fine || !esito) {
                return errorResponse('Data fine ed esito sono obbligatori');
            }

            const maintenance = await queryOne(
                `UPDATE maintenance_history SET
                    data_fine = $1,
                    esito = $2,
                    costo = COALESCE($3, costo),
                    descrizione = CASE WHEN $4 IS NOT NULL 
                                  THEN descrizione || ' - ' || $4 
                                  ELSE descrizione END
                WHERE id = $5
                RETURNING *`,
                [data_fine, esito, costo, note, maintenanceId]
            );

            if (!maintenance) {
                return errorResponse('Manutenzione non trovata', 404);
            }

            // Aggiorna stato materiale
            let newMaterialStatus = 'in_manutenzione';
            if (esito === 'riparato') {
                newMaterialStatus = 'disponibile';
            } else if (esito === 'non_riparabile' || esito === 'dismesso') {
                newMaterialStatus = 'dismesso';
            }

            await query(
                `UPDATE materials SET stato = $1 WHERE id = $2`,
                [newMaterialStatus, maintenance.material_id]
            );

            await logActivity(
                user.id,
                'COMPLETE',
                'maintenance_history',
                maintenanceId,
                `Manutenzione completata: ${esito}`
            );

            return successResponse(maintenance);
        }

        return errorResponse('Richiesta non valida', 400);

    } catch (error) {
        console.error('Errore API manutenzioni:', error);
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        return errorResponse('Errore interno del server', 500);
    }
};
