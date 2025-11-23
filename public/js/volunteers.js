// File: volunteers.js, assignments.js, maintenance.js, users.js, reports.js, barcode.js
// Questi verranno separati in file individuali

// ==================== VOLUNTEERS.JS ====================
const VolunteersPage = {
    volunteers: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>Gestione Volontari</h2>
                    <p>Anagrafica volontari CRI</p>
                </div>
                <button class="btn btn-primary" onclick="VolunteersPage.showAddModal()">
                    ➕ Nuovo Volontario
                </button>
            </div>
            <div class="card">
                <div id="volunteersTable"></div>
            </div>
        `;
        
        await this.loadVolunteers();
    },
    
    async loadVolunteers() {
        try {
            UI.showLoading();
            this.volunteers = await API.volunteers.getAll();
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
                        <th>Gruppo</th>
                        <th>Telefono</th>
                        <th>Email</th>
                        <th>Azioni</th>
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
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="VolunteersPage.showEditModal(${v.id})">✏️</button>
                                <button class="btn btn-sm btn-danger" onclick="VolunteersPage.deleteVolunteer(${v.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
                        <label>Codice Fiscale</label>
                        <input type="text" name="codice_fiscale" maxlength="16" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Gruppo</label>
                        <input type="text" name="gruppo" class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Telefono</label>
                        <input type="tel" name="telefono" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" class="form-control">
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Salva</button>
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
                            <label>Gruppo</label>
                            <input type="text" name="gruppo" value="${volunteer.gruppo || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Telefono</label>
                            <input type="tel" name="telefono" value="${volunteer.telefono || ''}" class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${volunteer.email || ''}" class="form-control">
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva</button>
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
        if (!await UI.confirm('Eliminare questo volontario?')) return;
        
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
