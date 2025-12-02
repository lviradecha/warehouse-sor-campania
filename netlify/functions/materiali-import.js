// ===================================
// MATERIALI IMPORT CSV API
// Import massivo materiali da CSV
// ===================================

const { query, queryOne, exists, logActivity } = require('./utils/db');
const { authenticate, requireOperator, successResponse, errorResponse } = require('./utils/auth');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    if (event.httpMethod !== 'POST') {
        return errorResponse('Metodo non permesso', 405);
    }

    try {
        const user = authenticate(event);
        requireOperator(user);

        const { materials, mode } = JSON.parse(event.body);
        // mode: 'add' = solo nuovi, 'update' = aggiorna esistenti, 'replace' = sostituisci tutto

        if (!Array.isArray(materials) || materials.length === 0) {
            return errorResponse('Nessun materiale da importare');
        }

        const results = {
            success: [],
            errors: [],
            skipped: [],
            stats: {
                total: materials.length,
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: 0
            }
        };

        // Verifica categorie esistenti
        const categories = await query(`SELECT id, nome FROM material_categories`);
        const categoryMap = new Map(categories.map(c => [c.nome.toLowerCase(), c.id]));

        for (let i = 0; i < materials.length; i++) {
            const row = materials[i];
            const rowNum = i + 2; // +2 perché CSV ha header e indice parte da 0

            try {
                // Validazione campi obbligatori
                if (!row.codice_barre || !row.nome) {
                    results.errors.push({
                        row: rowNum,
                        data: row,
                        error: 'Codice a barre e nome sono obbligatori'
                    });
                    results.stats.errors++;
                    continue;
                }

                // Pulizia e validazione dati
                const cleanData = {
                    codice_barre: String(row.codice_barre).trim(),
                    nome: String(row.nome).trim(),
                    descrizione: row.descrizione ? String(row.descrizione).trim() : null,
                    categoria_id: null,
                    quantita: parseInt(row.quantita) || 1,
                    stato: row.stato || 'disponibile',
                    data_acquisto: row.data_acquisto || null,
                    fornitore: row.fornitore ? String(row.fornitore).trim() : null,
                    costo: row.costo ? parseFloat(row.costo) : null,
                    posizione_magazzino: row.posizione_magazzino ? String(row.posizione_magazzino).trim() : null,
                    note: row.note ? String(row.note).trim() : null
                };

                // Validazione stato
                const validStati = ['disponibile', 'assegnato', 'in_manutenzione', 'fuori_servizio', 'dismesso'];
                if (!validStati.includes(cleanData.stato)) {
                    results.errors.push({
                        row: rowNum,
                        data: row,
                        error: `Stato non valido: ${cleanData.stato}. Valori ammessi: ${validStati.join(', ')}`
                    });
                    results.stats.errors++;
                    continue;
                }

                // Validazione quantità
                if (cleanData.quantita < 0) {
                    results.errors.push({
                        row: rowNum,
                        data: row,
                        error: 'Quantità deve essere >= 0'
                    });
                    results.stats.errors++;
                    continue;
                }

                // Risolvi categoria
                if (row.categoria) {
                    const catName = String(row.categoria).toLowerCase().trim();
                    if (categoryMap.has(catName)) {
                        cleanData.categoria_id = categoryMap.get(catName);
                    } else {
                        results.errors.push({
                            row: rowNum,
                            data: row,
                            error: `Categoria non trovata: ${row.categoria}. Categorie disponibili: ${Array.from(categoryMap.keys()).join(', ')}`
                        });
                        results.stats.errors++;
                        continue;
                    }
                }

                // Verifica se esiste già
                const existing = await queryOne(
                    `SELECT id, nome FROM materials WHERE codice_barre = $1`,
                    [cleanData.codice_barre]
                );

                if (existing) {
                    if (mode === 'add') {
                        // Modalità solo aggiunta - salta duplicati
                        results.skipped.push({
                            row: rowNum,
                            data: row,
                            reason: `Codice a barre già esistente: ${existing.nome}`
                        });
                        results.stats.skipped++;
                        continue;
                    } else if (mode === 'update' || mode === 'replace') {
                        // Aggiorna esistente
                        const updated = await queryOne(
                            `UPDATE materials SET
                                nome = $1,
                                descrizione = $2,
                                categoria_id = $3,
                                quantita = $4,
                                stato = $5,
                                data_acquisto = $6,
                                fornitore = $7,
                                costo = $8,
                                posizione_magazzino = $9,
                                note = $10,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE codice_barre = $11
                            RETURNING *`,
                            [
                                cleanData.nome,
                                cleanData.descrizione,
                                cleanData.categoria_id,
                                cleanData.quantita,
                                cleanData.stato,
                                cleanData.data_acquisto,
                                cleanData.fornitore,
                                cleanData.costo,
                                cleanData.posizione_magazzino,
                                cleanData.note,
                                cleanData.codice_barre
                            ]
                        );

                        await logActivity(
                            user.id,
                            'UPDATE',
                            'materials',
                            updated.id,
                            `Materiale aggiornato via import CSV: ${updated.nome}`
                        );

                        results.success.push({
                            row: rowNum,
                            action: 'updated',
                            material: updated
                        });
                        results.stats.updated++;
                    }
                } else {
                    // Crea nuovo materiale
                    const material = await queryOne(
                        `INSERT INTO materials (
                            codice_barre, nome, descrizione, categoria_id, quantita, quantita_assegnata,
                            stato, data_acquisto, fornitore, costo, posizione_magazzino, note
                        ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11)
                        RETURNING *`,
                        [
                            cleanData.codice_barre,
                            cleanData.nome,
                            cleanData.descrizione,
                            cleanData.categoria_id,
                            cleanData.quantita,
                            cleanData.stato,
                            cleanData.data_acquisto,
                            cleanData.fornitore,
                            cleanData.costo,
                            cleanData.posizione_magazzino,
                            cleanData.note
                        ]
                    );

                    await logActivity(
                        user.id,
                        'CREATE',
                        'materials',
                        material.id,
                        `Materiale creato via import CSV: ${material.nome}`
                    );

                    results.success.push({
                        row: rowNum,
                        action: 'created',
                        material: material
                    });
                    results.stats.imported++;
                }

            } catch (error) {
                console.error(`Errore riga ${rowNum}:`, error);
                results.errors.push({
                    row: rowNum,
                    data: row,
                    error: error.message
                });
                results.stats.errors++;
            }
        }

        // Log riepilogo import
        await logActivity(
            user.id,
            'IMPORT_CSV',
            'materials',
            null,
            `Import CSV completato: ${results.stats.imported} creati, ${results.stats.updated} aggiornati, ${results.stats.errors} errori`
        );

        return successResponse(results);

    } catch (error) {
        console.error('Errore import CSV:', error);
        
        if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
            return errorResponse(error.message, 401);
        }
        
        return errorResponse('Errore durante l\'import: ' + error.message, 500);
    }
};
