// ===================================
// MATERIAL UNITS UI
// Gestione interfaccia unità individuali
// ===================================

const MaterialUnitsUI = {
    
    // Modal per visualizzare e gestire unità
    async showUnitsModal(materialId) {
        try {
            UI.showLoading();
            
            // Carica materiale e unità
            const material = await API.materials.getById(materialId);
            const units = await API.materials.getUnits(materialId);
            
            const modalContent = `
                <div class="units-modal">
                    <h3>📦 ${material.nome}</h3>
                    <p style="margin-bottom: 20px;">
                        <strong>Codice Master:</strong> ${material.codice_barre} | 
                        <strong>Totale unità:</strong> ${units.length}/${material.quantita}
                    </p>
                    
                    ${units.length === 0 ? `
                        <div class="empty-state" style="padding: 40px; text-align: center; background: #f8f9fa; border-radius: 8px;">
                            <p style="font-size: 48px; margin-bottom: 10px;">📦</p>
                            <p style="color: #6c757d; margin-bottom: 20px;">Nessuna unità registrata</p>
                            <button class="btn btn-primary" onclick="MaterialUnitsUI.showAddUnitForm(${materialId})">
                                ➕ Aggiungi Prima Unità
                            </button>
                        </div>
                    ` : `
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Seriale</th>
                                        <th>Selettiva</th>
                                        <th>Stato</th>
                                        <th>Assegnato a</th>
                                        <th>Note</th>
                                        <th style="width: 100px;">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${units.map(u => `
                                        <tr>
                                            <td><strong>${u.numero_unita || '-'}</strong></td>
                                            <td><code>${u.seriale || '-'}</code></td>
                                            <td>${u.selettiva || '-'}</td>
                                            <td>
                                                <span class="badge badge-${u.stato === 'disponibile' ? 'success' : u.stato === 'assegnato' ? 'warning' : 'secondary'}">
                                                    ${u.stato === 'disponibile' ? '✅' : u.stato === 'assegnato' ? '📤' : '⚠️'} 
                                                    ${u.stato}
                                                </span>
                                            </td>
                                            <td>${u.assegnato_a || '-'}</td>
                                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                                                ${u.note ? `<small>${u.note}</small>` : '-'}
                                            </td>
                                            <td>
                                                <div class="action-buttons">
                                                    <button class="btn btn-sm btn-secondary btn-icon" 
                                                            onclick="MaterialUnitsUI.showEditUnitForm(${materialId}, ${u.id})"
                                                            title="Modifica">
                                                        ✏️
                                                    </button>
                                                    <button class="btn btn-sm btn-danger btn-icon" 
                                                            onclick="MaterialUnitsUI.deleteUnit(${materialId}, ${u.id})"
                                                            title="Elimina">
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="mt-3">
                            <button class="btn btn-primary" onclick="MaterialUnitsUI.showAddUnitForm(${materialId})">
                                ➕ Aggiungi Nuova Unità
                            </button>
                        </div>
                    `}
                </div>
            `;
            
            UI.showModal(modalContent, 'large');
            
        } catch (error) {
            UI.showToast('Errore caricamento unità', 'error');
            console.error(error);
        } finally {
            UI.hideLoading();
        }
    },
    
    // Form aggiunta nuova unità
    async showAddUnitForm(materialId) {
        const material = await API.materials.getById(materialId);
        
        const modalContent = `
            <h3>➕ Aggiungi Nuova Unità</h3>
            <p style="color: #6c757d; margin-bottom: 20px;">
                Materiale: <strong>${material.nome} (${material.codice_barre})</strong>
            </p>
            
            <form id="addUnitForm">
                <div class="form-group">
                    <label>Seriale/Matricola *</label>
                    <input type="text" 
                           name="seriale" 
                           required 
                           class="form-control" 
                           placeholder="es: 871TUXP249"
                           autocomplete="off">
                    <small class="text-muted">Matricola produttore o codice interno</small>
                </div>
                
                <div class="form-group">
                    <label>Selettiva <small class="text-muted">(opzionale, es. per radio)</small></label>
                    <input type="text" 
                           name="selettiva" 
                           class="form-control" 
                           placeholder="es: 80-79-01"
                           autocomplete="off">
                </div>
                
                <div class="form-group">
                    <label>Numero Unità <small class="text-muted">(opzionale, auto-generato se vuoto)</small></label>
                    <input type="number" 
                           name="numero_unita" 
                           class="form-control" 
                           placeholder="1, 2, 3..."
                           min="1">
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="note" 
                              class="form-control" 
                              rows="3"
                              placeholder="es: Acquistata il 15/12/2024, batteria nuova"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Aggiungi Unità</button>
                    <button type="button" class="btn btn-secondary" onclick="MaterialUnitsUI.showUnitsModal(${materialId})">
                        Annulla
                    </button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addUnitForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                UI.showLoading();
                
                await API.materials.addUnit(materialId, {
                    seriale: formData.get('seriale'),
                    selettiva: formData.get('selettiva') || null,
                    numero_unita: formData.get('numero_unita') ? parseInt(formData.get('numero_unita')) : null,
                    note: formData.get('note') || null
                });
                
                UI.showToast('Unità aggiunta con successo', 'success');
                
                // Ricarica modal unità
                await this.showUnitsModal(materialId);
                
            } catch (error) {
                UI.showToast(error.message || 'Errore durante l\'aggiunta', 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    // Form modifica unità
    async showEditUnitForm(materialId, unitId) {
        try {
            UI.showLoading();
            
            const material = await API.materials.getById(materialId);
            const units = await API.materials.getUnits(materialId);
            const unit = units.find(u => u.id === unitId);
            
            if (!unit) {
                throw new Error('Unità non trovata');
            }
            
            const modalContent = `
                <h3>✏️ Modifica Unità</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">
                    Materiale: <strong>${material.nome} (${material.codice_barre})</strong>
                </p>
                
                <form id="editUnitForm">
                    <div class="form-group">
                        <label>Seriale/Matricola *</label>
                        <input type="text" 
                               name="seriale" 
                               required 
                               class="form-control" 
                               value="${unit.seriale || ''}"
                               autocomplete="off">
                    </div>
                    
                    <div class="form-group">
                        <label>Selettiva</label>
                        <input type="text" 
                               name="selettiva" 
                               class="form-control" 
                               value="${unit.selettiva || ''}"
                               autocomplete="off">
                    </div>
                    
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="stato" class="form-control">
                            <option value="disponibile" ${unit.stato === 'disponibile' ? 'selected' : ''}>✅ Disponibile</option>
                            <option value="assegnato" ${unit.stato === 'assegnato' ? 'selected' : ''}>📤 Assegnato</option>
                            <option value="in_manutenzione" ${unit.stato === 'in_manutenzione' ? 'selected' : ''}>🔧 In Manutenzione</option>
                            <option value="fuori_servizio" ${unit.stato === 'fuori_servizio' ? 'selected' : ''}>❌ Fuori Servizio</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" 
                                  class="form-control" 
                                  rows="3">${unit.note || ''}</textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="MaterialUnitsUI.showUnitsModal(${materialId})">
                            Annulla
                        </button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editUnitForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                try {
                    UI.showLoading();
                    
                    await API.materials.updateUnit(materialId, unitId, {
                        seriale: formData.get('seriale'),
                        selettiva: formData.get('selettiva') || null,
                        stato: formData.get('stato'),
                        note: formData.get('note') || null
                    });
                    
                    UI.showToast('Unità aggiornata con successo', 'success');
                    
                    // Ricarica modal unità
                    await this.showUnitsModal(materialId);
                    
                } catch (error) {
                    UI.showToast(error.message || 'Errore durante l\'aggiornamento', 'error');
                } finally {
                    UI.hideLoading();
                }
            });
            
        } catch (error) {
            UI.showToast('Errore caricamento unità', 'error');
            console.error(error);
        } finally {
            UI.hideLoading();
        }
    },
    
    // Elimina unità
    async deleteUnit(materialId, unitId) {
        if (!confirm('Sei sicuro di voler eliminare questa unità?\n\nATTENZIONE: L\'operazione non può essere annullata.')) {
            return;
        }
        
        try {
            UI.showLoading();
            
            await API.materials.deleteUnit(materialId, unitId);
            
            UI.showToast('Unità eliminata con successo', 'success');
            
            // Ricarica modal unità
            await this.showUnitsModal(materialId);
            
        } catch (error) {
            UI.showToast(error.message || 'Errore durante l\'eliminazione', 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
