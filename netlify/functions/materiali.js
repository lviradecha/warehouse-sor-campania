// ===================================
// MATERIALI API
// CRUD completo materiali magazzino
// ===================================

const { query, queryOne, exists, logActivity } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    // Gestione CORS
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        // Autenticazione obbligatoria
        const user = authenticate(event);
        requireOperator(user);

        const path = parsePath(event.path, 'materiali');
        const segments = path.split('/').filter(s => s);
        const materialId = segments[0];

        // GET - Lista materiali o singolo materiale
        if (event.httpMethod === 'GET') {
            // GET singolo materiale
            if (materialId && !segments[1]) {
                const material = await queryOne(
                    `SELECT m.*, 
                            mc.nome as categoria_nome,
                            mc.icona as categoria_icona,
                            mc.colore as categoria_colore,
                            (m.quantita - COALESCE(m.quantita_assegnata, 0)) as quantita_disponibile_calc
                     FROM materials m
                     LEFT JOIN material_categories mc ON m.categoria_id = mc.id
                     WHERE m.id = $1`,
                    [materialId]
                );

                if (!material) {
                    return errorResponse('Materiale non trovato', 404);
                }

                return successResponse(material);
            }

            // GET /materiali/:id/barcode - Genera codice a barre
            if (materialId && segments[1] === 'barcode') {
                const material = await queryOne(
                    `SELECT m.id, m.codice_barre, m.nome, 
                            mc.nome as categoria_nome
                     FROM materials m
                     LEFT JOIN material_categories mc ON m.categoria_id = mc.id
                     WHERE m.id = $1`,
                    [materialId]
                );

                if (!material) {
                    return errorResponse('Materiale non trovato', 404);
                }

                return successResponse({
                    ...material,
                    barcode_url: `/print-barcode.html?code=${material.codice_barre}`
                });
            }

            // GET /materiali/:id/manutenzioni - Storico manutenzioni
            if (materialId && segments[1] === 'manutenzioni') {
                const maintenances = await query(
                    `SELECT m.*, u.nome as user_nome, u.cognome as user_cognome
                     FROM maintenance_history m
                     LEFT JOIN users u ON m.user_id = u.id
                     WHERE m.material_id = $1
                     ORDER BY m.created_at DESC`,
                    [materialId]
                );

                return successResponse(maintenances);
            }

            // GET lista materiali con filtri
            const params = event.queryStringParameters || {};
            const filters = [];
            const values = [];
            let paramCount = 0;

            // Filtro per stato
            if (params.stato) {
                paramCount++;
                filters.push(`stato = $${paramCount}`);
                values.push(params.stato);
            }

            // Filtro per categoria
            if (params.categoria) {
                paramCount++;
                filters.push(`categoria_id = $${paramCount}`);
                values.push(params.categoria);
            }

            // Filtro per ricerca testuale
            if (params.search) {
                paramCount++;
                filters.push(`(
                    nome ILIKE $${paramCount} OR 
                    descrizione ILIKE $${paramCount} OR 
                    codice_barre ILIKE $${paramCount}
                )`);
                values.push(`%${params.search}%`);
            }

            const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
            
            const materials = await query(
                `SELECT m.*, 
                        mc.nome as categoria_nome,
                        mc.icona as categoria_icona,
                        mc.colore as categoria_colore,
                        (m.quantita - COALESCE(m.quantita_assegnata, 0)) as quantita_disponibile_calc
                 FROM materials m
                 LEFT JOIN material_categories mc ON m.categoria_id = mc.id
                 ${whereClause} 
                 ORDER BY m.created_at DESC`,
                values
            );

            // Statistiche
            const stats = await queryOne(`
                SELECT 
                    COUNT(*) as totale,
                    COUNT(*) FILTER (WHERE stato = 'disponibile') as disponibili,
                    COUNT(*) FILTER (WHERE stato = 'assegnato') as assegnati,
                    COUNT(*) FILTER (WHERE stato = 'in_manutenzione') as in_manutenzione,
                    COUNT(*) FILTER (WHERE stato = 'fuori_servizio') as fuori_servizio,
                    COUNT(*) FILTER (WHERE stato = 'dismesso') as dismessi,
                    SUM(quantita) as quantita_totale,
                    SUM(COALESCE(quantita_assegnata, 0)) as quantita_impegnata_totale,
                    SUM(quantita - COALESCE(quantita_assegnata, 0)) as quantita_disponibile_totale
                FROM materials
            `);

            return successResponse({ materials, stats });
        }

        // POST - Crea nuovo materiale
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            // Validazione dati obbligatori
            if (!data.codice_barre || !data.nome) {
                return errorResponse('Codice a barre e nome sono obbligatori');
            }

            // Verifica unicità codice a barre
            const codeExists = await exists('materials', 'codice_barre', data.codice_barre);
            if (codeExists) {
                return errorResponse('Codice a barre già esistente');
            }

            // Gestione data_acquisto: converti stringa vuota/undefined in NULL
            const dataAcquistoValue = (data.data_acquisto && String(data.data_acquisto).trim() !== '') 
                ? data.data_acquisto 
                : null;

            // Gestione campi numerici: converti stringhe vuote in NULL
            const categoriaIdValue = (data.categoria_id && String(data.categoria_id).trim() !== '') 
                ? data.categoria_id 
                : null;
            
            const quantitaValue = (data.quantita && String(data.quantita).trim() !== '') 
                ? parseInt(data.quantita) 
                : 1; // default = 1 per POST
            
            const costoValue = (data.costo && String(data.costo).trim() !== '') 
                ? parseFloat(data.costo) 
                : null;

            // Inserimento materiale
            const material = await queryOne(
                `INSERT INTO materials (
                    codice_barre, nome, descrizione, categoria_id, quantita, quantita_assegnata,
                    stato, data_acquisto, fornitore, costo, posizione_magazzino, note
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *`,
                [
                    data.codice_barre,
                    data.nome,
                    data.descrizione || null,
                    categoriaIdValue,
                    quantitaValue,
                    0, // quantita_assegnata iniziale = 0
                    data.stato || 'disponibile',
                    dataAcquistoValue,
                    data.fornitore || null,
                    costoValue,
                    data.posizione_magazzino || null,
                    data.note || null
                ]
            );

            // Log attività
            await logActivity(
                user.id,
                'CREATE',
                'materials',
                material.id,
                `Nuovo materiale: ${material.nome}`
            );

            return successResponse(material, 201);
        }

        // PUT - Aggiorna materiale
        if (event.httpMethod === 'PUT' && materialId) {
            const data = JSON.parse(event.body);

            // Verifica esistenza materiale
            const existingMaterial = await queryOne(
                `SELECT * FROM materials WHERE id = $1`,
                [materialId]
            );

            if (!existingMaterial) {
                return errorResponse('Materiale non trovato', 404);
            }

            // Verifica unicità codice a barre se modificato
            if (data.codice_barre && data.codice_barre !== existingMaterial.codice_barre) {
                const codeExists = await exists('materials', 'codice_barre', data.codice_barre);
                if (codeExists) {
                    return errorResponse('Codice a barre già esistente');
                }
            }

            // Gestione data_acquisto: converti stringa vuota/undefined in NULL
            const dataAcquistoValue = (data.data_acquisto && String(data.data_acquisto).trim() !== '') 
                ? data.data_acquisto 
                : null;

            // Gestione campi numerici: converti stringhe vuote in NULL
            const categoriaIdValue = (data.categoria_id && String(data.categoria_id).trim() !== '') 
                ? data.categoria_id 
                : null;
            
            const quantitaValue = (data.quantita && String(data.quantita).trim() !== '') 
                ? parseInt(data.quantita) 
                : null;
            
            const costoValue = (data.costo && String(data.costo).trim() !== '') 
                ? parseFloat(data.costo) 
                : null;

            // Aggiornamento
            const material = await queryOne(
                `UPDATE materials SET
                    codice_barre = COALESCE($1, codice_barre),
                    nome = COALESCE($2, nome),
                    descrizione = COALESCE($3, descrizione),
                    categoria_id = COALESCE($4, categoria_id),
                    quantita = COALESCE($5, quantita),
                    data_acquisto = COALESCE($6, data_acquisto),
                    fornitore = COALESCE($7, fornitore),
                    costo = COALESCE($8, costo),
                    posizione_magazzino = COALESCE($9, posizione_magazzino),
                    note = COALESCE($10, note),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $11
                RETURNING *`,
                [
                    data.codice_barre,
                    data.nome,
                    data.descrizione,
                    categoriaIdValue,
                    quantitaValue,
                    dataAcquistoValue,
                    data.fornitore,
                    costoValue,
                    data.posizione_magazzino,
                    data.note,
                    materialId
                ]
            );

            // Log attività
            await logActivity(
                user.id,
                'UPDATE',
                'materials',
                materialId,
                `Materiale aggiornato: ${material.nome}`
            );

            return successResponse(material);
        }

        // PATCH - Aggiorna solo stato
        if (event.httpMethod === 'PATCH' && materialId && segments[1] === 'stato') {
            const { stato, note } = JSON.parse(event.body);

            if (!stato) {
                return errorResponse('Stato è obbligatorio');
            }

            const material = await queryOne(
                `UPDATE materials SET
                    stato = $1,
                    note = COALESCE($2, note),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *`,
                [stato, note, materialId]
            );

            if (!material) {
                return errorResponse('Materiale non trovato', 404);
            }

            // Se messo fuori servizio, crea record manutenzione
            if (stato === 'fuori_servizio' && note) {
                await query(
                    `INSERT INTO maintenance_history (
                        material_id, tipo, descrizione, data_inizio, esito, user_id
                    ) VALUES ($1, 'rottura', $2, CURRENT_DATE, 'in_corso', $3)`,
                    [materialId, note, user.id]
                );
            }

            // Log attività
            await logActivity(
                user.id,
                'UPDATE_STATUS',
                'materials',
                materialId,
                `Stato cambiato a: ${stato}`
            );

            return successResponse(material);
        }

        // DELETE - Elimina materiale (solo se non ha assegnazioni)
        if (event.httpMethod === 'DELETE' && materialId) {
            // Verifica se ha assegnazioni attive
            const hasAssignments = await exists('assignments', 'material_id', materialId);
            
            if (hasAssignments) {
                return errorResponse('Impossibile eliminare: materiale ha assegnazioni attive');
            }

            await query(`DELETE FROM materials WHERE id = $1`, [materialId]);

            // Log attività
            await logActivity(
                user.id,
                'DELETE',
                'materials',
                materialId,
                'Materiale eliminato'
            );

            return successResponse({ message: 'Materiale eliminato con successo' });
        }

        return errorResponse('Richiesta non valida', 400);

    } catch (error) {
        console.error('Errore API materiali:', error);
        console.error('Stack trace:', error.stack);
        console.error('Request path:', event.path);
        console.error('Request method:', event.httpMethod);
        console.error('Request body:', event.body);
        
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        
        return errorResponse(`Errore interno del server: ${error.message}`, 500);
    }
};
