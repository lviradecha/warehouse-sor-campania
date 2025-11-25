// ===================================
// VEHICLES PAGE
// Gestione Automezzi CRI con Permessi e Rifornimenti
// ===================================

const VehiclesPage = {
    vehicles: [],
    currentView: 'vehicles',
    isAdmin: false,
    
    async init() {
        // Verifica ruolo utente
        this.isAdmin = AuthManager.isAdmin();
        
        const container = document.getElementById('vehiclesPage');
        
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>🚗 Gestione Automezzi</h2>
                    <p>Parco veicoli e assegnazioni</p>
                </div>
            </div>
            
            <!-- Tab Navigation -->
            <div class="tabs-nav mb-3">
                <button class="tab-btn active" onclick="VehiclesPage.switchTab('vehicles')">
                    🚗 Automezzi
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('assignments')">
                    📋 Assegnazioni
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('refueling')">
                    ⛽ Rifornimenti
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('maintenance')">
                    🔧 Manutenzioni
                </button>
            </div>
            
            <!-- Tab Content -->
            <div id="tabContent"></div>
        `;
        
        this.switchTab('vehicles');
    },
    
    switchTab(tab) {
        this.currentView = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event?.target?.classList.add('active');
        
        switch(tab) {
            case 'vehicles':
                this.renderVehiclesTab();
                break;
            case 'assignments':
                this.renderAssignmentsTab();
                break;
            case 'refueling':
                this.renderRefuelingTab();
                break;
            case 'maintenance':
                this.renderMaintenanceTab();
                break;
        }
    },
    
    // ===================================
    // TAB: AUTOMEZZI
    // ===================================
    async renderVehiclesTab() {
        const container = document.getElementById('tabContent');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Lista Automezzi</h3>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-success" onclick="VehiclesPage.exportVehiclesCSV()">
                            📥 Esporta CSV
                        </button>
                        ${this.isAdmin ? `
                            <button class="btn btn-primary" onclick="VehiclesPage.showAddVehicleModal()">
                                ➕ Nuovo Automezzo
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${!this.isAdmin ? '<div class="alert alert-info m-3">ℹ️ Solo gli amministratori possono aggiungere o modificare automezzi</div>' : ''}
                <div id="vehiclesTableContainer"></div>
            </div>
        `;
        
        await this.loadVehicles();
    },
    
    async loadVehicles() {
        try {
            UI.showLoading();
            this.vehicles = await API.vehicles.getAll();
            this.renderVehiclesTable();
        } catch (error) {
            UI.showToast('Errore caricamento automezzi', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderVehiclesTable() {
        const container = document.getElementById('vehiclesTableContainer');
        
        if (this.vehicles.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun automezzo trovato</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Modello</th>
                        <th>Targa</th>
                        <th>Anno</th>
                        <th>Km Attuali</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.vehicles.map(v => `
                        <tr>
                            <td><strong>${v.tipo}</strong></td>
                            <td>${v.modello}</td>
                            <td><span style="font-family: monospace; font-weight: bold;">${v.targa}</span></td>
                            <td>${v.anno_immatricolazione || '-'}</td>
                            <td style="text-align: right;">${(v.km_attuali || 0).toLocaleString()} km</td>
                            <td><span class="badge badge-${v.stato}">${v.stato}</span></td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="VehiclesPage.showVehicleDetails(${v.id})" title="Dettagli">
                                    👁️
                                </button>
                                ${this.isAdmin ? `
                                    <button class="btn btn-sm btn-primary" onclick="VehiclesPage.showEditVehicleModal(${v.id})" title="Modifica">
                                        ✏️
                                    </button>
                                ` : ''}
                                ${v.stato === 'disponibile' ? `
                                    <button class="btn btn-sm btn-success" onclick="VehiclesPage.showAssignVehicleModal(${v.id})" title="Assegna">
                                        🔑
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    async showAddVehicleModal() {
        if (!this.isAdmin) {
            UI.showToast('Solo gli amministratori possono aggiungere automezzi', 'error');
            return;
        }
        
        const modalContent = `
            <h3>Nuovo Automezzo</h3>
            <form id="addVehicleForm">
                <div class="form-group">
                    <label>Tipo Automezzo *</label>
                    <select name="tipo" required class="form-control">
                        <option value="">Seleziona tipo...</option>
                        <option value="Ambulanza">🚑 Ambulanza</option>
                        <option value="Furgone">🚐 Furgone</option>
                        <option value="Auto">🚗 Auto</option>
                        <option value="Fuoristrada">🚙 Fuoristrada</option>
                        <option value="Moto">🏍️ Moto</option>
                        <option value="Altro">📦 Altro</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Modello *</label>
                    <input type="text" name="modello" required class="form-control" 
                           placeholder="Es: Fiat Ducato 2.3">
                </div>
                
                <div class="form-group">
                    <label>Targa *</label>
                    <input type="text" name="targa" required class="form-control" 
                           placeholder="Es: AB123CD" style="text-transform: uppercase;">
                </div>
                
                <div class="form-group">
                    <label>Anno Immatricolazione</label>
                    <input type="number" name="anno_immatricolazione" class="form-control" 
                           min="1990" max="2025" placeholder="Es: 2020">
                </div>
                
                <div class="form-group">
                    <label>Chilometraggio Iniziale</label>
                    <input type="number" name="km_attuali" class="form-control" 
                           value="0" min="0" step="1">
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="note" class="form-control" rows="3"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Salva Automezzo</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addVehicleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.targa = data.targa.toUpperCase();
            
            try {
                UI.showLoading();
                await API.vehicles.create(data);
                UI.closeModal();
                UI.showToast('Automezzo creato con successo', 'success');
                await this.loadVehicles();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    async showEditVehicleModal(id) {
        if (!this.isAdmin) {
            UI.showToast('Solo gli amministratori possono modificare automezzi', 'error');
            return;
        }
        
        try {
            UI.showLoading();
            const vehicle = await API.vehicles.getById(id);
            
            const modalContent = `
                <h3>Modifica Automezzo</h3>
                <form id="editVehicleForm">
                    <div class="form-group">
                        <label>Tipo Automezzo *</label>
                        <select name="tipo" required class="form-control">
                            <option value="Ambulanza" ${vehicle.tipo === 'Ambulanza' ? 'selected' : ''}>🚑 Ambulanza</option>
                            <option value="Furgone" ${vehicle.tipo === 'Furgone' ? 'selected' : ''}>🚐 Furgone</option>
                            <option value="Auto" ${vehicle.tipo === 'Auto' ? 'selected' : ''}>🚗 Auto</option>
                            <option value="Fuoristrada" ${vehicle.tipo === 'Fuoristrada' ? 'selected' : ''}>🚙 Fuoristrada</option>
                            <option value="Moto" ${vehicle.tipo === 'Moto' ? 'selected' : ''}>🏍️ Moto</option>
                            <option value="Altro" ${vehicle.tipo === 'Altro' ? 'selected' : ''}>📦 Altro</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Modello *</label>
                        <input type="text" name="modello" required class="form-control" value="${vehicle.modello}">
                    </div>
                    
                    <div class="form-group">
                        <label>Targa *</label>
                        <input type="text" name="targa" required class="form-control" 
                               value="${vehicle.targa}" style="text-transform: uppercase;">
                    </div>
                    
                    <div class="form-group">
                        <label>Anno Immatricolazione</label>
                        <input type="number" name="anno_immatricolazione" class="form-control" 
                               value="${vehicle.anno_immatricolazione || ''}" min="1990" max="2025">
                    </div>
                    
                    <div class="form-group">
                        <label>Chilometraggio Attuale *</label>
                        <input type="number" name="km_attuali" class="form-control" 
                               value="${vehicle.km_attuali || 0}" min="0" step="1">
                        <small class="text-muted">⚠️ Modifica solo se necessario correggere il valore</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="stato" class="form-control">
                            <option value="disponibile" ${vehicle.stato === 'disponibile' ? 'selected' : ''}>Disponibile</option>
                            <option value="in_uso" ${vehicle.stato === 'in_uso' ? 'selected' : ''}>In Uso</option>
                            <option value="in_manutenzione" ${vehicle.stato === 'in_manutenzione' ? 'selected' : ''}>In Manutenzione</option>
                            <option value="fuori_servizio" ${vehicle.stato === 'fuori_servizio' ? 'selected' : ''}>Fuori Servizio</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" class="form-control" rows="3">${vehicle.note || ''}</textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editVehicleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                data.targa = data.targa.toUpperCase();
                
                try {
                    UI.showLoading();
                    await API.vehicles.update(id, data);
                    UI.closeModal();
                    UI.showToast('Automezzo aggiornato con successo', 'success');
                    await this.loadVehicles();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async showVehicleDetails(id) {
        try {
            UI.showLoading();
            const vehicle = await API.vehicles.getById(id);
            const assignments = await API.vehicles.getAssignments(id);
            
            const modalContent = `
                <h3>Dettagli Automezzo</h3>
                <div class="vehicle-details">
                    <table class="table-details">
                        <tr>
                            <th>Tipo:</th>
                            <td><strong>${vehicle.tipo}</strong></td>
                        </tr>
                        <tr>
                            <th>Modello:</th>
                            <td>${vehicle.modello}</td>
                        </tr>
                        <tr>
                            <th>Targa:</th>
                            <td><span style="font-family: monospace; font-weight: bold; font-size: 1.2em;">${vehicle.targa}</span></td>
                        </tr>
                        <tr>
                            <th>Anno:</th>
                            <td>${vehicle.anno_immatricolazione || '-'}</td>
                        </tr>
                        <tr>
                            <th>Chilometraggio:</th>
                            <td><strong>${(vehicle.km_attuali || 0).toLocaleString()} km</strong></td>
                        </tr>
                        <tr>
                            <th>Stato:</th>
                            <td><span class="badge badge-${vehicle.stato}">${vehicle.stato}</span></td>
                        </tr>
                        <tr>
                            <th>Note:</th>
                            <td>${vehicle.note || '-'}</td>
                        </tr>
                    </table>
                    
                    <h4 class="mt-3">Ultime Assegnazioni</h4>
                    ${assignments.length > 0 ? `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Volontario</th>
                                    <th>Data Uscita</th>
                                    <th>Data Rientro</th>
                                    <th>Km</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignments.slice(0, 5).map(a => `
                                    <tr>
                                        <td>${a.volunteer_nome} ${a.volunteer_cognome}</td>
                                        <td>${UI.formatDateTime(a.data_uscita)}</td>
                                        <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : '<span class="badge badge-in_corso">In corso</span>'}</td>
                                        <td>${a.km_percorsi ? a.km_percorsi + ' km' : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-muted">Nessuna assegnazione trovata</p>'}
                </div>
                
                <button type="button" class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async showAssignVehicleModal(vehicleId) {
        try {
            UI.showLoading();
            const vehicle = await API.vehicles.getById(vehicleId);
            const volunteers = await API.volunteers.getAll({ attivo: 'true' });
            UI.hideLoading();
            
            const modalContent = `
                <h3>Assegna Automezzo</h3>
                <div class="alert alert-info mb-3">
                    <strong>Automezzo:</strong> ${vehicle.tipo} - ${vehicle.modello} (${vehicle.targa})
                </div>
                
                <form id="assignVehicleForm">
                    <input type="hidden" name="vehicle_id" value="${vehicleId}">
                    
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
                        <label>Motivo/Evento *</label>
                        <input type="text" name="motivo" required class="form-control" 
                               placeholder="Es: Servizio emergenza 118">
                    </div>
                    
                    <div class="form-group">
                        <label>Data/Ora Uscita *</label>
                        <input type="datetime-local" name="data_uscita" required class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Chilometraggio Partenza *</label>
                        <input type="number" name="km_partenza" required class="form-control" 
                               value="${vehicle.km_attuali || 0}" min="0" step="1">
                        <small class="text-muted">Km attuali: ${(vehicle.km_attuali || 0).toLocaleString()}</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="card_carburante" value="true">
                            ⛽ <strong>Card Carburante consegnata</strong>
                        </label>
                        <small class="text-muted d-block mt-1">
                            Seleziona se è stata consegnata anche la tessera carburante
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label>Note Uscita</label>
                        <textarea name="note_uscita" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Conferma Assegnazione</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('assignVehicleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                data.card_carburante = formData.get('card_carburante') === 'true';
                
                try {
                    UI.showLoading();
                    await API.vehicles.assign(data);
                    UI.closeModal();
                    UI.showToast('Automezzo assegnato con successo', 'success');
                    await this.loadVehicles();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
            UI.hideLoading();
        }
    },
    
    exportVehiclesCSV() {
        if (this.vehicles.length === 0) {
            UI.showToast('Nessun automezzo da esportare', 'warning');
            return;
        }
        
        const headers = ['Tipo', 'Modello', 'Targa', 'Anno', 'Km Attuali', 'Stato', 'Note'];
        const rows = this.vehicles.map(v => [
            v.tipo, v.modello, v.targa,
            v.anno_immatricolazione || '', v.km_attuali || 0, v.stato,
            (v.note || '').replace(/"/g, '""')
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
        link.setAttribute('download', `automezzi_CRI_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showToast(`${this.vehicles.length} automezzi esportati`, 'success');
    },
    
    // ===================================
    // TAB: ASSEGNAZIONI
    // ===================================
    async renderAssignmentsTab() {
        const container = document.getElementById('tabContent');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Assegnazioni Automezzi</h3>
                </div>
                <div id="vehicleAssignmentsContainer"></div>
            </div>
        `;
        
        await this.loadVehicleAssignments();
    },
    
    async loadVehicleAssignments() {
        try {
            UI.showLoading();
            const assignments = await API.vehicles.getAllAssignments();
            this.renderVehicleAssignmentsTable(assignments);
        } catch (error) {
            UI.showToast('Errore caricamento assegnazioni', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderVehicleAssignmentsTable(assignments) {
        const container = document.getElementById('vehicleAssignmentsContainer');
        
        if (assignments.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessuna assegnazione trovata</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Automezzo</th>
                        <th>Volontario</th>
                        <th>Motivo</th>
                        <th>Data Uscita</th>
                        <th>Data Rientro</th>
                        <th>Km</th>
                        <th>Card</th>
                        <th>Carb.</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${assignments.map(a => `
                        <tr>
                            <td><strong>${a.vehicle_targa}</strong></td>
                            <td>${a.volunteer_nome} ${a.volunteer_cognome}</td>
                            <td>${a.motivo}</td>
                            <td>${UI.formatDateTime(a.data_uscita)}</td>
                            <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : '-'}</td>
                            <td>${a.km_percorsi ? a.km_percorsi + ' km' : '-'}</td>
                            <td style="text-align: center;">
                                ${a.card_carburante ? '<span style="color: #4CAF50;" title="Card consegnata">⛽✅</span>' : '<span style="color: #9E9E9E;">-</span>'}
                            </td>
                            <td>${a.livello_carburante_rientro || '-'}</td>
                            <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                            <td>
                                ${a.stato === 'in_corso' ? `
                                    <button class="btn btn-sm btn-success" onclick="VehiclesPage.showReturnVehicleModal(${a.id})">
                                        🔙 Rientro
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    async showReturnVehicleModal(assignmentId) {
        try {
            UI.showLoading();
            const assignment = await API.vehicles.getAssignment(assignmentId);
            UI.hideLoading();
            
            const modalContent = `
                <h3>Registra Rientro Automezzo</h3>
                <div class="alert alert-info mb-3">
                    <strong>Automezzo:</strong> ${assignment.vehicle_targa}<br>
                    <strong>Volontario:</strong> ${assignment.volunteer_nome} ${assignment.volunteer_cognome}<br>
                    <strong>Km Partenza:</strong> ${assignment.km_partenza.toLocaleString()}
                </div>
                
                <form id="returnVehicleForm">
                    <div class="form-group">
                        <label>Data/Ora Rientro *</label>
                        <input type="datetime-local" name="data_rientro" required class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Chilometraggio Arrivo *</label>
                        <input type="number" name="km_arrivo" required class="form-control" 
                               min="${assignment.km_partenza}" step="1">
                        <small class="text-muted">Inserisci il chilometraggio al rientro</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Livello Carburante al Rientro *</label>
                        <select name="livello_carburante_rientro" required class="form-control">
                            <option value="">Seleziona livello...</option>
                            <option value="Pieno">⛽⛽⛽⛽ Pieno</option>
                            <option value="3/4">⛽⛽⛽ 3/4</option>
                            <option value="1/2">⛽⛽ 1/2</option>
                            <option value="1/4">⛽ 1/4</option>
                            <option value="Riserva">⚠️ Riserva</option>
                        </select>
                        <small class="text-muted">Indica il livello di carburante nel serbatoio</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Note Rientro</label>
                        <textarea name="note_rientro" class="form-control" rows="3" 
                                  placeholder="Eventuali problemi o segnalazioni"></textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-success">Conferma Rientro</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('returnVehicleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                if (parseInt(data.km_arrivo) < assignment.km_partenza) {
                    UI.showToast('Il chilometraggio arrivo non può essere inferiore a quello di partenza', 'error');
                    return;
                }
                
                try {
                    UI.showLoading();
                    await API.vehicles.returnVehicle(assignmentId, data);
                    UI.closeModal();
                    UI.showToast('Rientro registrato con successo', 'success');
                    await this.loadVehicleAssignments();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
            UI.hideLoading();
        }
    },
    
    // ===================================
    // TAB: RIFORNIMENTI
    // ===================================
    async renderRefuelingTab() {
        const container = document.getElementById('tabContent');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>⛽ Rifornimenti Automezzi</h3>
                    <button class="btn btn-primary" onclick="VehiclesPage.showAddRefuelingModal()">
                        ➕ Nuovo Rifornimento
                    </button>
                </div>
                <div id="refuelingContainer"></div>
            </div>
        `;
        
        await this.loadRefueling();
    },
    
    async loadRefueling() {
        try {
            UI.showLoading();
            const refueling = await API.vehicles.getRefueling();
            this.renderRefuelingTable(refueling);
        } catch (error) {
            UI.showToast('Errore caricamento rifornimenti', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderRefuelingTable(refueling) {
        const container = document.getElementById('refuelingContainer');
        
        if (refueling.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun rifornimento registrato</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Data/Ora</th>
                        <th>Automezzo</th>
                        <th>Km</th>
                        <th>Litri</th>
                        <th>Operatore</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${refueling.map(r => `
                        <tr>
                            <td>${UI.formatDateTime(r.data_rifornimento)}</td>
                            <td><strong>${r.vehicle_targa}</strong></td>
                            <td style="text-align: right;">${r.km_rifornimento.toLocaleString()} km</td>
                            <td style="text-align: right;"><strong>${r.litri}</strong> L</td>
                            <td>${r.user_nome || '-'}</td>
                            <td>${r.note || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    async showAddRefuelingModal() {
        try {
            UI.showLoading();
            const vehicles = await API.vehicles.getAll();
            UI.hideLoading();
            
            const modalContent = `
                <h3>⛽ Nuovo Rifornimento</h3>
                <form id="addRefuelingForm">
                    <div class="form-group">
                        <label>Automezzo *</label>
                        <select name="vehicle_id" id="vehicleSelectRefuel" required class="form-control">
                            <option value="">Seleziona automezzo...</option>
                            ${vehicles.map(v => `
                                <option value="${v.id}" data-km="${v.km_attuali}">
                                    ${v.tipo} - ${v.targa} (${(v.km_attuali || 0).toLocaleString()} km)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Data/Ora Rifornimento *</label>
                        <input type="datetime-local" name="data_rifornimento" required class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Chilometraggio al Rifornimento *</label>
                        <input type="number" name="km_rifornimento" id="kmRefuelInput" required 
                               class="form-control" min="0" step="1">
                        <small class="text-muted" id="kmRefuelHelp">Seleziona un automezzo</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Quantità Litri *</label>
                        <input type="number" name="litri" required class="form-control" 
                               min="0" step="0.01" placeholder="Es: 45.50">
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" class="form-control" rows="2" 
                                  placeholder="Stazione di servizio, tipo carburante, etc."></textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Registra Rifornimento</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            // Auto-fill km rifornimento quando si seleziona veicolo
            document.getElementById('vehicleSelectRefuel').addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const km = selectedOption.getAttribute('data-km');
                const kmInput = document.getElementById('kmRefuelInput');
                const kmHelp = document.getElementById('kmRefuelHelp');
                
                if (km) {
                    kmInput.value = km;
                    kmHelp.textContent = `Km attuali: ${parseInt(km).toLocaleString()}`;
                    kmHelp.style.color = '#28a745';
                }
            });
            
            document.getElementById('addRefuelingForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                try {
                    UI.showLoading();
                    await API.vehicles.addRefueling(data);
                    UI.closeModal();
                    UI.showToast('Rifornimento registrato con successo', 'success');
                    await this.loadRefueling();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
            UI.hideLoading();
        }
    },
    
    // ===================================
    // TAB: MANUTENZIONI
    // ===================================
    async renderMaintenanceTab() {
        const container = document.getElementById('tabContent');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Manutenzioni Automezzi</h3>
                </div>
                <div class="p-3 text-center text-muted">
                    📋 Funzionalità manutenzioni in sviluppo
                </div>
            </div>
        `;
    }
};

// Inizializza pagina al caricamento
document.addEventListener('DOMContentLoaded', () => {
    VehiclesPage.init();
});
