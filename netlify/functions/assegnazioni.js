// ===================================
// ASSEGNAZIONI API - CON SUPPORTO MULTI-MATERIALE
// ===================================

const { query, queryOne, logActivity } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse, parsePath } = require('./utils/auth');
const { sendBulkAssignmentNotification, sendReturnNotification } = require('./utils/email');

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
                        v.nome as volunteer_nome, v.cognome as volunteer_cognome, v.gruppo as volunteer_gruppo,
                        a.email_inviata, a.email_inviata_at, a.quantita, a.data_rientro_prevista,
                        p.evento as prenotazione_evento,
                        p.richiedente as prenotazione_richiedente,
                        p.stato as prenotazione_stato
                 FROM assignments a
                 JOIN materials m ON a.material_id = m.id
                 JOIN volunteers v ON a.volunteer_id = v.id
                 LEFT JOIN prenotazioni_materiali p ON a.prenotazione_materiale_id = p.id
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
                        v.nome as volunteer_nome, v.cognome as volunteer_cognome,
                        a.quantita, a.data_rientro_prevista,
                        p.evento as prenotazione_evento,
                        p.richiedente as prenotazione_richiedente,
                        p.stato as prenotazione_stato
                 FROM assignments a
                 JOIN materials m ON a.material_id = m.id
                 JOIN volunteers v ON a.volunteer_id = v.id
                 LEFT JOIN prenotazioni_materiali p ON a.prenotazione_materiale_id = p.id
                 WHERE a.id = $1`,
                [assignmentId]
            );

            if (!assignment) {
                return errorResponse('Assegnazione non trovata', 404);
            }

            return successResponse(assignment);
        }

        // POST - Crea assegnazione (singola o multipla)
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            // Supporta sia formato singolo che array di materiali
            const isBatch = Array.isArray(data.materials);
            const materials = isBatch ? data.materials : [{ 
                material_id: data.material_id, 
                quantita: data.quantita || 1 
            }];

            // Dati comuni
            const volunteer_id = data.volunteer_id;
            const evento = data.evento;
            const data_uscita = data.data_uscita;
            const data_rientro_prevista = data.data_rientro_prevista || null;
            const note_uscita = data.note_uscita || null;
            const prenotazione_materiale_id = data.prenotazione_materiale_id || null; // <-- NUOVO CAMPO

            if (!volunteer_id || !evento || !data_uscita || materials.length === 0) {
                return errorResponse('Dati obbligatori mancanti');
            }

            const createdAssignments = [];
            const materialDetails = [];

            // Crea tutte le assegnazioni
            for (const mat of materials) {
                const material_id = mat.material_id;
                const quantita = parseInt(mat.quantita) || 1;

                if (!material_id) {
                    return errorResponse('Material_id mancante in uno dei materiali');
                }

                // Verifica disponibilità materiale
                const material = await queryOne(
                    `SELECT id, nome, codice_barre, quantita, quantita_assegnata, stato 
                     FROM materials 
                     WHERE id = $1`,
                    [material_id]
                );

                if (!material) {
                    return errorResponse(`Materiale ${material_id} non trovato`, 404);
                }

                const disponibili = (material.quantita || 0) - (material.quantita_assegnata || 0);
                
                if (quantita > disponibili) {
                    return errorResponse(`Quantità non disponibile per ${material.nome}. Disponibili: ${disponibili}, Richieste: ${quantita}`, 400);
                }

                // Crea assegnazione
                const assignment = await queryOne(
                    `INSERT INTO assignments (
                        material_id, volunteer_id, evento, quantita, 
                        data_uscita, data_rientro_prevista, note_uscita, 
                        user_id, stato, email_inviata, prenotazione_materiale_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'in_corso', false, $9)
                    RETURNING *`,
                    [
                        material_id,
                        volunteer_id,
                        evento,
                        quantita,
                        data_uscita,
                        data_rientro_prevista,
                        note_uscita,
                        user.id,
                        prenotazione_materiale_id  // <-- NUOVO PARAMETRO
                    ]
                );

                // Aggiorna quantità assegnata del materiale
                const nuovaQuantitaAssegnata = (material.quantita_assegnata || 0) + quantita;
                const tuttoAssegnato = nuovaQuantitaAssegnata >= material.quantita;
                
                await query(
                    `UPDATE materials 
                     SET quantita_assegnata = $1,
                         stato = CASE 
                             WHEN $2 THEN 'assegnato' 
                             ELSE stato 
                         END
                     WHERE id = $3`,
                    [nuovaQuantitaAssegnata, tuttoAssegnato, material_id]
                );

                await logActivity(
                    user.id,
                    'CREATE',
                    'assignments',
                    assignment.id,
                    `Assegnazione ${quantita}x ${material.nome} per: ${evento}`
                );

                createdAssignments.push(assignment);
                materialDetails.push({
                    nome: material.nome,
                    codice_barre: material.codice_barre,
                    quantita: quantita
                });
            }

            // Se le assegnazioni sono collegate a una prenotazione, aggiorna il suo stato
            if (prenotazione_materiale_id && createdAssignments.length > 0) {
                try {
                    await query(
                        `UPDATE prenotazioni_materiali
                         SET stato = 'assegnata',
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $1`,
                        [prenotazione_materiale_id]
                    );
                    console.log(`✅ Prenotazione ${prenotazione_materiale_id} aggiornata a stato 'assegnata'`);
                } catch (error) {
                    console.error(`⚠️ Errore aggiornamento prenotazione ${prenotazione_materiale_id}:`, error.message);
                    // Non blocchiamo l'assegnazione se l'update della prenotazione fallisce
                }
            }

            // Invia UNA SOLA email con tutti i materiali
            if (createdAssignments.length > 0) {
                try {
                    // Carica dettagli volontario
                    const volunteerDetails = await queryOne(
                        `SELECT nome, cognome, email FROM volunteers WHERE id = $1`,
                        [volunteer_id]
                    );

                    if (volunteerDetails && volunteerDetails.email) {
                        const emailResult = await sendBulkAssignmentNotification(
                            volunteerDetails.email,
                            `${volunteerDetails.nome} ${volunteerDetails.cognome}`,
                            materialDetails,
                            evento,
                            data_uscita,
                            note_uscita,
                            data_rientro_prevista
                        );
                        
                        if (emailResult.success) {
                            // Aggiorna stato email per tutte le assegnazioni
                            for (const assignment of createdAssignments) {
                                await query(
                                    `UPDATE assignments 
                                     SET email_inviata = true, email_inviata_at = CURRENT_TIMESTAMP 
                                     WHERE id = $1`,
                                    [assignment.id]
                                );
                            }
                            console.log('✅ Email assegnazione multipla inviata a:', volunteerDetails.email);
                        } else {
                            console.warn('⚠️ Email assegnazione non inviata:', emailResult.message);
                        }
                    } else {
                        console.log('ℹ️ Email non inviata: volontario senza email');
                    }
                } catch (emailError) {
                    console.error('❌ Errore invio email assegnazione:', emailError.message);
                    // Non blocchiamo l'assegnazione se l'email fallisce
                }
            }

            // Ritorna tutte le assegnazioni create o singola per retrocompatibilità
            if (isBatch) {
                return successResponse({ 
                    assignments: createdAssignments,
                    count: createdAssignments.length,
                    message: `${createdAssignments.length} assegnazione/i creata/e con successo`
                }, 201);
            } else {
                // Retrocompatibilità: se era richiesta singola, ritorna singola
                return successResponse(createdAssignments[0], 201);
            }
        }

        // PATCH - Registra rientro
        if (event.httpMethod === 'PATCH' && assignmentId && segments[1] === 'rientro') {
            const { data_rientro, stato, note_rientro } = JSON.parse(event.body);

            if (!data_rientro) {
                return errorResponse('Data rientro obbligatoria');
            }

            const currentAssignment = await queryOne(
                `SELECT * FROM assignments WHERE id = $1`,
                [assignmentId]
            );

            if (!currentAssignment) {
                return errorResponse('Assegnazione non trovata', 404);
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

            const material = await queryOne(
                `SELECT quantita, quantita_assegnata FROM materials WHERE id = $1`,
                [assignment.material_id]
            );

            const quantitaRientrata = assignment.quantita || 1;
            const nuovaQuantitaAssegnata = Math.max(0, (material.quantita_assegnata || 0) - quantitaRientrata);
            
            let newMaterialStatus;
            if (stato === 'danneggiato') {
                newMaterialStatus = 'in_manutenzione';
            } else if (nuovaQuantitaAssegnata === 0) {
                newMaterialStatus = 'disponibile';
            } else {
                newMaterialStatus = nuovaQuantitaAssegnata >= material.quantita ? 'assegnato' : 'disponibile';
            }

            await query(
                `UPDATE materials 
                 SET quantita_assegnata = $1, stato = $2 
                 WHERE id = $3`,
                [nuovaQuantitaAssegnata, newMaterialStatus, assignment.material_id]
            );

            // Se l'assegnazione era collegata a una prenotazione, aggiorna anche quella
            if (assignment.prenotazione_materiale_id) {
                try {
                    await query(
                        `UPDATE prenotazioni_materiali
                         SET stato = 'completata',
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $1`,
                        [assignment.prenotazione_materiale_id]
                    );
                    console.log(`✅ Prenotazione ${assignment.prenotazione_materiale_id} aggiornata a stato 'completata'`);
                } catch (error) {
                    console.error(`⚠️ Errore aggiornamento prenotazione ${assignment.prenotazione_materiale_id}:`, error.message);
                    // Non blocchiamo il rientro se l'update della prenotazione fallisce
                }
            }

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
                `Rientro ${quantitaRientrata}x materiale: ${stato}`
            );

            const returnDetails = await queryOne(
                `SELECT a.*, 
                        m.nome as material_nome, m.codice_barre,
                        v.nome as volunteer_nome, v.cognome as volunteer_cognome, v.email as volunteer_email
                 FROM assignments a
                 JOIN materials m ON a.material_id = m.id
                 JOIN volunteers v ON a.volunteer_id = v.id
                 WHERE a.id = $1`,
                [assignmentId]
            );

            if (returnDetails.volunteer_email) {
                try {
                    const emailResult = await sendReturnNotification(
                        returnDetails.volunteer_email,
                        `${returnDetails.volunteer_nome} ${returnDetails.volunteer_cognome}`,
                        returnDetails.material_nome,
                        returnDetails.codice_barre,
                        returnDetails.evento,
                        returnDetails.data_rientro,
                        returnDetails.stato
                    );
                    
                    if (emailResult.success) {
                        console.log('✅ Email rientro inviata a:', returnDetails.volunteer_email);
                    }
                } catch (emailError) {
                    console.error('❌ Errore invio email rientro:', emailError.message);
                }
            }

            return successResponse(assignment);
        }

        // DELETE
        if (event.httpMethod === 'DELETE' && assignmentId) {
            const assignment = await queryOne(
                `SELECT material_id, quantita FROM assignments WHERE id = $1`,
                [assignmentId]
            );

            if (assignment) {
                const material = await queryOne(
                    `SELECT quantita_assegnata FROM materials WHERE id = $1`,
                    [assignment.material_id]
                );

                if (material) {
                    const nuovaQuantitaAssegnata = Math.max(0, (material.quantita_assegnata || 0) - (assignment.quantita || 1));
                    await query(
                        `UPDATE materials SET quantita_assegnata = $1 WHERE id = $2`,
                        [nuovaQuantitaAssegnata, assignment.material_id]
                    );
                }
            }

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
