// ===================================
// VOLUNTEERS PAGE
// Gestione volontari CRI
// ===================================

const VolunteersPage = {
    volunteers: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>👥 Gestione Volontari</h2>
                    <p>Anagrafica volontari CRI</p>
                </div>
                <button class="btn btn-primary" onclick="VolunteersPage.showAddModal()">
                    ➕ Nuovo Volontario
                </button>
            </div>
            
            <!-- Filtri -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" id="searchVolunteers" 
                                   placeholder="Cerca per nome, cognome, email..." 
                                   class="form-control">
                        </div>
                        <div class="form-group">
                            <input type="text" id="filterComitato" 
                                   placeholder="Filtra per comitato..." 
                                   class="form-control">
                        </div>
                        <button class="btn btn-secondary" onclick="VolunteersPage.applyFilters()">
                            Filtra
                        </button>
                        <button class="btn btn-secondary" onclick="VolunteersPage.resetFilters()">
                            Reset
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div id="volunteersTable"></div>
            </div>
        `;
        
        await this.loadVolunteers();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const searchInput = document.getElementById('searchVolunteers');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
    },
    
    async loadVolunteers() {
        try {
            UI.showLoading();
            const filters = {};
            
            const search = document.getElementById('searchVolunteers')?.value;
            const comitato = document.getElementById('filterComitato')?.value;
            
            if (search) filters.search = search;
            if (comitato) filters.gruppo = comitato;
            
            this.volunteers = await API.volunteers.getAll(filters);
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore caricamento volontari', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderTable() {
        const container = document.getElementById('volunteersTable');
        if (this.volunteers.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun volontario trovato</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Cognome</th>
                        <th>Comitato</th>
                        <th>Telefono</th>
                        <th>Email</th>
                        <th style="text-align: center; width: 180px;">Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.volunteers.map(v => `
                        <tr>
                            <td>${v.nome}</td>
                            <td>${v.cognome}</td>
                            <td>${v.gruppo || '-'}</td>
                            <td>${v.telefono || '-'}</td>
                            <td>${v.email || '-'}</td>
                            <td style="text-align: center;">
                                <div style="display: flex; gap: 5px; justify-content: center;">
                                    <button class="btn btn-sm btn-secondary" 
                                            onclick="VolunteersPage.showDetailModal(${v.id})"
                                            title="Visualizza dettagli"
                                            style="min-width: 35px;">
                                        👁️
                                    </button>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="VolunteersPage.showEditModal(${v.id})"
                                            title="Modifica volontario"
                                            style="min-width: 35px;">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="VolunteersPage.deleteVolunteer(${v.id})"
                                            title="Elimina volontario"
                                            style="min-width: 35px;">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    applyFilters() {
        this.loadVolunteers();
    },
    
    resetFilters() {
        document.getElementById('searchVolunteers').value = '';
        document.getElementById('filterComitato').value = '';
        this.loadVolunteers();
    },
    
    showAddModal() {
        const modalContent = `
            <h3>Nuovo Volontario</h3>
            <form id="addVolunteerForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" name="nome" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Cognome *</label>
                        <input type="text" name="cognome" required class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Codice Fiscale *</label>
                        <input type="text" name="codice_fiscale" maxlength="16" 
                               required class="form-control" 
                               placeholder="16 caratteri">
                    </div>
                    <div class="form-group">
                        <label>Comitato CRI *</label>
                        <input type="text" name="gruppo" required class="form-control" 
                               placeholder="Es: Napoli 1" list="comitatoList">
                        <datalist id="comitatoList">
                            <option value="Napoli 1">
                            <option value="Napoli 2">
                            <option value="Salerno 1">
                            <option value="Salerno 2">
                            <option value="Caserta 1">
                            <option value="Avellino 1">
                            <option value="Benevento 1">
                        </datalist>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Telefono *</label>
                        <input type="tel" name="telefono" required class="form-control" 
                               placeholder="Es: 3331234567">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required class="form-control" 
                               placeholder="nome.cognome@email.it">
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Salva Volontario</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addVolunteerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.volunteers.create(data);
                UI.closeModal();
                UI.showToast('Volontario aggiunto con successo', 'success');
                await this.loadVolunteers();
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
            const volunteer = await API.volunteers.getById(id);
            
            const modalContent = `
                <h3>Dettaglio Volontario</h3>
                
                <div class="mb-3">
                    <strong>Nome Completo:</strong><br>
                    <h4 style="color: #d32f2f; margin: 5px 0;">${volunteer.nome} ${volunteer.cognome}</h4>
                </div>
                
                ${volunteer.codice_fiscale ? `
                    <div class="mb-3">
                        <strong>Codice Fiscale:</strong><br>
                        <code style="font-size: 1.1em;">${volunteer.codice_fiscale}</code>
                    </div>
                ` : ''}
                
                <div class="mb-3">
                    <strong>Comitato CRI:</strong> ${volunteer.gruppo || '-'}<br>
                    <strong>Telefono:</strong> ${volunteer.telefono || '-'}<br>
                    <strong>Email:</strong> ${volunteer.email || '-'}
                </div>
                
                <div class="mb-3">
                    <strong>Stato:</strong> 
                    ${volunteer.attivo 
                        ? '<span class="badge badge-success">Attivo</span>' 
                        : '<span class="badge badge-danger">Non Attivo</span>'}
                </div>
                
                <div class="mb-3">
                    <strong>Registrato il:</strong> ${UI.formatDate(volunteer.created_at)}
                </div>
                
                <hr>
                
                <h4>Storico Assegnazioni</h4>
                <div id="volunteerAssignments">Caricamento...</div>
                
                <button class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
            
            // Carica assegnazioni
            try {
                const assignments = await API.volunteers.getAssignments(id);
                const assignmentsContainer = document.getElementById('volunteerAssignments');
                
                if (assignments.length === 0) {
                    assignmentsContainer.innerHTML = '<p>Nessuna assegnazione registrata</p>';
                } else {
                    assignmentsContainer.innerHTML = `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Evento</th>
                                    <th>Materiale</th>
                                    <th>Data Uscita</th>
                                    <th>Stato</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignments.map(a => `
                                    <tr>
                                        <td>${a.evento}</td>
                                        <td>${a.material_nome}<br><small>${a.codice_barre}</small></td>
                                        <td>${UI.formatDate(a.data_uscita)}</td>
                                        <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
            } catch (error) {
                document.getElementById('volunteerAssignments').innerHTML = 
                    '<p class="error">Errore caricamento assegnazioni</p>';
            }
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async showEditModal(id) {
        try {
            const volunteer = await API.volunteers.getById(id);
            
            const modalContent = `
                <h3>Modifica Volontario</h3>
                <form id="editVolunteerForm">
                    <input type="hidden" name="id" value="${volunteer.id}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="nome" value="${volunteer.nome}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Cognome *</label>
                            <input type="text" name="cognome" value="${volunteer.cognome}" required class="form-control">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Comitato CRI *</label>
                            <input type="text" name="gruppo" value="${volunteer.gruppo || ''}" 
                                   required class="form-control" list="comitatoList">
                            <datalist id="comitatoList">
                                <option value="Napoli 1">
                                <option value="Napoli 2">
                                <option value="Salerno 1">
                                <option value="Salerno 2">
                                <option value="Caserta 1">
                                <option value="Avellino 1">
                                <option value="Benevento 1">
                            </datalist>
                        </div>
                        <div class="form-group">
                            <label>Telefono *</label>
                            <input type="tel" name="telefono" value="${volunteer.telefono || ''}" 
                                   required class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" value="${volunteer.email || ''}" 
                               required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="attivo" class="form-control">
                            <option value="true" ${volunteer.attivo ? 'selected' : ''}>Attivo</option>
                            <option value="false" ${!volunteer.attivo ? 'selected' : ''}>Non Attivo</option>
                        </select>
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editVolunteerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                const volunteerId = data.id;
                delete data.id;
                
                try {
                    UI.showLoading();
                    await API.volunteers.update(volunteerId, data);
                    UI.closeModal();
                    UI.showToast('Volontario aggiornato', 'success');
                    await this.loadVolunteers();
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
    
    async deleteVolunteer(id) {
        if (!await UI.confirm('Sei sicuro di voler eliminare questo volontario?')) return;
        
        try {
            UI.showLoading();
            await API.volunteers.delete(id);
            UI.showToast('Volontario eliminato', 'success');
            await this.loadVolunteers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
