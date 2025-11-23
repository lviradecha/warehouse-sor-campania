// ===================================
// MAINTENANCE PAGE
// Gestione manutenzioni complete
// ===================================

const MaintenancePage = {
    maintenances: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>🔧 Gestione Manutenzioni</h2>
                    <p>Riparazioni, rotture e storico materiali</p>
                </div>
                <button class="btn btn-primary" onclick="MaintenancePage.showAddModal()">
                    ➕ Nuova Manutenzione
                </button>
            </div>

            <!-- Filtri -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Stato</label>
                            <select id="filterEsito" class="form-control">
                                <option value="">Tutti</option>
                                <option value="in_corso">In Corso</option>
                                <option value="riparato">Riparato</option>
                                <option value="non_riparabile">Non Riparabile</option>
                                <option value="dismesso">Dismesso</option>
                            </select>
                        </div>
                        <button class="btn btn-secondary" onclick="MaintenancePage.applyFilters()">
                            Filtra
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabella manutenzioni -->
            <div class="card">
                <div id="maintenanceTable"></div>
            </div>
        `;
        
        await this.loadMaintenances();
    },
    
    async loadMaintenances() {
        try {
            UI.showLoading();
            const filters = {};
            const esito = document.getElementById('filterEsito')?.value;
            if (esito) filters.esito = esito;
            
            this.maintenances = await API.maintenance.getAll(filters);
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore caricamento manutenzioni', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderTable() {
        const container = document.getElementById('maintenanceTable');
        if (this.maintenances.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessuna manutenzione trovata</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Materiale</th>
                        <th>Tipo</th>
                        <th>Descrizione</th>
                        <th>Data Inizio</th>
                        <th>Data Fine</th>
                        <th>Esito</th>
                        <th>Costo</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.maintenances.map(m => `
                        <tr>
                            <td><strong>${m.material_nome || '-'}</strong><br>
                                <small>${m.codice_barre || ''}</small>
                            </td>
                            <td><span class="badge">${m.tipo}</span></td>
                            <td>${m.descrizione}</td>
                            <td>${UI.formatDate(m.data_inizio)}</td>
                            <td>${m.data_fine ? UI.formatDate(m.data_fine) : '-'}</td>
                            <td><span class="badge badge-${m.esito}">${m.esito}</span></td>
                            <td>${m.costo ? UI.formatCurrency(m.costo) : '-'}</td>
                            <td>
                                ${m.esito === 'in_corso' ? `
                                    <button class="btn btn-sm btn-success" 
                                            onclick="MaintenancePage.showCompleteModal(${m.id})"
                                            title="Completa">
                                        ✓
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-secondary" 
                                        onclick="MaintenancePage.showDetailModal(${m.id})"
                                        title="Dettagli">
                                    👁️
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    applyFilters() {
        this.loadMaintenances();
    },
    
    async showAddModal() {
        try {
            // Carica materiali disponibili o in manutenzione
            const materials = await API.materials.getAll();
            
            const modalContent = `
                <h3>Nuova Manutenzione</h3>
                <form id="addMaintenanceForm">
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
                        <label>Tipo *</label>
                        <select name="tipo" required class="form-control">
                            <option value="rottura">Rottura</option>
                            <option value="manutenzione">Manutenzione Programmata</option>
                            <option value="riparazione">Riparazione</option>
                            <option value="dismissione">Dismissione</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Descrizione *</label>
                        <textarea name="descrizione" required class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data Inizio *</label>
                            <input type="date" name="data_inizio" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Costo Stimato (€)</label>
                            <input type="number" name="costo" step="0.01" min="0" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Fornitore Riparazione</label>
                        <input type="text" name="fornitore_riparazione" class="form-control">
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Crea Manutenzione</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('addMaintenanceForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                try {
                    UI.showLoading();
                    await API.maintenance.create(data);
                    UI.closeModal();
                    UI.showToast('Manutenzione creata con successo', 'success');
                    await this.loadMaintenances();
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
    
    async showCompleteModal(id) {
        const modalContent = `
            <h3>Completa Manutenzione</h3>
            <form id="completeForm">
                <div class="form-group">
                    <label>Data Fine *</label>
                    <input type="date" name="data_fine" required class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label>Esito *</label>
                    <select name="esito" required class="form-control">
                        <option value="riparato">✓ Riparato - Materiale OK</option>
                        <option value="non_riparabile">✗ Non Riparabile - Da Dismettere</option>
                        <option value="dismesso">🗑️ Dismesso</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Costo Finale (€)</label>
                    <input type="number" name="costo" step="0.01" min="0" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Note Finali</label>
                    <textarea name="note" class="form-control" rows="3"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-success">Completa Manutenzione</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('completeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.maintenance.complete(id, data);
                UI.closeModal();
                UI.showToast('Manutenzione completata', 'success');
                await this.loadMaintenances();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    async showDetailModal(id) {
        try {
            UI.showLoading();
            const maintenance = await API.maintenance.getById(id);
            
            const modalContent = `
                <h3>Dettaglio Manutenzione</h3>
                
                <div class="mb-3">
                    <strong>Materiale:</strong> ${maintenance.material_nome}<br>
                    <strong>Codice:</strong> <code>${maintenance.codice_barre}</code>
                </div>
                
                <div class="mb-3">
                    <strong>Tipo:</strong> <span class="badge">${maintenance.tipo}</span><br>
                    <strong>Esito:</strong> <span class="badge badge-${maintenance.esito}">${maintenance.esito}</span>
                </div>
                
                <div class="mb-3">
                    <strong>Descrizione:</strong><br>
                    ${maintenance.descrizione}
                </div>
                
                <div class="mb-3">
                    <strong>Data Inizio:</strong> ${UI.formatDate(maintenance.data_inizio)}<br>
                    <strong>Data Fine:</strong> ${maintenance.data_fine ? UI.formatDate(maintenance.data_fine) : 'In corso'}
                </div>
                
                ${maintenance.costo ? `<div class="mb-3"><strong>Costo:</strong> ${UI.formatCurrency(maintenance.costo)}</div>` : ''}
                ${maintenance.fornitore_riparazione ? `<div class="mb-3"><strong>Fornitore:</strong> ${maintenance.fornitore_riparazione}</div>` : ''}
                ${maintenance.user_nome ? `<div class="mb-3"><strong>Creato da:</strong> ${maintenance.user_nome} ${maintenance.user_cognome}</div>` : ''}
                
                <button class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
