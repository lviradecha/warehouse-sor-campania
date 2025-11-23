// ===================================
// ASSIGNMENTS PAGE
// Gestione assegnazioni materiali
// ===================================

const AssignmentsPage = {
    assignments: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>Gestione Assegnazioni</h2>
                    <p>Uscite e rientri materiali</p>
                </div>
                <button class="btn btn-primary" onclick="AssignmentsPage.showAddModal()">
                    ➕ Nuova Assegnazione
                </button>
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
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Evento</th>
                        <th>Materiale</th>
                        <th>Volontario</th>
                        <th>Data Uscita</th>
                        <th>Data Rientro</th>
                        <th>Stato</th>
                        <th>Email</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.assignments.map(a => {
                        const emailStatus = a.email_inviata 
                            ? '<span title="Email inviata" style="color: #4CAF50;">✅</span>'
                            : '<span title="Email non inviata" style="color: #9E9E9E;">📧</span>';
                        
                        return `
                        <tr>
                            <td><strong>${a.evento}</strong></td>
                            <td>${a.material_nome || '-'}</td>
                            <td>${a.volunteer_nome || ''} ${a.volunteer_cognome || ''}</td>
                            <td>${UI.formatDateTime(a.data_uscita)}</td>
                            <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : '-'}</td>
                            <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                            <td>${emailStatus}</td>
                            <td>
                                ${a.stato === 'in_corso' ? `
                                    <button class="btn btn-sm btn-success" onclick="AssignmentsPage.showReturnModal(${a.id})">
                                        📥 Rientro
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    },
    
    async showAddModal() {
        try {
            // Carica materiali disponibili e volontari
            const materials = await API.materials.getAll({ stato: 'disponibile' });
            const volunteers = await API.volunteers.getAll({ attivo: 'true' });
            
            const modalContent = `
                <h3>Nuova Assegnazione</h3>
                <form id="addAssignmentForm">
                    <div class="form-group">
                        <label>Evento *</label>
                        <input type="text" name="evento" required class="form-control" 
                               placeholder="Es: Esercitazione Protezione Civile">
                    </div>
                    
                    <div class="form-group">
                        <label>Materiale *</label>
                        <select name="material_id" required class="form-control">
                            <option value="">Seleziona materiale...</option>
                            ${materials.materials.map(m => `
                                <option value="${m.id}">${m.nome} (${m.codice_barre})</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Volontario *</label>
                        <select name="volunteer_id" required class="form-control">
                            <option value="">Seleziona volontario...</option>
                            ${volunteers.map(v => `
                                <option value="${v.id}">${v.nome} ${v.cognome} - ${v.gruppo || ''}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Data/Ora Uscita *</label>
                        <input type="datetime-local" name="data_uscita" required class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Note Uscita</label>
                        <textarea name="note_uscita" class="form-control"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="invia_email" value="true" checked>
                            📧 Invia email di notifica al volontario
                        </label>
                        <small class="text-muted d-block mt-1">
                            Il volontario riceverà un'email con i dettagli dell'assegnazione
                        </small>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('addAssignmentForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                try {
                    UI.showLoading();
                    await API.assignments.create(data);
                    UI.closeModal();
                    UI.showToast('Assegnazione creata con successo', 'success');
                    await this.loadAssignments();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
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
                    <textarea name="note_rientro" class="form-control"></textarea>
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
    }
};
