// ===================================
// AUTOMEZZI API
// Con Permessi Admin e Gestione Rifornimenti
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
        
        const urlPath = parsePath(event.path, 'automezzi');
        const segments = urlPath.split('/').filter(s => s);
        
        // Verifica permessi admin per operazioni CRUD su veicoli (non assegnazioni/rifornimenti)
        const isVehicleCRUD = !segments.includes('assegnazioni') && 
                              !segments.includes('rifornimenti') &&
                              !segments.includes('scadenze') &&
                              !segments.includes('manutenzioni') &&
                              !segments.includes('documenti') &&
                              ['POST', 'PUT', 'DELETE'].includes(event.httpMethod);
        
        if (isVehicleCRUD && user.role !== 'admin') {
            return errorResponse('Solo gli amministratori possono modificare gli automezzi', 403);
        }

        // Route: /automezzi/scadenze/*
        if (segments[0] === 'scadenze') {
            return await handleDeadlines(segments, event, user);
        }

        // Route: /automezzi/manutenzioni/*
        if (segments[0] === 'manutenzioni') {
            return await handleMaintenance(segments, event, user);
        }

        // Route: /automezzi/documenti/*
        if (segments[0] === 'documenti') {
            return await handleDocuments(segments, event, user);
        }

        // Route: /automezzi/rifornimenti/*
        if (segments[0] === 'rifornimenti') {
            return await handleRefueling(segments, event, user);
        }

        // Route: /automezzi/assegnazioni/*
        if (segments[0] === 'assegnazioni') {
            return await handleAssignments(segments, event, user);
        }

        // Route: /automezzi/* (veicoli)
        return await handleVehicles(segments, event, user);

    } catch (error) {
        console.error('Errore API automezzi:', error);
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        return errorResponse('Errore interno del server', 500);
    }
};

// ===================================
// GESTIONE VEICOLI
// ===================================
async function handleVehicles(segments, event, user) {
    const vehicleId = segments[0];

    // GET - Lista veicoli
    if (event.httpMethod === 'GET' && !vehicleId) {
        const params = event.queryStringParameters || {};
        const filters = [];
        const values = [];
        let paramCount = 0;

        if (params.stato) {
            paramCount++;
            filters.push(`stato = $${paramCount}`);
            values.push(params.stato);
        }

        if (params.tipo) {
            paramCount++;
            filters.push(`tipo = $${paramCount}`);
            values.push(params.tipo);
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const vehicles = await query(
            `SELECT * FROM vehicles ${whereClause} ORDER BY targa ASC`,
            values
        );

        return successResponse(vehicles);
    }

    // GET - Singolo veicolo
    if (event.httpMethod === 'GET' && vehicleId && segments[1] !== 'assegnazioni') {
        const vehicle = await queryOne(
            `SELECT * FROM vehicles WHERE id = $1`,
            [vehicleId]
        );

        if (!vehicle) {
            return errorResponse('Automezzo non trovato', 404);
        }

        return successResponse(vehicle);
    }

    // GET - Assegnazioni di un veicolo
    if (event.httpMethod === 'GET' && vehicleId && segments[1] === 'assegnazioni') {
        const assignments = await query(
            `SELECT va.*, 
                    v.nome as volunteer_nome, 
                    v.cognome as volunteer_cognome
             FROM vehicle_assignments va
             JOIN volunteers v ON va.volunteer_id = v.id
             WHERE va.vehicle_id = $1
             ORDER BY va.data_uscita DESC
             LIMIT 10`,
            [vehicleId]
        );

        return successResponse(assignments);
    }

    // POST - Crea veicolo (SOLO ADMIN)
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);

        if (!data.tipo || !data.modello || !data.targa) {
            return errorResponse('Dati obbligatori mancanti');
        }

        // Verifica targa univoca
        const existing = await queryOne(
            `SELECT id FROM vehicles WHERE UPPER(targa) = UPPER($1)`,
            [data.targa]
        );

        if (existing) {
            return errorResponse('Targa già esistente', 400);
        }

        const vehicle = await queryOne(
            `INSERT INTO vehicles (
                tipo, modello, targa, anno_immatricolazione, 
                km_attuali, stato, note, user_id
            ) VALUES ($1, $2, UPPER($3), $4, $5, 'disponibile', $6, $7)
            RETURNING *`,
            [
                data.tipo,
                data.modello,
                data.targa,
                data.anno_immatricolazione || null,
                data.km_attuali || 0,
                data.note || null,
                user.id
            ]
        );

        await logActivity(
            user.id,
            'CREATE',
            'vehicles',
            vehicle.id,
            `Nuovo automezzo: ${vehicle.targa}`
        );

        return successResponse(vehicle, 201);
    }

    // PUT - Aggiorna veicolo (SOLO ADMIN)
    if (event.httpMethod === 'PUT' && vehicleId) {
        const data = JSON.parse(event.body);

        // Verifica targa univoca (escludendo questo veicolo)
        if (data.targa) {
            const existing = await queryOne(
                `SELECT id FROM vehicles WHERE UPPER(targa) = UPPER($1) AND id != $2`,
                [data.targa, vehicleId]
            );

            if (existing) {
                return errorResponse('Targa già esistente', 400);
            }
        }

        const vehicle = await queryOne(
            `UPDATE vehicles SET
                tipo = COALESCE($1, tipo),
                modello = COALESCE($2, modello),
                targa = UPPER(COALESCE($3, targa)),
                anno_immatricolazione = COALESCE($4, anno_immatricolazione),
                km_attuali = COALESCE($5, km_attuali),
                stato = COALESCE($6, stato),
                note = COALESCE($7, note)
             WHERE id = $8
             RETURNING *`,
            [
                data.tipo,
                data.modello,
                data.targa,
                data.anno_immatricolazione,
                data.km_attuali,
                data.stato,
                data.note,
                vehicleId
            ]
        );

        if (!vehicle) {
            return errorResponse('Automezzo non trovato', 404);
        }

        await logActivity(
            user.id,
            'UPDATE',
            'vehicles',
            vehicleId,
            `Automezzo aggiornato: ${vehicle.targa}`
        );

        return successResponse(vehicle);
    }

    // DELETE - Elimina veicolo (SOLO ADMIN)
    if (event.httpMethod === 'DELETE' && vehicleId) {
        await query(`DELETE FROM vehicles WHERE id = $1`, [vehicleId]);
        await logActivity(user.id, 'DELETE', 'vehicles', vehicleId, 'Automezzo eliminato');
        return successResponse({ message: 'Automezzo eliminato' });
    }

    return errorResponse('Richiesta non valida', 400);
}

