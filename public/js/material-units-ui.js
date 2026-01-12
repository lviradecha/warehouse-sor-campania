// ===================================
// MATERIAL UNITS UI - LAYOUT COMPATTO
// Visualizzazione card verticale senza scroll
// ===================================

const MaterialUnitsUI = {
    
    // Modal per visualizzare e gestire unità
    async showUnitsModal(materialId) {
        try {
            UI.showLoading();
            
            // Carica materiale e unità
            const material = await API.materials.getById(materialId);
            const unitsResponse = await API.materials.getUnits(materialId);
            
            // Estrai array
            let units = [];
            if (Array.isArray(unitsResponse)) {
                units = unitsResponse;
            } else if (unitsResponse && Array.isArray(unitsResponse.data)) {
                units = unitsResponse.data;
            } else if (unitsResponse && Array.isArray(unitsResponse.units)) {
                units = unitsResponse.units;
            } else if (unitsResponse && typeof unitsResponse === 'object') {
                for (let key in unitsResponse) {
                    if (Array.isArray(unitsResponse[key])) {
                        units = unitsResponse[key];
                        break;
                    }
                }
            }
            
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
                        <!-- Layout CARD verticale compatto -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            ${units.map(u => `
                                <div class="card" style="
                                    padding: 15px;
                                    border-left: 4px solid ${u.stato === 'disponibile' ? '#28a745' : u.stato === 'assegnato' ? '#ffc107' : '#6c757d'};
                                    background: ${u.stato === 'disponibile' ? '#f0fff4' : u.stato === 'assegnato' ? '#fff8e1' : '#f5f5f5'};
                                ">
                                    <!-- Header con numero e stato -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="margin: 0; font-size: 18px;">
                                            #${u.numero_unita || '-'}
                                        </h4>
                                        <span class="badge badge-${u.stato === 'disponibile' ? 'success' : u.stato === 'assegnato' ? 'warning' : 'secondary'}" style="font-size: 11px;">
                                            ${u.stato === 'disponibile' ? '✅' : u.stato === 'assegnato' ? '📤' : '⚠️'} 
                                            ${u.stato.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <!-- Info principali -->
                                    <div style="margin-bottom: 12px;">
                                        <div style="margin-bottom: 6px;">
                                            <strong style="color: #666; font-size: 12px;">SERIALE:</strong><br>
                                            <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 13px; display: inline-block; margin-top: 2px;">
                                                ${u.seriale || '-'}
                                            </code>
                                        </div>
                                        
                                        ${u.selettiva ? `
                                        <div style="margin-bottom: 6px;">
                                            <strong style="color: #666; font-size: 12px;">SELETTIVA:</strong><br>
                                            <code style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 13px; display: inline-block; margin-top: 2px;">
                                                ${u.selettiva}
                                            </code>
                                        </div>
                                        ` : ''}
                                        
                                        ${u.assegnato_a ? `
                                        <div style="margin-bottom: 6px;">
                                            <strong style="color: #666; font-size: 12px;">ASSEGNATO A:</strong><br>
                                            <span style="color: #333; font-size: 13px; margin-top: 2px; display: inline-block;">
                                                👤 ${u.assegnato_a}
                                            </span>
                                        </div>
                                        ` : ''}
                                        
                                        ${u.note ? `
                                        <div style="margin-bottom: 6px;">
                                            <strong style="color: #666; font-size: 12px;">NOTE:</strong><br>
                                            <small style="color: #666; font-size: 12px; display: block; margin-top: 2px; line-height: 1.4;">
                                                ${u.note}
                                            </small>
                                        </div>
                                        ` : ''}
                                    </div>
                                    
                                    <!-- Azioni -->
                                    <div style="display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                                        <button class="btn btn-sm btn-secondary" 
                                                onclick="MaterialUnitsUI.showEditUnitForm(${materialId}, ${u.id})"
                                                style="flex: 1; font-size: 12px; padding: 6px 10px;"
                                                title="Modifica">
                                            ✏️ Modifica
                                        </button>
                                        <button class="btn btn-sm btn-danger" 
                                                onclick="MaterialUnitsUI.deleteUnit(${materialId}, ${u.id})"
                                                style="flex: 1; font-size: 12px; padding: 6px 10px;"
                                                title="Elimina">
                                            🗑️ Elimina
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
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
            const unitsResponse = await API.materials.getUnits(materialId);
            
            // Estrai array
            let units = [];
            if (Array.isArray(unitsResponse)) {
                units = unitsResponse;
            } else if (unitsResponse && Array.isArray(unitsResponse.data)) {
                units = unitsResponse.data;
            } else if (unitsResponse && Array.isArray(unitsResponse.units)) {
                units = unitsResponse.units;
            } else if (unitsResponse && typeof unitsResponse === 'object') {
                for (let key in unitsResponse) {
                    if (Array.isArray(unitsResponse[key])) {
                        units = unitsResponse[key];
                        break;
                    }
                }
            }
            
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
            await this.showUnitsModal(materialId);
            
        } catch (error) {
            UI.showToast(error.message || 'Errore durante l\'eliminazione', 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
