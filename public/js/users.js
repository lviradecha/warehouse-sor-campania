// ===================================
// USERS PAGE
// Gestione utenti (Solo Admin)
// ===================================

const UsersPage = {
    users: [],
    
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
            this.users = await API.users.getAll();
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore caricamento utenti', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderTable() {
        const container = document.getElementById('usersTable');
        const currentUser = AuthManager.getUser();
        
        if (this.users.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun utente trovato</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Nome Completo</th>
                        <th>Email</th>
                        <th>Ruolo</th>
                        <th>Stato</th>
                        <th>Ultimo Accesso</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(u => `
                        <tr>
                            <td><strong>${u.username}</strong></td>
                            <td>${u.nome} ${u.cognome}</td>
                            <td>${u.email || '-'}</td>
                            <td><span class="badge badge-${u.role}">${u.role}</span></td>
                            <td>
                                ${u.attivo 
                                    ? '<span class="badge badge-success">Attivo</span>' 
                                    : '<span class="badge badge-danger">Disattivato</span>'}
                            </td>
                            <td>${u.last_login ? UI.formatDateTime(u.last_login) : 'Mai'}</td>
                            <td>
                                ${u.id !== currentUser.id ? `
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="UsersPage.showEditModal(${u.id})"
                                            title="Modifica">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-warning" 
                                            onclick="UsersPage.resetPassword(${u.id})"
                                            title="Reset Password">
                                        🔑
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="UsersPage.deleteUser(${u.id})"
                                            title="Elimina">
                                        🗑️
                                    </button>
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
                    <input type="text" name="username" required class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" required class="form-control" minlength="8">
                    <small>Minimo 8 caratteri</small>
                </div>
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Ruolo *</label>
                    <select name="role" required class="form-control">
                        <option value="operatore">Operatore</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Crea Utente</button>
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
                        <label>Email</label>
                        <input type="email" name="email" value="${user.email || ''}" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label>Ruolo *</label>
                        <select name="role" required class="form-control">
                            <option value="operatore" ${user.role === 'operatore' ? 'selected' : ''}>Operatore</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="attivo" class="form-control">
                            <option value="true" ${user.attivo ? 'selected' : ''}>Attivo</option>
                            <option value="false" ${!user.attivo ? 'selected' : ''}>Disattivato</option>
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
        const newPassword = prompt('Inserisci la nuova password (minimo 8 caratteri):');
        if (!newPassword) return;
        
        if (newPassword.length < 8) {
            UI.showToast('Password troppo corta (minimo 8 caratteri)', 'error');
            return;
        }
        
        try {
            UI.showLoading();
            await API.users.changePassword(id, { newPassword });
            UI.showToast('Password aggiornata con successo', 'success');
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async deleteUser(id) {
        if (!await UI.confirm('Sei sicuro di voler eliminare questo utente?')) return;
        
        try {
            UI.showLoading();
            await API.users.delete(id);
            UI.showToast('Utente eliminato', 'success');
            await this.loadUsers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
