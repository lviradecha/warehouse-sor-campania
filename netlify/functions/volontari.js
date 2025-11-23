// ===================================
// VOLONTARI API
// CRUD volontari
// ===================================

const { query, queryOne, exists, logActivity } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        const user = authenticate(event);
        requireOperator(user);

        const path = parsePath(event.path, 'volontari');
        const segments = path.split('/').filter(s => s);
        const volunteerId = segments[0];

        // GET - Lista volontari o singolo volontario
        if (event.httpMethod === 'GET') {
            // GET singolo volontario
            if (volunteerId && !segments[1]) {
                const volunteer = await queryOne(
                    `SELECT * FROM volunteers WHERE id = $1`,
                    [volunteerId]
                );

                if (!volunteer) {
                    return errorResponse('Volontario non trovato', 404);
                }

                return successResponse(volunteer);
            }

            // GET /volontari/:id/assegnazioni - Assegnazioni del volontario
            if (volunteerId && segments[1] === 'assegnazioni') {
                const assignments = await query(
                    `SELECT a.*, m.nome as material_nome, m.codice_barre
                     FROM assignments a
                     JOIN materials m ON a.material_id = m.id
                     WHERE a.volunteer_id = $1
                     ORDER BY a.created_at DESC`,
                    [volunteerId]
                );

                return successResponse(assignments);
            }

            // GET lista volontari con filtri
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            // Filtro per gruppo
            if (params.gruppo) {
                paramCount++;
                filters.push(`gruppo = $${paramCount}`);
                values.push(params.gruppo);
            }

            // Filtro per stato attivo
            if (params.attivo !== undefined) {
                paramCount++;
                filters.push(`attivo = $${paramCount}`);
                values.push(params.attivo === 'true');
            }

            // Filtro ricerca
            if (params.search) {
                paramCount++;
                filters.push(`(
                    nome ILIKE $${paramCount} OR 
                    cognome ILIKE $${paramCount} OR 
                    email ILIKE $${paramCount} OR
                    telefono ILIKE $${paramCount}
                )`);
                values.push(`%${params.search}%`);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
            
            const volunteers = await query(
                `SELECT * FROM volunteers ${whereClause} ORDER BY cognome, nome`,
                values
            );

            return successResponse(volunteers);
        }

        // POST - Crea nuovo volontario
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            if (!data.nome || !data.cognome) {
                return errorResponse('Nome e cognome sono obbligatori');
            }

            // Verifica unicità codice fiscale se fornito
            if (data.codice_fiscale) {
                const cfExists = await exists('volunteers', 'codice_fiscale', data.codice_fiscale);
                if (cfExists) {
                    return errorResponse('Codice fiscale già esistente');
                }
            }

            const volunteer = await queryOne(
                `INSERT INTO volunteers (
                    nome, cognome, codice_fiscale, telefono, email, gruppo, attivo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    data.nome,
                    data.cognome,
                    data.codice_fiscale || null,
                    data.telefono || null,
                    data.email || null,
                    data.gruppo || null,
                    data.attivo !== false
                ]
            );

            await logActivity(
                user.id,
                'CREATE',
                'volunteers',
                volunteer.id,
                `Nuovo volontario: ${volunteer.nome} ${volunteer.cognome}`
            );

            return successResponse(volunteer, 201);
        }

        // PUT - Aggiorna volontario
        if (event.httpMethod === 'PUT' && volunteerId) {
            const data = JSON.parse(event.body);

            const existing = await queryOne(
                `SELECT * FROM volunteers WHERE id = $1`,
                [volunteerId]
            );

            if (!existing) {
                return errorResponse('Volontario non trovato', 404);
            }

            // Verifica unicità CF se modificato
            if (data.codice_fiscale && data.codice_fiscale !== existing.codice_fiscale) {
                const cfExists = await exists('volunteers', 'codice_fiscale', data.codice_fiscale);
                if (cfExists) {
                    return errorResponse('Codice fiscale già esistente');
                }
            }

            const volunteer = await queryOne(
                `UPDATE volunteers SET
                    nome = COALESCE($1, nome),
                    cognome = COALESCE($2, cognome),
                    codice_fiscale = COALESCE($3, codice_fiscale),
                    telefono = COALESCE($4, telefono),
                    email = COALESCE($5, email),
                    gruppo = COALESCE($6, gruppo),
                    attivo = COALESCE($7, attivo)
                WHERE id = $8
                RETURNING *`,
                [
                    data.nome,
                    data.cognome,
                    data.codice_fiscale,
                    data.telefono,
                    data.email,
                    data.gruppo,
                    data.attivo,
                    volunteerId
                ]
            );

            await logActivity(
                user.id,
                'UPDATE',
                'volunteers',
                volunteerId,
                `Volontario aggiornato: ${volunteer.nome} ${volunteer.cognome}`
            );

            return successResponse(volunteer);
        }

        // DELETE - Elimina volontario
        if (event.httpMethod === 'DELETE' && volunteerId) {
            // Verifica se ha assegnazioni attive
            const hasActiveAssignments = await queryOne(
                `SELECT COUNT(*) as count FROM assignments 
                 WHERE volunteer_id = $1 AND stato = 'in_corso'`,
                [volunteerId]
            );

            if (hasActiveAssignments.count > 0) {
                return errorResponse('Impossibile eliminare: volontario ha assegnazioni attive');
            }

            await query(`DELETE FROM volunteers WHERE id = $1`, [volunteerId]);

            await logActivity(
                user.id,
                'DELETE',
                'volunteers',
                volunteerId,
                'Volontario eliminato'
            );

            return successResponse({ message: 'Volontario eliminato con successo' });
        }

        return errorResponse('Richiesta non valida', 400);

    } catch (error) {
        console.error('Errore API volontari:', error);
        
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        
        return errorResponse('Errore interno del server', 500);
    }
};