// ===================================
// GESTIONE ASSEGNAZIONI VEICOLI
// ===================================
async function handleAssignments(segments, event, user) {
    const assignmentId = segments[1];

    // GET - Lista assegnazioni
    if (event.httpMethod === 'GET' && !assignmentId) {
        const params = event.queryStringParameters || {};
        const filters = [];
        const values = [];
        let paramCount = 0;

        if (params.stato) {
            paramCount++;
            filters.push(`va.stato = $${paramCount}`);
            values.push(params.stato);
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const assignments = await query(
            `SELECT va.*, 
                    vh.targa as vehicle_targa, 
                    vh.tipo as vehicle_tipo,
                    vh.modello as vehicle_modello,
                    v.nome as volunteer_nome, 
                    v.cognome as volunteer_cognome,
                    v.gruppo as volunteer_gruppo
             FROM vehicle_assignments va
             JOIN vehicles vh ON va.vehicle_id = vh.id
             JOIN volunteers v ON va.volunteer_id = v.id
             ${whereClause}
             ORDER BY va.data_uscita DESC`,
            values
        );

        return successResponse(assignments);
    }

    // GET - Singola assegnazione
    if (event.httpMethod === 'GET' && assignmentId) {
        const assignment = await queryOne(
            `SELECT va.*, 
                    vh.targa as vehicle_targa, 
                    vh.tipo as vehicle_tipo,
                    v.nome as volunteer_nome, 
                    v.cognome as volunteer_cognome
             FROM vehicle_assignments va
             JOIN vehicles vh ON va.vehicle_id = vh.id
             JOIN volunteers v ON va.volunteer_id = v.id
             WHERE va.id = $1`,
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

        if (!data.vehicle_id || !data.volunteer_id || !data.motivo || !data.data_uscita || !data.km_partenza) {
            return errorResponse('Dati obbligatori mancanti');
        }

        // Verifica che il veicolo sia disponibile
        const vehicle = await queryOne(
            `SELECT stato, km_attuali FROM vehicles WHERE id = $1`,
            [data.vehicle_id]
        );

        if (!vehicle || vehicle.stato !== 'disponibile') {
            return errorResponse('Automezzo non disponibile', 400);
        }

        // Crea assegnazione
        const assignment = await queryOne(
            `INSERT INTO vehicle_assignments (
                vehicle_id, volunteer_id, motivo, 
                data_uscita, km_partenza, note_uscita, 
                card_carburante, stato, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'in_corso', $8)
            RETURNING *`,
            [
                data.vehicle_id,
                data.volunteer_id,
                data.motivo,
                data.data_uscita,
                data.km_partenza,
                data.note_uscita || null,
                data.card_carburante === true || data.card_carburante === 'true',
                user.id
            ]
        );

        // Aggiorna stato veicolo
        await query(
            `UPDATE vehicles SET stato = 'in_uso' WHERE id = $1`,
            [data.vehicle_id]
        );

        await logActivity(
            user.id,
            'CREATE',
            'vehicle_assignments',
            assignment.id,
            `Assegnazione automezzo per: ${data.motivo}`
        );

        return successResponse(assignment, 201);
    }

    // PATCH - Registra rientro
    if (event.httpMethod === 'PATCH' && assignmentId && segments[2] === 'rientro') {
        const { data_rientro, km_arrivo, livello_carburante_rientro, note_rientro } = JSON.parse(event.body);

        if (!data_rientro || !km_arrivo || !livello_carburante_rientro) {
            return errorResponse('Dati obbligatori mancanti');
        }

        // Recupera assegnazione
        const currentAssignment = await queryOne(
            `SELECT * FROM vehicle_assignments WHERE id = $1`,
            [assignmentId]
        );

        if (!currentAssignment) {
            return errorResponse('Assegnazione non trovata', 404);
        }

        // Valida km arrivo
        if (parseInt(km_arrivo) < currentAssignment.km_partenza) {
            return errorResponse('Il chilometraggio arrivo non può essere inferiore a quello di partenza', 400);
        }

        // Calcola km percorsi
        const km_percorsi = parseInt(km_arrivo) - currentAssignment.km_partenza;

        // Aggiorna assegnazione
        const assignment = await queryOne(
            `UPDATE vehicle_assignments SET
                data_rientro = $1,
                km_arrivo = $2,
                km_percorsi = $3,
                livello_carburante_rientro = $4,
                note_rientro = $5,
                stato = 'completato'
             WHERE id = $6
             RETURNING *`,
            [data_rientro, km_arrivo, km_percorsi, livello_carburante_rientro, note_rientro, assignmentId]
        );

        // Aggiorna stato e km veicolo
        await query(
            `UPDATE vehicles 
             SET stato = 'disponibile', 
                 km_attuali = $1 
             WHERE id = $2`,
            [km_arrivo, assignment.vehicle_id]
        );

        await logActivity(
            user.id,
            'UPDATE',
            'vehicle_assignments',
            assignmentId,
            `Rientro automezzo: ${km_percorsi} km percorsi`
        );

        return successResponse(assignment);
    }

    // DELETE - Elimina assegnazione
    if (event.httpMethod === 'DELETE' && assignmentId) {
        // Recupera assegnazione prima di eliminarla
        const assignment = await queryOne(
            `SELECT vehicle_id, stato FROM vehicle_assignments WHERE id = $1`,
            [assignmentId]
        );

        if (assignment && assignment.stato === 'in_corso') {
            // Ripristina stato veicolo
            await query(
                `UPDATE vehicles SET stato = 'disponibile' WHERE id = $1`,
                [assignment.vehicle_id]
            );
        }

        await query(`DELETE FROM vehicle_assignments WHERE id = $1`, [assignmentId]);
        await logActivity(user.id, 'DELETE', 'vehicle_assignments', assignmentId, 'Assegnazione eliminata');
        return successResponse({ message: 'Assegnazione eliminata' });
    }

    return errorResponse('Richiesta non valida', 400);
}

// ===================================
// GESTIONE RIFORNIMENTI
// ===================================
async function handleRefueling(segments, event, user) {
    const refuelingId = segments[1];

    // GET - Lista rifornimenti
    if (event.httpMethod === 'GET' && !refuelingId) {
        const refueling = await query(
            `SELECT vr.*, 
                    vh.targa as vehicle_targa,
                    u.nome as user_nome
             FROM vehicle_refueling vr
             JOIN vehicles vh ON vr.vehicle_id = vh.id
             LEFT JOIN users u ON vr.user_id = u.id
             ORDER BY vr.data_rifornimento DESC`,
            []
        );

        return successResponse(refueling);
    }

    // POST - Registra rifornimento
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);

        if (!data.vehicle_id || !data.data_rifornimento || !data.km_rifornimento || !data.litri) {
            return errorResponse('Dati obbligatori mancanti');
        }

        const refueling = await queryOne(
            `INSERT INTO vehicle_refueling (
                vehicle_id, data_rifornimento, km_rifornimento, 
                litri, importo, note, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                data.vehicle_id,
                data.data_rifornimento,
                data.km_rifornimento,
                data.litri,
                data.importo || null,
                data.note || null,
                user.id
            ]
        );

        await logActivity(
            user.id,
            'CREATE',
            'vehicle_refueling',
            refueling.id,
            `Rifornimento: ${data.litri}L`
        );

        return successResponse(refueling, 201);
    }

    // DELETE - Elimina rifornimento
    if (event.httpMethod === 'DELETE' && refuelingId) {
        await query(`DELETE FROM vehicle_refueling WHERE id = $1`, [refuelingId]);
        await logActivity(user.id, 'DELETE', 'vehicle_refueling', refuelingId, 'Rifornimento eliminato');
        return successResponse({ message: 'Rifornimento eliminato' });
    }

    return errorResponse('Richiesta non valida', 400);
}

// ===================================
// GESTIONE SCADENZE
// ===================================
async function handleDeadlines(segments, event, user) {
    const deadlineId = segments[1];

    // GET - Lista scadenze
    if (event.httpMethod === 'GET' && !deadlineId) {
        const params = event.queryStringParameters || {};
        const filters = [];
        const values = [];
        let paramCount = 0;

        if (params.vehicle_id) {
            paramCount++;
            filters.push(`vd.vehicle_id = $${paramCount}`);
            values.push(params.vehicle_id);
        }

        if (params.stato) {
            paramCount++;
            filters.push(`vd.stato = $${paramCount}`);
            values.push(params.stato);
        }

        if (params.upcoming === 'true') {
            filters.push(`vd.data_scadenza <= CURRENT_DATE + INTERVAL '30 days'`);
            filters.push(`vd.data_scadenza >= CURRENT_DATE`);
            filters.push(`vd.stato = 'attivo'`);
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const deadlines = await query(
            `SELECT vd.*, 
                    v.targa as vehicle_targa,
                    v.tipo as vehicle_tipo,
                    (vd.data_scadenza - CURRENT_DATE) as giorni_rimanenti
             FROM vehicle_deadlines vd
             JOIN vehicles v ON vd.vehicle_id = v.id
             ${whereClause}
             ORDER BY vd.data_scadenza ASC`,
            values
        );

        return successResponse(deadlines);
    }

    // POST - Crea scadenza (solo admin)
    if (event.httpMethod === 'POST') {
        if (user.role !== 'admin') {
            return errorResponse('Solo gli amministratori possono gestire le scadenze', 403);
        }

        const data = JSON.parse(event.body);

        const deadline = await queryOne(
            `INSERT INTO vehicle_deadlines (
                vehicle_id, tipo, descrizione, data_scadenza, 
                costo, alert_giorni, note, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                data.vehicle_id, data.tipo, data.descrizione || null,
                data.data_scadenza, data.costo || null,
                data.alert_giorni || 30, data.note || null, user.id
            ]
        );

        await logActivity(user.id, 'CREATE', 'vehicle_deadlines', deadline.id, `Nuova scadenza: ${data.tipo}`);
        return successResponse(deadline, 201);
    }

    // PATCH - Completa scadenza
    if (event.httpMethod === 'PATCH' && deadlineId && segments[2] === 'completa') {
        const { data_completamento, costo, note } = JSON.parse(event.body);

        const deadline = await queryOne(
            `UPDATE vehicle_deadlines SET
                data_completamento = $1, costo = COALESCE($2, costo),
                note = COALESCE($3, note), stato = 'completato'
             WHERE id = $4 RETURNING *`,
            [data_completamento, costo, note, deadlineId]
        );

        await logActivity(user.id, 'UPDATE', 'vehicle_deadlines', deadlineId, 'Scadenza completata');
        return successResponse(deadline);
    }

    return errorResponse('Richiesta non valida', 400);
}

