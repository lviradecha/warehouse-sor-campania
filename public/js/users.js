// ===================================
// USERS PAGE
// Gestione utenti (Solo Admin)
// ===================================

const UsersPage = {
    users: [],
    deactivatedUsers: [],
    currentTab: 'active', // 'active' o 'deactivated'
    
    async render(container) {
        if (!AuthManager.isAdmin()) {
            container.innerHTML = `
                <div class="card">
                    <div class="error">
                        <h3>⛔ Accesso Negato</h3>
                        <p>Solo gli amministratori possono accedere a questa sezione.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>⚙️ Gestione Utenti</h2>
                    <p>Amministrazione utenti del sistema</p>
                </div>
                <button class="btn btn-primary" onclick="UsersPage.showAddModal()">
                    ➕ Nuovo Utente
                </button>
            </div>

            <!-- Tabs -->
            <div class="card mb-3" style="padding: 20px;">
                <div style="display: flex; gap: 10px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
                    <button id="tabActive" class="btn-tab active" onclick="UsersPage.switchTab('active')" 
                            style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-weight: 600; border-bottom: 3px solid #d32f2f; color: #d32f2f;">
                        ✅ Utenti Attivi (<span id="countActive">0</span>)
                    </button>
                    <button id="tabDeactivated" class="btn-tab" onclick="UsersPage.switchTab('deactivated')"
                            style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-weight: 600; color: #666;">
                        🗑️ Utenti Disattivati (<span id="countDeactivated">0</span>)
                    </button>
                </div>
            </div>

            <!-- Tabella utenti -->
            <div class="card">
                <div id="usersTable"></div>
            </div>
        `;
        
        await this.loadUsers();
    },
    
    async loadUsers() {
        try {
            UI.showLoading();
            
            // Carica utenti attivi
            this.users = await API.users.getAll();
            
            // Carica utenti disattivati
            const response = await fetch('/api/utenti?deactivated=true', {
                headers: AuthManager.getAuthHeaders()
            });
            const data = await response.json();
            this.deactivatedUsers = data || [];
            
            // Aggiorna contatori
            document.getElementById('countActive').textContent = this.users.length;
            document.getElementById('countDeactivated').textContent = this.deactivatedUsers.length;
            
            this.renderTable();
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
            UI.showToast('Errore caricamento utenti', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Aggiorna stile tab
        const tabActive = document.getElementById('tabActive');
        const tabDeactivated = document.getElementById('tabDeactivated');
        
        if (tab === 'active') {
            tabActive.classList.add('active');
            tabActive.style.borderBottom = '3px solid #d32f2f';
            tabActive.style.color = '#d32f2f';
            
            tabDeactivated.classList.remove('active');
            tabDeactivated.style.borderBottom = 'none';
            tabDeactivated.style.color = '#666';
        } else {
            tabDeactivated.classList.add('active');
            tabDeactivated.style.borderBottom = '3px solid #d32f2f';
            tabDeactivated.style.color = '#d32f2f';
            
            tabActive.classList.remove('active');
            tabActive.style.borderBottom = 'none';
            tabActive.style.color = '#666';
        }
        
        this.renderTable();
    },
    
    renderTable() {
        const container = document.getElementById('usersTable');
        const currentUser = AuthManager.getUser();
        const usersList = this.currentTab === 'active' ? this.users : this.deactivatedUsers;
        
        if (usersList.length === 0) {
            const message = this.currentTab === 'active' 
                ? 'Nessun utente attivo trovato' 
                : 'Nessun utente disattivato';
            container.innerHTML = `<div class="p-3 text-center">${message}</div>`;
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Nome Completo</th>
                        <th>Email</th>
                        <th>Email Inviata</th>
                        <th>Ruolo</th>
                        ${this.currentTab === 'active' ? '<th>Ultimo Accesso</th>' : ''}
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersList.map(u => `
                        <tr>
                            <td><strong>${u.username}</strong></td>
                            <td>${u.nome} ${u.cognome}</td>
                            <td>${u.email || '-'}</td>
                            <td>
                                ${u.email_sent 
                                    ? `<span class="badge badge-success" title="Inviata il ${u.email_sent_at ? UI.formatDateTime(u.email_sent_at) : ''}">✅ Inviata</span>` 
                                    : '<span class="badge badge-danger" title="Email non inviata">❌ Non inviata</span>'}
                            </td>
                            <td><span class="badge badge-${u.role}">${u.role}</span></td>
                            ${this.currentTab === 'active' ? `<td>${u.last_login ? UI.formatDateTime(u.last_login) : 'Mai'}</td>` : ''}
                            <td>
                                ${u.id !== currentUser?.id ? `
                                    ${this.currentTab === 'active' ? `
                                        <button class="btn btn-sm btn-primary" 
                                                onclick="UsersPage.showEditModal(${u.id})"
                                                title="Modifica">
                                            ✏️
                                        </button>
                                        <button class="btn btn-sm btn-warning" 
                                                onclick="UsersPage.resetPassword(${u.id})"
                                                title="Reset Password (genera nuova e invia email)">
                                            🔑
                                        </button>
                                        <button class="btn btn-sm btn-danger" 
                                                onclick="UsersPage.deactivateUser(${u.id})"
                                                title="Disattiva Utente">
                                            🚫
                                        </button>
                                    ` : `
                                        <button class="btn btn-sm btn-success" 
                                                onclick="UsersPage.reactivateUser(${u.id})"
                                                title="Riattiva Utente">
                                            ✅ Riattiva
                                        </button>
                                    `}
                                ` : '<em>Utente corrente</em>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    showAddModal() {
        const modalContent = `
            <h3>Nuovo Utente</h3>
            <div class="alert alert-info mb-3">
                🔐 <strong>Password Automatica:</strong> Il sistema genererà una password sicura casuale e la invierà via email all'utente.
            </div>
            <form id="addUserForm">
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
                
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" name="username" required class="form-control" placeholder="es: m.rossi">
                    <small>Utilizzato per il login</small>
                </div>
                
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" required class="form-control" placeholder="email@esempio.it">
                    <small>📧 Le credenziali saranno inviate a questo indirizzo</small>
                </div>
                
                <div class="form-group">
                    <label>Ruolo *</label>
                    <select name="role" required class="form-control">
                        <option value="operatore">Operatore</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Crea Utente e Invia Email</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.users.create(data);
                UI.closeModal();
                UI.showToast('Utente creato con successo', 'success');
                await this.loadUsers();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },
    
    async showEditModal(id) {
        try {
            const user = await API.users.getById(id);
            
            const modalContent = `
                <h3>Modifica Utente</h3>
                <form id="editUserForm">
                    <input type="hidden" name="id" value="${user.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="nome" value="${user.nome}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Cognome *</label>
                            <input type="text" name="cognome" value="${user.cognome}" required class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" value="${user.username}" disabled class="form-control">
                        <small>Username non modificabile</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" value="${user.email || ''}" required class="form-control" placeholder="email@esempio.it">
                        <small>Richiesta per notifiche email</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Ruolo *</label>
                        <select name="role" required class="form-control">
                            <option value="operatore" ${user.role === 'operatore' ? 'selected' : ''}>Operatore</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editUserForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                const userId = data.id;
                delete data.id;
                
                try {
                    UI.showLoading();
                    await API.users.update(userId, data);
                    UI.closeModal();
                    UI.showToast('Utente aggiornato', 'success');
                    await this.loadUsers();
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
    
    async resetPassword(id) {
        if (!await UI.confirm('Vuoi rigenerare la password e inviarla via email all\'utente?')) return;
        
        try {
            UI.showLoading();
            
            const response = await fetch(`/api/utenti/${id}/reset-password`, {
                method: 'POST',
                headers: AuthManager.getAuthHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Errore reset password');
            }
            
            UI.showToast('✅ Password rigenerata e inviata via email!', 'success');
            await this.loadUsers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async deactivateUser(id) {
        if (!await UI.confirm('⚠️ Vuoi disattivare questo utente?\n\nL\'utente:\n- Non potrà più accedere al sistema\n- Sarà spostato nella sezione "Disattivati"\n- I suoi log saranno conservati\n- Potrà essere riattivato in futuro')) return;
        
        try {
            UI.showLoading();
            await API.users.delete(id);
            UI.showToast('✅ Utente disattivato (log conservati)', 'success');
            await this.loadUsers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async reactivateUser(id) {
        if (!await UI.confirm('Vuoi riattivare questo utente?\n\nL\'utente potrà di nuovo accedere al sistema.')) return;
        
        try {
            UI.showLoading();
            await API.users.update(id, { attivo: true });
            UI.showToast('✅ Utente riattivato', 'success');
            await this.loadUsers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
