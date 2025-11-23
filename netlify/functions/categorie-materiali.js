// ===================================
// CATEGORIE MATERIALI API
// Gestione categorie materiali
// ===================================

const { query, queryOne, logActivity } = require('./utils/db');
const { authenticate, requireAdmin, successResponse, errorResponse, parsePath } = require('./utils/auth');

exports.handler = async (event) => {
    // Gestione CORS
    if (event.httpMethod === 'OPTIONS') {
        return successResponse({});
    }

    try {
        // Autenticazione obbligatoria
        const user = authenticate(event);

        const path = parsePath(event.path, 'categorie-materiali');
        const segments = path.split('/').filter(s => s);
        const categoriaId = segments[0];

        // GET - Lista categorie o singola categoria
        if (event.httpMethod === 'GET') {
            // GET singola categoria
            if (categoriaId) {
                const categoria = await queryOne(
                    `SELECT * FROM material_categories WHERE id = $1`,
                    [categoriaId]
                );

                if (!categoria) {
                    return errorResponse('Categoria non trovata', 404);
                }

                return successResponse(categoria);
            }

            // GET lista tutte le categorie (anche operatori possono vedere)
            const categorie = await query(
                `SELECT id, nome, descrizione, icona, colore, attiva 
                 FROM material_categories 
                 ORDER BY nome ASC`
            );

            return successResponse(categorie);
        }

        // Da qui in poi solo ADMIN può operare
        requireAdmin(user);

        // POST - Crea nuova categoria
        if (event.httpMethod === 'POST') {
            const data = JSON.parse(event.body);

            if (!data.nome) {
                return errorResponse('Nome categoria obbligatorio');
            }

            // Verifica unicità nome
            const exists = await queryOne(
                `SELECT id FROM material_categories WHERE nome = $1`,
                [data.nome]
            );

            if (exists) {
                return errorResponse('Categoria già esistente');
            }

            const nuovaCategoria = await queryOne(
                `INSERT INTO material_categories (nome, descrizione, icona, colore, attiva) 
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    data.nome,
                    data.descrizione || null,
                    data.icona || '📦',
                    data.colore || '#9E9E9E',
                    data.attiva !== false
                ]
            );

            await logActivity(
                user.id,
                'CREATE',
                'material_categories',
                nuovaCategoria.id,
                `Nuova categoria: ${nuovaCategoria.nome}`
            );

            return successResponse(nuovaCategoria, 201);
        }

        // PUT - Aggiorna categoria
        if (event.httpMethod === 'PUT' && categoriaId) {
            const data = JSON.parse(event.body);

            const categoriaAggiornata = await queryOne(
                `UPDATE material_categories 
                 SET nome = $1, 
                     descrizione = $2, 
                     icona = $3, 
                     colore = $4, 
                     attiva = $5
                 WHERE id = $6
                 RETURNING *`,
                [
                    data.nome,
                    data.descrizione,
                    data.icona,
                    data.colore,
                    data.attiva,
                    categoriaId
                ]
            );

            if (!categoriaAggiornata) {
                return errorResponse('Categoria non trovata', 404);
            }

            await logActivity(
                user.id,
                'UPDATE',
                'material_categories',
                categoriaId,
                `Categoria aggiornata: ${categoriaAggiornata.nome}`
            );

            return successResponse(categoriaAggiornata);
        }

        // DELETE - Elimina categoria (solo se non ha materiali)
        if (event.httpMethod === 'DELETE' && categoriaId) {
            // Verifica se ci sono materiali con questa categoria
            const materialiCount = await queryOne(
                `SELECT COUNT(*) as count FROM materials WHERE categoria_id = $1`,
                [categoriaId]
            );

            if (materialiCount.count > 0) {
                return errorResponse(`Impossibile eliminare: ${materialiCount.count} materiali usano questa categoria`);
            }

            const categoria = await queryOne(
                `SELECT nome FROM material_categories WHERE id = $1`,
                [categoriaId]
            );

            if (!categoria) {
                return errorResponse('Categoria non trovata', 404);
            }

            await query(`DELETE FROM material_categories WHERE id = $1`, [categoriaId]);

            await logActivity(
                user.id,
                'DELETE',
                'material_categories',
                categoriaId,
                `Categoria eliminata: ${categoria.nome}`
            );

            return successResponse({ message: 'Categoria eliminata' });
        }

        return errorResponse('Metodo non permesso', 405);

    } catch (error) {
        console.error('Errore API categorie materiali:', error);
        return errorResponse('Errore server', 500);
    }
};