// ===================================
// GESTIONE MANUTENZIONI
// ===================================
async function handleMaintenance(segments, event, user) {
    const maintenanceId = segments[1];

    // GET - Lista manutenzioni
    if (event.httpMethod === 'GET' && !maintenanceId) {
        const params = event.queryStringParameters || {};
        const filters = [];
        const values = [];
        let paramCount = 0;

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
            `SELECT vm.*, v.targa as vehicle_targa, v.tipo as vehicle_tipo
             FROM vehicle_maintenance vm
             JOIN vehicles v ON vm.vehicle_id = v.id
             ${whereClause}
             ORDER BY vm.data_programmata DESC`,
            values
        );

        return successResponse(maintenance);
    }

    // POST - Crea manutenzione
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);

        const maintenance = await queryOne(
            `INSERT INTO vehicle_maintenance (
                vehicle_id, tipo, descrizione, data_programmata,
                km_manutenzione, fornitore, note, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                data.vehicle_id, data.tipo, data.descrizione,
                data.data_programmata || null, data.km_manutenzione || null,
                data.fornitore || null, data.note || null, user.id
            ]
        );

        await logActivity(user.id, 'CREATE', 'vehicle_maintenance', maintenance.id, `Manutenzione: ${data.descrizione}`);
        return successResponse(maintenance, 201);
    }

    // PATCH - Aggiorna manutenzione
    if (event.httpMethod === 'PATCH' && maintenanceId) {
        const data = JSON.parse(event.body);

        const maintenance = await queryOne(
            `UPDATE vehicle_maintenance SET
                stato = COALESCE($1, stato), data_inizio = COALESCE($2, data_inizio),
                data_completamento = COALESCE($3, data_completamento),
                costo = COALESCE($4, costo), note = COALESCE($5, note)
             WHERE id = $6 RETURNING *`,
            [data.stato, data.data_inizio, data.data_completamento, data.costo, data.note, maintenanceId]
        );

        await logActivity(user.id, 'UPDATE', 'vehicle_maintenance', maintenanceId, `Manutenzione aggiornata`);
        return successResponse(maintenance);
    }

    return errorResponse('Richiesta non valida', 400);
}

// ===================================
// GESTIONE DOCUMENTI
// ===================================
async function handleDocuments(segments, event, user) {
    const documentId = segments[1];

    // GET - Lista documenti
    if (event.httpMethod === 'GET' && !documentId) {
        const params = event.queryStringParameters || {};
        const filters = [];
        const values = [];
        let paramCount = 0;

        if (params.vehicle_id) {
            paramCount++;
            filters.push(`vd.vehicle_id = $${paramCount}`);
            values.push(params.vehicle_id);
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const documents = await query(
            `SELECT vd.*, v.targa as vehicle_targa, u.nome as user_nome
             FROM vehicle_documents vd
             JOIN vehicles v ON vd.vehicle_id = v.id
             LEFT JOIN users u ON vd.user_id = u.id
             ${whereClause}
             ORDER BY vd.created_at DESC`,
            values
        );

        return successResponse(documents);
    }

    // POST - Crea documento
    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);

        const document = await queryOne(
            `INSERT INTO vehicle_documents (
                vehicle_id, tipo, nome_file, file_path, file_size,
                mime_type, descrizione, data_scadenza, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                data.vehicle_id, data.tipo, data.nome_file, data.file_path,
                data.file_size || null, data.mime_type || null,
                data.descrizione || null, data.data_scadenza || null, user.id
            ]
        );

        await logActivity(user.id, 'CREATE', 'vehicle_documents', document.id, `Documento: ${data.nome_file}`);
        return successResponse(document, 201);
    }

    return errorResponse('Richiesta non valida', 400);
}
