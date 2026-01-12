// ===================================
// ASSIGNMENTS PAGE
// Gestione assegnazioni materiali
// CON PULSANTI DETTAGLI ED ELIMINA
// ===================================

const AssignmentsPage = {
    assignments: [],
    materialRows: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>Gestione Assegnazioni</h2>
                    <p>Uscite e rientri materiali</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success" onclick="AssignmentsPage.exportCSV()">
                        📥 Esporta CSV
                    </button>
                    <button class="btn btn-primary" onclick="AssignmentsPage.showAddModal()">
                        ➕ Nuova Assegnazione
                    </button>
                </div>
            </div>
            <div class="card">
                <div id="assignmentsTable"></div>
            </div>
        `;
        
        await this.loadAssignments();
    },
    
    async loadAssignments() {
        try {
            UI.showLoading();
            this.assignments = await API.assignments.getAll();
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore caricamento assegnazioni', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderTable() {
        const container = document.getElementById('assignmentsTable');
        if (this.assignments.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessuna assegnazione trovata</div>';
            return;
        }
        
        // Controlla ruolo utente
        const isAdmin = AuthManager.isAdmin();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Evento</th>
                        <th>Materiale</th>
                        <th>Quantità</th>
                        <th>Volontario</th>
                        <th>Data Uscita</th>
                        <th>Rientro Previsto</th>
                        <th>Data Rientro</th>
                        <th>Stato</th>
                        <th>Email</th>
                        <th style="width: 200px;">Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.assignments.map(a => {
                        const emailStatus = a.email_inviata 
                            ? '<span title="Email inviata" style="color: #4CAF50;">✅</span>'
                            : '<span title="Email non inviata" style="color: #9E9E9E;">📧</span>';
                        
                        // Calcola se il rientro è in ritardo
                        let rientroClass = '';
                        if (a.data_rientro_prevista && a.stato === 'in_corso') {
                            const oggi = new Date();
                            const previsto = new Date(a.data_rientro_prevista);
                            if (oggi > previsto) {
                                rientroClass = 'style="color: #d32f2f; font-weight: bold;"';
                            }
                        }
                        
                        return `
                        <tr>
                            <td><strong>${a.evento}</strong></td>
                            <td>${a.material_nome || '-'}</td>
                            <td style="text-align: center;"><strong>${a.quantita || 1}</strong></td>
                            <td>${a.volunteer_cognome || ''} ${a.volunteer_nome || ''}</td>
                            <td>${UI.formatDateTime(a.data_uscita)}</td>
                            <td ${rientroClass}>${a.data_rientro_prevista ? UI.formatDateTime(a.data_rientro_prevista) : '-'}</td>
                            <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : '-'}</td>
                            <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                            <td>${emailStatus}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-secondary btn-icon" 
                                            onclick="AssignmentsPage.showDetailModal(${a.id})"
                                            title="Dettagli">
                                        👁️
                                    </button>
                                    ${a.stato === 'in_corso' ? `
                                    <button class="btn btn-sm btn-success btn-icon" 
                                            onclick="AssignmentsPage.showReturnModal(${a.id})"
                                            title="Registra Rientro">
                                        🔙
                                    </button>
                                    ` : ''}
                                    ${isAdmin ? `
                                    <button class="btn btn-sm btn-danger btn-icon" 
                                            onclick="AssignmentsPage.deleteAssignment(${a.id})"
                                            title="Elimina">
                                        🗑️
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    },
    
    // NUOVO: Modal dettagli assegnazione
    async showDetailModal(id) {
        try {
            UI.showLoading();
            const assignment = await API.assignments.getById(id);
            
            const modalContent = `
                <h3>📋 Dettagli Assegnazione</h3>
                
                <div class="detail-grid">
                    <div class="detail-row">
                        <strong>Evento:</strong>
                        <span>${assignment.evento}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Materiale:</strong>
                        <span>${assignment.material_nome}<br><code>${assignment.codice_barre}</code></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Quantità:</strong>
                        <span><strong style="font-size: 1.2em;">${assignment.quantita || 1}</strong></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Volontario:</strong>
                        <span>${assignment.volunteer_cognome} ${assignment.volunteer_nome}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Data/Ora Uscita:</strong>
                        <span>${UI.formatDateTime(assignment.data_uscita)}</span>
                    </div>
                    
                    ${assignment.data_rientro_prevista ? `
                    <div class="detail-row">
                        <strong>Rientro Previsto:</strong>
                        <span>${UI.formatDateTime(assignment.data_rientro_prevista)}</span>
                    </div>
                    ` : ''}
                    
                    ${assignment.data_rientro ? `
                    <div class="detail-row">
                        <strong>Data Rientro:</strong>
                        <span>${UI.formatDateTime(assignment.data_rientro)}</span>
                    </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <strong>Stato:</strong>
                        <span><span class="badge badge-${assignment.stato}">${assignment.stato}</span></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Email Inviata:</strong>
                        <span>${assignment.email_inviata ? '✅ Si' : '❌ No'}
                        ${assignment.email_inviata_at ? `<br><small>Inviata: ${UI.formatDateTime(assignment.email_inviata_at)}</small>` : ''}</span>
                    </div>
                    
                    ${assignment.note_uscita ? `
                    <div class="detail-row">
                        <strong>Note Uscita:</strong>
                        <span>${assignment.note_uscita}</span>
                    </div>
                    ` : ''}
                    
                    ${assignment.note_rientro ? `
                    <div class="detail-row">
                        <strong>Note Rientro:</strong>
                        <span>${assignment.note_rientro}</span>
                    </div>
                    ` : ''}
                    
                    ${assignment.prenotazione_evento ? `
                    <div class="detail-row">
                        <strong>Collegata a Prenotazione:</strong>
                        <span>${assignment.prenotazione_evento}<br>
                        <small>Richiedente: ${assignment.prenotazione_richiedente || '-'}</small></span>
                    </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <strong>Creata il:</strong>
                        <span>${UI.formatDateTime(assignment.created_at)}</span>
                    </div>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    ${assignment.stato === 'in_corso' ? `
                    <button class="btn btn-success" onclick="AssignmentsPage.showReturnModal(${assignment.id})">
                        🔙 Registra Rientro
                    </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="UI.closeModal()">Chiudi</button>
                </div>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast('Errore caricamento dettagli', 'error');
            console.error(error);
        } finally {
            UI.hideLoading();
        }
    },
    
    // NUOVO: Elimina assegnazione
    async deleteAssignment(id) {
        if (!confirm('Sei sicuro di voler eliminare questa assegnazione?\n\nATTENZIONE: Questa operazione non può essere annullata e le quantità dei materiali verranno aggiornate.')) {
            return;
        }
        
        try {
            UI.showLoading();
            await API.assignments.delete(id);
            UI.showToast('Assegnazione eliminata con successo', 'success');
            await this.loadAssignments();
        } catch (error) {
            UI.showToast(error.message || 'Errore nell\'eliminazione', 'error');
            console.error(error);
        } finally {
            UI.hideLoading();
        }
    },
    
    async showAddModal() {
        try {
            // Carica materiali disponibili e volontari
            const materials = await API.materials.getAll({ stato: 'disponibile' });
            const volunteers = await API.volunteers.getAll({ attivo: 'true' });
            
            // Reset righe materiali
            this.materialRows = [];
            
            const modalContent = `
                <h3>Nuova Assegnazione</h3>
                <form id="addAssignmentForm">
                    <div class="form-group">
                        <label>Evento *</label>
                        <input type="text" name="evento" required class="form-control" 
                               placeholder="Es: Esercitazione Protezione Civile">
                    </div>
                    
                    <div class="form-group">
                        <label>Volontario *</label>
                        <select name="volunteer_id" required class="form-control">
                            <option value="">Seleziona volontario...</option>
                            ${volunteers.map(v => `
                                <option value="${v.id}">${v.cognome} ${v.nome} - ${v.gruppo || ''}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Materiali *</label>
                        <div id="materialsContainer" style="border: 1px solid #ddd; padding: 15px; border-radius: 4px; background: #f9f9f9;">
                            <!-- Le righe materiali saranno inserite qui -->
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary mt-2" onclick="AssignmentsPage.addMaterialRow()">
                            ➕ Aggiungi altro materiale
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <label>Data/Ora Uscita *</label>
                        <input type="datetime-local" name="data_uscita" required class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Data/Ora Rientro Prevista</label>
                        <input type="datetime-local" name="data_rientro_prevista" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Note Uscita</label>
                        <textarea name="note_uscita" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" name="invia_email" value="true" checked>
                            <span>Invia email di notifica al volontario</span>
                        </label>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Crea Assegnazione</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            // Aggiungi prima riga materiale
            await this.addMaterialRow();
            
            // Setup form submit
            document.getElementById('addAssignmentForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmitAssignment(e);
            });
            
        } catch (error) {
            UI.showToast('Errore caricamento form', 'error');
            console.error(error);
        }
    },
    
    async addMaterialRow() {
        try {
            const materials = await API.materials.getAll({});
            const container = document.getElementById('materialsContainer');
            const rowIndex = this.materialRows.length;
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'material-row';
            rowDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start;';
            rowDiv.dataset.rowIndex = rowIndex;
            
            // Crea HTML con select vuoto (lo popoleremo dopo con optgroup)
            rowDiv.innerHTML = `
                <div style="flex: 2;">
                    <select name="materials[${rowIndex}][material_id]" required class="form-control material-select" data-row="${rowIndex}">
                        <option value="">Seleziona materiale...</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <input type="number" 
                           name="materials[${rowIndex}][quantita]" 
                           class="form-control quantita-input" 
                           data-row="${rowIndex}"
                           value="1" 
                           min="1" 
                           required 
                           placeholder="Qtà">
                    <small class="text-muted quantita-help" data-row="${rowIndex}"></small>
                </div>
                ${rowIndex > 0 ? `
                    <button type="button" class="btn btn-sm btn-danger" onclick="AssignmentsPage.removeMaterialRow(${rowIndex})" title="Rimuovi materiale">
                        ✖
                    </button>
                ` : '<div style="width: 36px;"></div>'}
            `;
            
            container.appendChild(rowDiv);
            this.materialRows.push(rowDiv);
            
            // Popola il select RAGGRUPPATO PER CATEGORIA
            const selectElement = rowDiv.querySelector('.material-select');
            
            // Raggruppa materiali per categoria
            const materialiPerCategoria = {};
            materials.materials.forEach(m => {
                const categoria = m.categoria_nome || 'Altro';
                if (!materialiPerCategoria[categoria]) {
                    materialiPerCategoria[categoria] = [];
                }
                materialiPerCategoria[categoria].push(m);
            });
            
            // Ordina le categorie alfabeticamente
            const categorieOrdinate = Object.keys(materialiPerCategoria).sort();
            
            // Crea optgroup per ogni categoria
            categorieOrdinate.forEach(categoria => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = categoria;
                
                // Ordina i materiali dentro la categoria per nome
                materialiPerCategoria[categoria]
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .forEach(m => {
                        const disponibili = (m.quantita || 0) - (m.quantita_assegnata || 0);
                        const option = document.createElement('option');
                        option.value = m.id;
                        option.textContent = `${m.nome} (${m.codice_barre}) - Disponibili: ${disponibili}`;
                        option.setAttribute('data-disponibili', disponibili);
                        option.setAttribute('data-nome', m.nome);
                        option.setAttribute('data-codice', m.codice_barre);
                        optgroup.appendChild(option);
                    });
                
                selectElement.appendChild(optgroup);
            });
            
            // Aggiungi event listener per validazione quantità
            const select = rowDiv.querySelector('.material-select');
            const quantitaInput = rowDiv.querySelector('.quantita-input');
            const quantitaHelp = rowDiv.querySelector('.quantita-help');
            
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const disponibili = parseInt(selectedOption.getAttribute('data-disponibili')) || 0;
                
                quantitaInput.max = disponibili;
                quantitaInput.value = Math.min(1, disponibili);
                
                if (disponibili > 0) {
                    quantitaHelp.textContent = `Max: ${disponibili}`;
                    quantitaHelp.style.color = '#28a745';
                } else {
                    quantitaHelp.textContent = 'Non disponibile';
                    quantitaHelp.style.color = '#dc3545';
                }
            });
            
        } catch (error) {
            UI.showToast('Errore caricamento materiali', 'error');
        }
    },
    
    removeMaterialRow(rowIndex) {
        const row = document.querySelector(`.material-row[data-row-index="${rowIndex}"]`);
        if (row) {
            row.remove();
            this.materialRows = this.materialRows.filter((r, i) => i !== rowIndex);
        }
    },
    
    async handleSubmitAssignment(e) {
        const formData = new FormData(e.target);
        
        // Estrai dati comuni
        const commonData = {
            evento: formData.get('evento'),
            volunteer_id: formData.get('volunteer_id'),
            data_uscita: formData.get('data_uscita'),
            data_rientro_prevista: formData.get('data_rientro_prevista') || null,
            note_uscita: formData.get('note_uscita'),
            invia_email: formData.get('invia_email') === 'true'
        };
        
        // Estrai materiali
        const materials = [];
        let rowIndex = 0;
        
        while (formData.get(`materials[${rowIndex}][material_id]`)) {
            const materialId = formData.get(`materials[${rowIndex}][material_id]`);
            const quantita = parseInt(formData.get(`materials[${rowIndex}][quantita]`));
            
            if (materialId && quantita > 0) {
                // Valida quantità disponibile
                const selectElement = document.querySelector(`.material-select[data-row="${rowIndex}"]`);
                const selectedOption = selectElement.options[selectElement.selectedIndex];
                const disponibili = parseInt(selectedOption.getAttribute('data-disponibili')) || 0;
                
                if (quantita > disponibili) {
                    UI.showToast(`Quantità non disponibile per ${selectedOption.getAttribute('data-nome')}. Massimo: ${disponibili}`, 'error');
                    return;
                }
                
                materials.push({
                    material_id: materialId,
                    quantita: quantita
                });
            }
            rowIndex++;
        }
        
        if (materials.length === 0) {
            UI.showToast('Seleziona almeno un materiale', 'error');
            return;
        }
        
        try {
            UI.showLoading();
            
            // Crea UN'UNICA assegnazione con TUTTI i materiali (per email consolidata)
            const result = await API.assignments.create({
                ...commonData,
                materials: materials // Invia array di materiali
            });
            
            UI.closeModal();
            UI.showToast(`${materials.length} assegnazione/i creata/e con successo`, 'success');
            await this.loadAssignments();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    showReturnModal(id) {
        const modalContent = `
            <h3>Registra Rientro Materiale</h3>
            <form id="returnForm">
                <div class="form-group">
                    <label>Data/Ora Rientro *</label>
                    <input type="datetime-local" name="data_rientro" required class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Condizioni</label>
                    <select name="stato" class="form-control">
                        <option value="rientrato">OK - Materiale integro</option>
                        <option value="danneggiato">Danneggiato - Richiede manutenzione</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Note Rientro</label>
                    <textarea name="note_rientro" class="form-control" rows="3"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-success">Conferma Rientro</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('returnForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.assignments.returnMaterial(id, data);
                UI.closeModal();
                UI.showToast('Rientro registrato con successo', 'success');
                await this.loadAssignments();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    exportCSV() {
        if (this.assignments.length === 0) {
            UI.showToast('Nessuna assegnazione da esportare', 'warning');
            return;
        }
        
        const headers = [
            'Evento', 'Materiale', 'Codice Barre', 'Quantità', 'Volontario Cognome',
            'Volontario Nome', 'Comitato', 'Data Uscita', 'Rientro Previsto', 'Data Rientro', 
            'Stato', 'Email Inviata', 'Note Uscita', 'Note Rientro'
        ];
        
        const rows = this.assignments.map(a => [
            (a.evento || '').replace(/"/g, '""'),
            a.material_nome || '',
            a.codice_barre || '',
            a.quantita || 1,
            a.volunteer_cognome || '',
            a.volunteer_nome || '',
            a.volunteer_gruppo || '',
            a.data_uscita || '',
            a.data_rientro_prevista || '',
            a.data_rientro || '',
            a.stato || '',
            a.email_inviata ? 'Si' : 'No',
            (a.note_uscita || '').replace(/"/g, '""'),
            (a.note_rientro || '').replace(/"/g, '""')
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `assegnazioni_CRI_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showToast(`${this.assignments.length} assegnazioni esportate`, 'success');
    }
};