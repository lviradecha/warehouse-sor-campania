// ===================================
// ASSEGNAZIONI API
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

        const path = parsePath(event.path, 'assegnazioni');
        const segments = path.split('/').filter(s => s);
        const assignmentId = segments[0];

        // GET - Lista assegnazioni
        if (event.httpMethod === 'GET' && !assignmentId) {
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            if (params.stato) {
                paramCount++;
                filters.push(`a.stato = $${paramCount}`);
                values.push(params.stato);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
            
            const assignments = await query(
                `SELECT a.*, 
                        m.nome as material_nome, m.codice_barre,
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

        // GET singola assegnazione
        if (event.httpMethod === 'GET' && assignmentId) {
            const assignment = await queryOne(
                `SELECT a.*, 
                        m.nome as material_nome, m.codice_barre,
                        v.nome as volunteer_nome, v.cognome as volunteer_cognome
                 FROM assignments a
                 JOIN materials m ON a.material_id = m.id
                 JOIN volunteers v ON a.volunteer_id = v.id
                 WHERE a.id = $1`,
                [assignmentId]
            );

            if (!assignment) {
                return errorResponse('Assegnazione non trovata', 404);
            }

            return successResponse(assignment);
        }

        // POST - Crea assegnazione
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            if (!data.material_id || !data.volunteer_id || !data.evento || !data.data_uscita) {
                return errorResponse('Dati obbligatori mancanti');
            }

            // Verifica che il materiale sia disponibile
            const material = await queryOne(
                `SELECT stato FROM materials WHERE id = $1`,
                [data.material_id]
            );

            if (!material || material.stato !== 'disponibile') {
                return errorResponse('Materiale non disponibile');
            }

            // Crea assegnazione
            const assignment = await queryOne(
                `INSERT INTO assignments (
                    material_id, volunteer_id, evento, data_uscita, note_uscita, user_id, stato
                ) VALUES ($1, $2, $3, $4, $5, $6, 'in_corso')
                RETURNING *`,
                [
                    data.material_id,
                    data.volunteer_id,
                    data.evento,
                    data.data_uscita,
                    data.note_uscita || null,
                    user.id
                ]
            );

            // Aggiorna stato materiale
            await query(
                `UPDATE materials SET stato = 'assegnato' WHERE id = $1`,
                [data.material_id]
            );

            await logActivity(
                user.id,
                'CREATE',
                'assignments',
                assignment.id,
                `Assegnazione materiale per: ${data.evento}`
            );

            return successResponse(assignment, 201);
        }

        // PATCH - Registra rientro
        if (event.httpMethod === 'PATCH' && assignmentId && segments[1] === 'rientro') {
            const { data_rientro, stato, note_rientro } = JSON.parse(event.body);

            if (!data_rientro) {
                return errorResponse('Data rientro obbligatoria');
            }

            const assignment = await queryOne(
                `UPDATE assignments SET
                    data_rientro = $1,
                    stato = $2,
                    note_rientro = $3
                WHERE id = $4
                RETURNING *`,
                [data_rientro, stato || 'rientrato', note_rientro, assignmentId]
            );

            if (!assignment) {
                return errorResponse('Assegnazione non trovata', 404);
            }

            // Aggiorna stato materiale
            const newMaterialStatus = stato === 'danneggiato' ? 'in_manutenzione' : 'disponibile';
            await query(
                `UPDATE materials SET stato = $1 WHERE id = $2`,
                [newMaterialStatus, assignment.material_id]
            );

            // Se danneggiato, crea record manutenzione
            if (stato === 'danneggiato' && note_rientro) {
                await query(
                    `INSERT INTO maintenance_history (
                        material_id, tipo, descrizione, data_inizio, esito, user_id
                    ) VALUES ($1, 'rottura', $2, CURRENT_DATE, 'in_corso', $3)`,
                    [assignment.material_id, note_rientro, user.id]
                );
            }

            await logActivity(
                user.id,
                'UPDATE',
                'assignments',
                assignmentId,
                `Rientro materiale: ${stato}`
            );

            return successResponse(assignment);
        }

        // DELETE
        if (event.httpMethod === 'DELETE' && assignmentId) {
            await query(`DELETE FROM assignments WHERE id = $1`, [assignmentId]);
            await logActivity(user.id, 'DELETE', 'assignments', assignmentId, 'Assegnazione eliminata');
            return successResponse({ message: 'Assegnazione eliminata' });
        }

        return errorResponse('Richiesta non valida', 400);

    } catch (error) {
        console.error('Errore API assegnazioni:', error);
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        return errorResponse('Errore interno del server', 500);
    }
};
