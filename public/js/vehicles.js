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
                <button class="tab-btn active" onclick="VehiclesPage.switchTab('vehicles', event)">
                    🚗 Automezzi
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('assignments', event)">
                    📋 Assegnazioni
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('refueling', event)">
                    ⛽ Rifornimenti
                </button>
                <button class="tab-btn" onclick="VehiclesPage.switchTab('maintenance', event)">
                    🔧 Manutenzioni
                </button>
            </div>
            
            <!-- Tab Content -->
            <div id="tabContent"></div>
        `;
        
        this.switchTab('vehicles');
    },
    
    switchTab(tab, event = null) {
        this.currentView = tab;
        
        // Rimuovi active da tutti i tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Aggiungi active al tab corretto
        if (event && event.target) {
            // Se chiamato da click, usa l'event target
            event.target.classList.add('active');
        } else {
            // Se chiamato da init, trova il pulsante corretto per nome
            const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
                btn.textContent.includes(this.getTabLabel(tab))
            );
            if (targetBtn) {
                targetBtn.classList.add('active');
            }
        }
        
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
    
    getTabLabel(tab) {
        const labels = {
            'vehicles': 'Automezzi',
            'assignments': 'Assegnazioni',
            'refueling': 'Rifornimenti',
            'maintenance': 'Manutenzioni'
        };
        return labels[tab] || '';
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
                        <th class="text-center">Anno</th>
                        <th class="text-center">Km Attuali</th>
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
                            <td class="text-center">${v.anno_immatricolazione || '-'}</td>
                            <td style="text-align: center;">${(v.km_attuali || 0).toLocaleString()} km</td>
                            <td><span class="badge badge-${v.stato}">${v.stato}</span></td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="VehiclesPage.showVehicleDetails(${v.id})" title="Dettagli">
                                    👁️
                                </button>
                                ${this.isAdmin ? `
                                    <button class="btn btn-sm btn-primary" onclick="VehiclesPage.showEditVehicleModal(${v.id})" title="Modifica">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="VehiclesPage.showDeleteVehicleModal(${v.id}, '${v.targa}')" title="Elimina">
                                        🗑️
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
            
            // Converti i campi numerici
            if (data.km_attuali) {
                data.km_attuali = parseInt(data.km_attuali, 10);
            }
            if (data.anno_immatricolazione) {
                data.anno_immatricolazione = parseInt(data.anno_immatricolazione, 10);
            }
            
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
                
                // Converti i campi numerici
                if (data.km_attuali) {
                    data.km_attuali = parseInt(data.km_attuali, 10);
                }
                if (data.anno_immatricolazione) {
                    data.anno_immatricolazione = parseInt(data.anno_immatricolazione, 10);
                }
                
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
    
    async showDeleteVehicleModal(id, targa) {
        if (!this.isAdmin) {
            UI.showToast('Solo gli amministratori possono eliminare automezzi', 'error');
            return;
        }
        
        const modalContent = `
            <h3 style="color: #d32f2f;">⚠️ Elimina Automezzo</h3>
            <div class="alert alert-warning mb-3">
                <strong>Attenzione!</strong> Stai per eliminare l'automezzo:
                <div style="font-size: 1.2em; margin-top: 10px;">
                    <strong>${targa}</strong>
                </div>
            </div>
            
            <div class="alert alert-info mb-3">
                <strong>ℹ️ Informazioni importanti:</strong>
                <ul style="margin-top: 10px; margin-bottom: 0;">
                    <li>L'automezzo verrà rimosso dal sistema</li>
                    <li>I dati storici (rifornimenti, manutenzioni) verranno <strong>mantenuti</strong> per le statistiche</li>
                    <li>Non sarà possibile eliminare se ci sono assegnazioni attive</li>
                    <li>Questa operazione <strong>non può essere annullata</strong></li>
                </ul>
            </div>
            
            <div style="margin-top: 20px;">
                <p><strong>Sei sicuro di voler procedere con l'eliminazione?</strong></p>
                <div class="d-flex gap-2 mt-3">
                    <button type="button" class="btn btn-danger" onclick="VehiclesPage.confirmDeleteVehicle(${id}, '${targa}')">
                        🗑️ Sì, Elimina Definitivamente
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">
                        Annulla
                    </button>
                </div>
            </div>
        `;
        
        UI.showModal(modalContent);
    },
    
    async confirmDeleteVehicle(id, targa) {
        try {
            UI.showLoading();
            await API.vehicles.delete(id);
            UI.closeModal();
            UI.showToast(`Automezzo ${targa} eliminato con successo. I dati storici sono stati mantenuti.`, 'success');
            await this.loadVehicles();
        } catch (error) {
            UI.showToast(error.message || 'Errore durante l\'eliminazione dell\'automezzo', 'error');
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
                        <th>Importo</th>
                        <th>€/L</th>
                        <th>Operatore</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${refueling.map(r => {
                        const prezzoLitro = r.importo && r.litri ? (r.importo / r.litri).toFixed(2) : '-';
                        return `
                        <tr>
                            <td>${UI.formatDateTime(r.data_rifornimento)}</td>
                            <td><strong>${r.vehicle_targa}</strong></td>
                            <td style="text-align: center;">${r.km_rifornimento.toLocaleString()} km</td>
                            <td style="text-align: right;"><strong>${r.litri}</strong> L</td>
                            <td style="text-align: right;">${r.importo ? UI.formatCurrency(r.importo) : '-'}</td>
                            <td style="text-align: right;">${prezzoLitro !== '-' ? '€' + prezzoLitro : '-'}</td>
                            <td>${r.user_nome || '-'}</td>
                            <td>${r.note || '-'}</td>
                        </tr>
                    `}).join('')}
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
                        <label>Importo (€)</label>
                        <input type="number" name="importo" class="form-control" 
                               min="0" step="0.01" placeholder="Es: 85.50">
                        <small class="text-muted">Costo totale del rifornimento</small>
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
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>🔧 Manutenzioni Automezzi</h3>
                    <div style="display: flex; gap: 10px;">
                        <select id="maintenanceStatusFilter" class="form-control" style="width: 200px;">
                            <option value="">Tutti gli stati</option>
                            <option value="programmata">Programmata</option>
                            <option value="in_corso">In Corso</option>
                            <option value="completata">Completata</option>
                            <option value="annullata">Annullata</option>
                        </select>
                        <button class="btn btn-primary" onclick="VehiclesPage.showAddMaintenanceModal()">
                            ➕ Nuova Manutenzione
                        </button>
                    </div>
                </div>
                <div id="maintenanceTableContainer"></div>
            </div>
        `;
        
        // Aggiungi event listener per il filtro
        document.getElementById('maintenanceStatusFilter').addEventListener('change', (e) => {
            this.loadMaintenance(e.target.value);
        });
        
        await this.loadMaintenance();
    },
    
    async loadMaintenance(statoFilter = '') {
        try {
            UI.showLoading();
            const params = statoFilter ? { stato: statoFilter } : {};
            
            // Chiamata API - usa l'endpoint corretto
            const response = await fetch(`/api/automezzi/manutenzioni?${new URLSearchParams(params)}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Errore nel caricamento');
            
            const maintenance = await response.json();
            this.renderMaintenanceTable(maintenance);
        } catch (error) {
            UI.showToast('Errore nel caricamento delle manutenzioni', 'error');
            document.getElementById('maintenanceTableContainer').innerHTML = 
                '<div class="p-3 text-center text-danger">Errore nel caricamento</div>';
        } finally {
            UI.hideLoading();
        }
    },
    
    renderMaintenanceTable(maintenance) {
        const container = document.getElementById('maintenanceTableContainer');
        
        if (maintenance.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessuna manutenzione trovata</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Automezzo</th>
                        <th>Tipo</th>
                        <th>Descrizione</th>
                        <th>Data Programmata</th>
                        <th>Km Manutenzione</th>
                        <th>Stato</th>
                        <th>Costo</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${maintenance.map(m => {
                        const statoBadge = this.getMaintenanceStateBadge(m.stato);
                        return `
                            <tr>
                                <td><strong>${m.vehicle_targa}</strong><br><small>${m.vehicle_tipo}</small></td>
                                <td>${m.tipo}</td>
                                <td>${m.descrizione || '-'}</td>
                                <td>${m.data_programmata ? UI.formatDate(m.data_programmata) : '-'}</td>
                                <td>${m.km_manutenzione ? m.km_manutenzione.toLocaleString() + ' km' : '-'}</td>
                                <td>${statoBadge}</td>
                                <td>${m.costo ? UI.formatCurrency(m.costo) : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-secondary" onclick="VehiclesPage.showMaintenanceDetails(${m.id})" title="Dettagli">
                                        👁️
                                    </button>
                                    ${m.stato === 'programmata' ? `
                                        <button class="btn btn-sm btn-warning" onclick="VehiclesPage.showStartMaintenanceModal(${m.id})" title="Inizia">
                                            ▶️
                                        </button>
                                    ` : ''}
                                    ${m.stato === 'in_corso' ? `
                                        <button class="btn btn-sm btn-success" onclick="VehiclesPage.showCompleteMaintenanceModal(${m.id})" title="Completa">
                                            ✓
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },
    
    getMaintenanceStateBadge(stato) {
        const badges = {
            'programmata': '<span class="badge badge-info">Programmata</span>',
            'in_corso': '<span class="badge badge-warning">In Corso</span>',
            'completata': '<span class="badge badge-success">Completata</span>',
            'annullata': '<span class="badge badge-danger">Annullata</span>'
        };
        return badges[stato] || '<span class="badge badge-secondary">-</span>';
    },
    
    async showAddMaintenanceModal() {
        try {
            UI.showLoading();
            const vehicles = await API.vehicles.getAll();
            UI.hideLoading();
            
            const modalContent = `
                <h3>Nuova Manutenzione</h3>
                <form id="addMaintenanceForm">
                    <div class="form-group">
                        <label>Automezzo *</label>
                        <select name="vehicle_id" required class="form-control">
                            <option value="">Seleziona automezzo...</option>
                            ${vehicles.map(v => `
                                <option value="${v.id}">${v.targa} - ${v.tipo} ${v.modello}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Tipo Manutenzione *</label>
                        <select name="tipo" required class="form-control">
                            <option value="">Seleziona tipo...</option>
                            <option value="Ordinaria">🔧 Ordinaria</option>
                            <option value="Straordinaria">⚠️ Straordinaria</option>
                            <option value="Revisione">📋 Revisione</option>
                            <option value="Tagliando">🛠️ Tagliando</option>
                            <option value="Riparazione">🔨 Riparazione</option>
                            <option value="Pneumatici">🛞 Pneumatici</option>
                            <option value="Carrozzeria">🚗 Carrozzeria</option>
                            <option value="Altro">📦 Altro</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Descrizione *</label>
                        <textarea name="descrizione" required class="form-control" rows="3" 
                                  placeholder="Descrivi l'intervento di manutenzione"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Data Programmata</label>
                        <input type="date" name="data_programmata" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Km Manutenzione</label>
                        <input type="number" name="km_manutenzione" class="form-control" 
                               min="0" step="1" placeholder="Es: 50000">
                        <small class="text-muted">Chilometraggio previsto per la manutenzione</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Fornitore/Officina</label>
                        <input type="text" name="fornitore" class="form-control" 
                               placeholder="Es: Officina Auto CRI">
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" class="form-control" rows="2"></textarea>
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
                    const response = await fetch('/api/automezzi/manutenzioni', {
                        method: 'POST',
                        headers: AuthManager.getAuthHeaders(),
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Errore nella creazione');
                    }
                    
                    UI.closeModal();
                    UI.showToast('Manutenzione creata con successo', 'success');
                    await this.loadMaintenance();
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
    
    async showMaintenanceDetails(id) {
        try {
            UI.showLoading();
            const response = await fetch(`/api/automezzi/manutenzioni/${id}`, {
                headers: AuthManager.getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Errore nel caricamento');
            
            const maintenance = await response.json();
            UI.hideLoading();
            
            const modalContent = `
                <h3>Dettagli Manutenzione</h3>
                <div class="maintenance-details">
                    <table class="table-details">
                        <tr>
                            <th>Automezzo:</th>
                            <td><strong>${maintenance.vehicle_targa}</strong> - ${maintenance.vehicle_tipo}</td>
                        </tr>
                        <tr>
                            <th>Tipo:</th>
                            <td>${maintenance.tipo}</td>
                        </tr>
                        <tr>
                            <th>Descrizione:</th>
                            <td>${maintenance.descrizione}</td>
                        </tr>
                        <tr>
                            <th>Data Programmata:</th>
                            <td>${maintenance.data_programmata ? UI.formatDate(maintenance.data_programmata) : '-'}</td>
                        </tr>
                        <tr>
                            <th>Km Manutenzione:</th>
                            <td>${maintenance.km_manutenzione ? maintenance.km_manutenzione.toLocaleString() + ' km' : '-'}</td>
                        </tr>
                        <tr>
                            <th>Stato:</th>
                            <td>${this.getMaintenanceStateBadge(maintenance.stato)}</td>
                        </tr>
                        <tr>
                            <th>Fornitore:</th>
                            <td>${maintenance.fornitore || '-'}</td>
                        </tr>
                        <tr>
                            <th>Data Inizio:</th>
                            <td>${maintenance.data_inizio ? UI.formatDate(maintenance.data_inizio) : '-'}</td>
                        </tr>
                        <tr>
                            <th>Data Completamento:</th>
                            <td>${maintenance.data_completamento ? UI.formatDate(maintenance.data_completamento) : '-'}</td>
                        </tr>
                        <tr>
                            <th>Costo:</th>
                            <td>${maintenance.costo ? UI.formatCurrency(maintenance.costo) : '-'}</td>
                        </tr>
                        <tr>
                            <th>Note:</th>
                            <td>${maintenance.note || '-'}</td>
                        </tr>
                    </table>
                </div>
                
                <button type="button" class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast(error.message, 'error');
            UI.hideLoading();
        }
    },
    
    async showStartMaintenanceModal(id) {
        const modalContent = `
            <h3>Inizia Manutenzione</h3>
            <form id="startMaintenanceForm">
                <div class="form-group">
                    <label>Data Inizio *</label>
                    <input type="date" name="data_inizio" required class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label>Note Inizio</label>
                    <textarea name="note" class="form-control" rows="3"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-warning">Inizia Manutenzione</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('startMaintenanceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.stato = 'in_corso';
            
            try {
                UI.showLoading();
                const response = await fetch(`/api/automezzi/manutenzioni/${id}`, {
                    method: 'PATCH',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Errore nell\'avvio');
                }
                
                UI.closeModal();
                UI.showToast('Manutenzione avviata', 'success');
                await this.loadMaintenance();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    async showCompleteMaintenanceModal(id) {
        const modalContent = `
            <h3>Completa Manutenzione</h3>
            <form id="completeMaintenanceForm">
                <div class="form-group">
                    <label>Data Completamento *</label>
                    <input type="date" name="data_completamento" required class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label>Costo (€) *</label>
                    <input type="number" name="costo" required class="form-control" 
                           min="0" step="0.01" placeholder="Es: 250.00">
                </div>
                
                <div class="form-group">
                    <label>Note Completamento</label>
                    <textarea name="note" class="form-control" rows="3" 
                              placeholder="Lavori eseguiti, parti sostituite, etc."></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-success">Completa Manutenzione</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('completeMaintenanceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.stato = 'completata';
            
            try {
                UI.showLoading();
                const response = await fetch(`/api/automezzi/manutenzioni/${id}`, {
                    method: 'PATCH',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Errore nel completamento');
                }
                
                UI.closeModal();
                UI.showToast('Manutenzione completata con successo', 'success');
                await this.loadMaintenance();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    }
};

// Inizializza pagina al caricamento
document.addEventListener('DOMContentLoaded', () => {
    VehiclesPage.init();
});
