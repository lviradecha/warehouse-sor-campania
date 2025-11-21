// Configuration
const API_BASE_URL = '/api';

// State Management
const state = {
    user: null,
    token: null,
    materials: [],
    volunteers: [],
    assignments: [],
    maintenance: []
};

// Utility Functions
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
    };
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Errore nella richiesta');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function showError(message) {
    alert('⚠️ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
}

function formatCurrency(amount) {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(amount);
}

// Authentication
async function login(username, password) {
    try {
        const data = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(r => r.json());

        if (data.error) {
            throw new Error(data.error);
        }

        state.user = data.user;
        state.token = data.token;

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return true;
    } catch (error) {
        throw error;
    }
}

function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('loginForm').reset();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
        state.token = token;
        state.user = JSON.parse(userStr);
        return true;
    }

    return false;
}

// Initialize App
function initApp() {
    if (checkAuth()) {
        showMainApp();
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    // Update UI based on role
    document.getElementById('userInfo').textContent = 
        `${state.user.full_name} (${state.user.role})`;
    
    if (state.user.role === 'admin') {
        document.body.classList.add('admin');
    } else {
        document.body.classList.remove('admin');
    }
    
    // Load initial data
    loadMaterials();
    loadVolunteers();
    loadAssignments();
    loadMaintenance();
    
    if (state.user.role === 'admin') {
        loadUsers();
    }
}

// Materials Management
async function loadMaterials() {
    try {
        const filters = {
            status: document.getElementById('materialsStatusFilter')?.value || '',
            category: document.getElementById('materialsCategoryFilter')?.value || '',
            search: document.getElementById('materialsSearch')?.value || ''
        };

        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.search) queryParams.append('search', filters.search);

        state.materials = await apiRequest(`/materials?${queryParams.toString()}`);
        renderMaterials();
    } catch (error) {
        showError('Errore nel caricamento dei materiali: ' + error.message);
    }
}

function renderMaterials() {
    const tbody = document.getElementById('materialsTableBody');
    
    if (state.materials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <div class="empty-state-text">Nessun materiale trovato</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.materials.map(material => `
        <tr>
            <td>${material.barcode}</td>
            <td>${material.name}</td>
            <td>${material.category}</td>
            <td>${getStatusBadge(material.status)}</td>
            <td>${formatDate(material.purchase_date)}</td>
            <td>${formatCurrency(material.purchase_price)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-primary" onclick="viewMaterial(${material.id})">
                        👁️ Dettagli
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editMaterial(${material.id})">
                        ✏️ Modifica
                    </button>
                    <button class="btn btn-sm btn-success" onclick="printLabel(${material.id})">
                        🖨️ Etichetta
                    </button>
                    ${state.user.role === 'admin' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteMaterial(${material.id})">
                            🗑️ Elimina
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusBadge(status) {
    const badges = {
        'disponibile': '<span class="badge badge-success">Disponibile</span>',
        'assegnato': '<span class="badge badge-warning">Assegnato</span>',
        'fuori_servizio': '<span class="badge badge-danger">Fuori servizio</span>',
        'dismesso': '<span class="badge badge-secondary">Dismesso</span>'
    };
    return badges[status] || status;
}

function showMaterialModal(material = null) {
    const isEdit = !!material;
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Modifica Materiale' : 'Nuovo Materiale'}</h2>
        <form id="materialForm">
            ${isEdit ? `<input type="hidden" name="id" value="${material.id}">` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label for="barcode">Codice a Barre *</label>
                    <input type="text" id="barcode" name="barcode" required 
                           value="${material?.barcode || ''}" ${isEdit ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label for="name">Nome *</label>
                    <input type="text" id="name" name="name" required 
                           value="${material?.name || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="category">Categoria *</label>
                    <select id="category" name="category" required>
                        <option value="">Seleziona categoria</option>
                        <option value="Tende" ${material?.category === 'Tende' ? 'selected' : ''}>Tende</option>
                        <option value="Generatori" ${material?.category === 'Generatori' ? 'selected' : ''}>Generatori</option>
                        <option value="Illuminazione" ${material?.category === 'Illuminazione' ? 'selected' : ''}>Illuminazione</option>
                        <option value="Riscaldamento" ${material?.category === 'Riscaldamento' ? 'selected' : ''}>Riscaldamento</option>
                        <option value="Attrezzatura" ${material?.category === 'Attrezzatura' ? 'selected' : ''}>Attrezzatura</option>
                        <option value="Altro" ${material?.category === 'Altro' ? 'selected' : ''}>Altro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="status">Stato</label>
                    <select id="status" name="status">
                        <option value="disponibile" ${material?.status === 'disponibile' ? 'selected' : ''}>Disponibile</option>
                        <option value="fuori_servizio" ${material?.status === 'fuori_servizio' ? 'selected' : ''}>Fuori servizio</option>
                        ${state.user.role === 'admin' ? `
                            <option value="dismesso" ${material?.status === 'dismesso' ? 'selected' : ''}>Dismesso</option>
                        ` : ''}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="purchase_date">Data Acquisto</label>
                    <input type="date" id="purchase_date" name="purchase_date" 
                           value="${material?.purchase_date ? material.purchase_date.split('T')[0] : ''}">
                </div>
                <div class="form-group">
                    <label for="purchase_price">Prezzo Acquisto (€)</label>
                    <input type="number" step="0.01" id="purchase_price" name="purchase_price" 
                           value="${material?.purchase_price || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="description">Descrizione</label>
                <textarea id="description" name="description">${material?.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="notes">Note</label>
                <textarea id="notes" name="notes">${material?.notes || ''}</textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    ${isEdit ? 'Aggiorna' : 'Crea'} Materiale
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('materialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMaterial(new FormData(e.target), isEdit);
    });
    
    openModal();
}

async function saveMaterial(formData, isEdit) {
    try {
        const data = Object.fromEntries(formData);
        
        if (isEdit) {
            await apiRequest('/materials', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showSuccess('Materiale aggiornato con successo');
        } else {
            await apiRequest('/materials', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showSuccess('Materiale creato con successo');
        }
        
        closeModal();
        await loadMaterials();
    } catch (error) {
        showError(error.message);
    }
}

async function deleteMaterial(id) {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) {
        return;
    }
    
    try {
        await apiRequest(`/materials?id=${id}`, { method: 'DELETE' });
        showSuccess('Materiale eliminato con successo');
        await loadMaterials();
    } catch (error) {
        showError(error.message);
    }
}

function viewMaterial(id) {
    const material = state.materials.find(m => m.id === id);
    if (!material) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Dettagli Materiale</h2>
        <div style="line-height: 2;">
            <p><strong>Codice a Barre:</strong> ${material.barcode}</p>
            <p><strong>Nome:</strong> ${material.name}</p>
            <p><strong>Categoria:</strong> ${material.category}</p>
            <p><strong>Stato:</strong> ${getStatusBadge(material.status)}</p>
            <p><strong>Data Acquisto:</strong> ${formatDate(material.purchase_date)}</p>
            <p><strong>Prezzo Acquisto:</strong> ${formatCurrency(material.purchase_price)}</p>
            <p><strong>Descrizione:</strong> ${material.description || '-'}</p>
            <p><strong>Note:</strong> ${material.notes || '-'}</p>
            <p><strong>Creato il:</strong> ${formatDateTime(material.created_at)}</p>
        </div>
        <button class="btn btn-primary btn-block" onclick="closeModal()">Chiudi</button>
    `;
    
    openModal();
}

function editMaterial(id) {
    const material = state.materials.find(m => m.id === id);
    if (material) {
        showMaterialModal(material);
    }
}

async function printLabel(materialId) {
    try {
        const response = await fetch(`${API_BASE_URL}/labels/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ material_id: materialId })
        });
        
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
    } catch (error) {
        showError('Errore nella generazione dell\'etichetta: ' + error.message);
    }
}

// Volunteers Management
async function loadVolunteers() {
    try {
        const filters = {
            active: document.getElementById('volunteersActiveFilter')?.value || '',
            search: document.getElementById('volunteersSearch')?.value || ''
        };

        const queryParams = new URLSearchParams();
        if (filters.active) queryParams.append('active', filters.active);
        if (filters.search) queryParams.append('search', filters.search);

        state.volunteers = await apiRequest(`/volunteers?${queryParams.toString()}`);
        renderVolunteers();
    } catch (error) {
        showError('Errore nel caricamento dei volontari: ' + error.message);
    }
}

function renderVolunteers() {
    const tbody = document.getElementById('volunteersTableBody');
    
    if (state.volunteers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-text">Nessun volontario trovato</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.volunteers.map(volunteer => `
        <tr>
            <td>${volunteer.code}</td>
            <td>${volunteer.full_name}</td>
            <td>${volunteer.phone || '-'}</td>
            <td>${volunteer.email || '-'}</td>
            <td>${volunteer.active ? '<span class="badge badge-success">Attivo</span>' : '<span class="badge badge-secondary">Non attivo</span>'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-primary" onclick="viewVolunteer(${volunteer.id})">
                        👁️ Dettagli
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editVolunteer(${volunteer.id})">
                        ✏️ Modifica
                    </button>
                    ${state.user.role === 'admin' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteVolunteer(${volunteer.id})">
                            🗑️ Elimina
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function showVolunteerModal(volunteer = null) {
    const isEdit = !!volunteer;
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Modifica Volontario' : 'Nuovo Volontario'}</h2>
        <form id="volunteerForm">
            ${isEdit ? `<input type="hidden" name="id" value="${volunteer.id}">` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label for="full_name">Nome Completo *</label>
                    <input type="text" id="full_name" name="full_name" required 
                           value="${volunteer?.full_name || ''}">
                </div>
                <div class="form-group">
                    <label for="code">Codice Volontario *</label>
                    <input type="text" id="code" name="code" required 
                           value="${volunteer?.code || ''}" ${isEdit ? 'readonly' : ''}>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="phone">Telefono</label>
                    <input type="tel" id="phone" name="phone" 
                           value="${volunteer?.phone || ''}">
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" 
                           value="${volunteer?.email || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="active">Stato</label>
                <select id="active" name="active">
                    <option value="true" ${volunteer?.active !== false ? 'selected' : ''}>Attivo</option>
                    <option value="false" ${volunteer?.active === false ? 'selected' : ''}>Non attivo</option>
                </select>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    ${isEdit ? 'Aggiorna' : 'Crea'} Volontario
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('volunteerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveVolunteer(new FormData(e.target), isEdit);
    });
    
    openModal();
}

async function saveVolunteer(formData, isEdit) {
    try {
        const data = Object.fromEntries(formData);
        data.active = data.active === 'true';
        
        if (isEdit) {
            await apiRequest('/volunteers', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showSuccess('Volontario aggiornato con successo');
        } else {
            await apiRequest('/volunteers', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showSuccess('Volontario creato con successo');
        }
        
        closeModal();
        await loadVolunteers();
    } catch (error) {
        showError(error.message);
    }
}

async function deleteVolunteer(id) {
    if (!confirm('Sei sicuro di voler eliminare questo volontario?')) {
        return;
    }
    
    try {
        await apiRequest(`/volunteers?id=${id}`, { method: 'DELETE' });
        showSuccess('Volontario eliminato con successo');
        await loadVolunteers();
    } catch (error) {
        showError(error.message);
    }
}

function viewVolunteer(id) {
    const volunteer = state.volunteers.find(v => v.id === id);
    if (!volunteer) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Dettagli Volontario</h2>
        <div style="line-height: 2;">
            <p><strong>Codice:</strong> ${volunteer.code}</p>
            <p><strong>Nome Completo:</strong> ${volunteer.full_name}</p>
            <p><strong>Telefono:</strong> ${volunteer.phone || '-'}</p>
            <p><strong>Email:</strong> ${volunteer.email || '-'}</p>
            <p><strong>Stato:</strong> ${volunteer.active ? '<span class="badge badge-success">Attivo</span>' : '<span class="badge badge-secondary">Non attivo</span>'}</p>
            <p><strong>Creato il:</strong> ${formatDateTime(volunteer.created_at)}</p>
        </div>
        <button class="btn btn-primary btn-block" onclick="closeModal()">Chiudi</button>
    `;
    
    openModal();
}

function editVolunteer(id) {
    const volunteer = state.volunteers.find(v => v.id === id);
    if (volunteer) {
        showVolunteerModal(volunteer);
    }
}

// Assignments Management
async function loadAssignments() {
    try {
        const filters = {
            status: document.getElementById('assignmentsStatusFilter')?.value || ''
        };

        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);

        state.assignments = await apiRequest(`/assignments?${queryParams.toString()}`);
        renderAssignments();
    } catch (error) {
        showError('Errore nel caricamento delle assegnazioni: ' + error.message);
    }
}

function renderAssignments() {
    const tbody = document.getElementById('assignmentsTableBody');
    
    if (state.assignments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔄</div>
                        <div class="empty-state-text">Nessuna assegnazione trovata</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.assignments.map(assignment => `
        <tr>
            <td>${formatDateTime(assignment.assignment_date)}</td>
            <td>${assignment.material_name} (${assignment.material_barcode})</td>
            <td>${assignment.volunteer_name} (${assignment.volunteer_code})</td>
            <td>${assignment.event_name}</td>
            <td>${formatDate(assignment.expected_return_date)}</td>
            <td>${getAssignmentStatusBadge(assignment.status)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-primary" onclick="viewAssignment(${assignment.id})">
                        👁️ Dettagli
                    </button>
                    ${assignment.status === 'assegnato' ? `
                        <button class="btn btn-sm btn-success" onclick="returnMaterial(${assignment.id})">
                            ↩️ Rientro
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function getAssignmentStatusBadge(status) {
    const badges = {
        'assegnato': '<span class="badge badge-warning">Assegnato</span>',
        'rientrato': '<span class="badge badge-success">Rientrato</span>',
        'danneggiato': '<span class="badge badge-danger">Danneggiato</span>'
    };
    return badges[status] || status;
}

function showAssignmentModal() {
    const modalBody = document.getElementById('modalBody');
    
    const availableMaterials = state.materials.filter(m => m.status === 'disponibile');
    const activeVolunteers = state.volunteers.filter(v => v.active);
    
    modalBody.innerHTML = `
        <h2>Nuova Assegnazione</h2>
        <form id="assignmentForm">
            <div class="form-group">
                <label for="material_id">Materiale *</label>
                <select id="material_id" name="material_id" required>
                    <option value="">Seleziona materiale</option>
                    ${availableMaterials.map(m => `
                        <option value="${m.id}">${m.name} - ${m.barcode} (${m.category})</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="volunteer_id">Volontario *</label>
                <select id="volunteer_id" name="volunteer_id" required>
                    <option value="">Seleziona volontario</option>
                    ${activeVolunteers.map(v => `
                        <option value="${v.id}">${v.full_name} - ${v.code}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="event_name">Nome Evento *</label>
                <input type="text" id="event_name" name="event_name" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="assignment_date">Data Assegnazione *</label>
                    <input type="datetime-local" id="assignment_date" name="assignment_date" required>
                </div>
                <div class="form-group">
                    <label for="expected_return_date">Rientro Previsto</label>
                    <input type="date" id="expected_return_date" name="expected_return_date">
                </div>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    Crea Assegnazione
                </button>
            </div>
        </form>
    `;
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('assignment_date').value = now.toISOString().slice(0, 16);
    
    document.getElementById('assignmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAssignment(new FormData(e.target));
    });
    
    openModal();
}

async function saveAssignment(formData) {
    try {
        const data = Object.fromEntries(formData);
        
        await apiRequest('/assignments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        showSuccess('Assegnazione creata con successo');
        closeModal();
        await loadAssignments();
        await loadMaterials();
    } catch (error) {
        showError(error.message);
    }
}

function viewAssignment(id) {
    const assignment = state.assignments.find(a => a.id === id);
    if (!assignment) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Dettagli Assegnazione</h2>
        <div style="line-height: 2;">
            <p><strong>Materiale:</strong> ${assignment.material_name} (${assignment.material_barcode})</p>
            <p><strong>Categoria:</strong> ${assignment.material_category}</p>
            <p><strong>Volontario:</strong> ${assignment.volunteer_name} (${assignment.volunteer_code})</p>
            <p><strong>Evento:</strong> ${assignment.event_name}</p>
            <p><strong>Data Assegnazione:</strong> ${formatDateTime(assignment.assignment_date)}</p>
            <p><strong>Rientro Previsto:</strong> ${formatDate(assignment.expected_return_date)}</p>
            <p><strong>Stato:</strong> ${getAssignmentStatusBadge(assignment.status)}</p>
            ${assignment.actual_return_date ? `
                <p><strong>Data Rientro Effettivo:</strong> ${formatDateTime(assignment.actual_return_date)}</p>
            ` : ''}
            ${assignment.return_notes ? `
                <p><strong>Note Rientro:</strong> ${assignment.return_notes}</p>
            ` : ''}
            <p><strong>Assegnato da:</strong> ${assignment.assigned_by_name || '-'}</p>
            ${assignment.returned_by_name ? `
                <p><strong>Rientro registrato da:</strong> ${assignment.returned_by_name}</p>
            ` : ''}
        </div>
        <button class="btn btn-primary btn-block" onclick="closeModal()">Chiudi</button>
    `;
    
    openModal();
}

function returnMaterial(assignmentId) {
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>Registra Rientro Materiale</h2>
        <form id="returnForm">
            <input type="hidden" name="id" value="${assignmentId}">
            <div class="form-group">
                <label for="actual_return_date">Data Rientro *</label>
                <input type="datetime-local" id="actual_return_date" name="actual_return_date" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="damaged" name="damaged" value="true">
                    Materiale danneggiato
                </label>
            </div>
            <div class="form-group">
                <label for="return_notes">Note</label>
                <textarea id="return_notes" name="return_notes" placeholder="Inserire eventuali note sul rientro o danni riscontrati"></textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-success btn-block">
                    Conferma Rientro
                </button>
            </div>
        </form>
    `;
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('actual_return_date').value = now.toISOString().slice(0, 16);
    
    document.getElementById('returnForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await processReturn(new FormData(e.target));
    });
    
    openModal();
}

async function processReturn(formData) {
    try {
        const data = Object.fromEntries(formData);
        data.damaged = data.damaged === 'true';
        
        await apiRequest('/assignments', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        showSuccess('Rientro registrato con successo');
        closeModal();
        await loadAssignments();
        await loadMaterials();
        if (data.damaged) {
            await loadMaintenance();
        }
    } catch (error) {
        showError(error.message);
    }
}

// Maintenance Management
async function loadMaintenance() {
    try {
        const filters = {
            outcome: document.getElementById('maintenanceOutcomeFilter')?.value || ''
        };

        const queryParams = new URLSearchParams();
        if (filters.outcome) queryParams.append('outcome', filters.outcome);

        state.maintenance = await apiRequest(`/maintenance?${queryParams.toString()}`);
        renderMaintenance();
    } catch (error) {
        showError('Errore nel caricamento delle manutenzioni: ' + error.message);
    }
}

function renderMaintenance() {
    const tbody = document.getElementById('maintenanceTableBody');
    
    if (state.maintenance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔧</div>
                        <div class="empty-state-text">Nessuna manutenzione trovata</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.maintenance.map(maint => `
        <tr>
            <td>${formatDate(maint.maintenance_date)}</td>
            <td>${maint.material_name} (${maint.material_barcode})</td>
            <td>${maint.maintenance_type}</td>
            <td>${maint.description}</td>
            <td>${formatCurrency(maint.cost)}</td>
            <td>${getMaintenanceOutcomeBadge(maint.outcome)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-primary" onclick="viewMaintenance(${maint.id})">
                        👁️ Dettagli
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editMaintenance(${maint.id})">
                        ✏️ Modifica
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getMaintenanceOutcomeBadge(outcome) {
    const badges = {
        'riparato': '<span class="badge badge-success">Riparato</span>',
        'da_dismettere': '<span class="badge badge-danger">Da dismettere</span>',
        'in_attesa': '<span class="badge badge-warning">In attesa</span>'
    };
    return badges[outcome] || outcome;
}

function showMaintenanceModal(maintenance = null) {
    const isEdit = !!maintenance;
    const modalBody = document.getElementById('modalBody');
    
    const brokenMaterials = state.materials.filter(m => m.status === 'fuori_servizio');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Modifica Manutenzione' : 'Nuova Manutenzione'}</h2>
        <form id="maintenanceForm">
            ${isEdit ? `<input type="hidden" name="id" value="${maintenance.id}">` : ''}
            <div class="form-group">
                <label for="material_id">Materiale *</label>
                <select id="material_id" name="material_id" required ${isEdit ? 'disabled' : ''}>
                    <option value="">Seleziona materiale</option>
                    ${brokenMaterials.map(m => `
                        <option value="${m.id}" ${maintenance?.material_id === m.id ? 'selected' : ''}>
                            ${m.name} - ${m.barcode}
                        </option>
                    `).join('')}
                </select>
                ${isEdit ? `<input type="hidden" name="material_id" value="${maintenance.material_id}">` : ''}
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="maintenance_type">Tipo *</label>
                    <select id="maintenance_type" name="maintenance_type" required>
                        <option value="">Seleziona tipo</option>
                        <option value="riparazione" ${maintenance?.maintenance_type === 'riparazione' ? 'selected' : ''}>Riparazione</option>
                        <option value="manutenzione" ${maintenance?.maintenance_type === 'manutenzione' ? 'selected' : ''}>Manutenzione</option>
                        <option value="controllo" ${maintenance?.maintenance_type === 'controllo' ? 'selected' : ''}>Controllo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="maintenance_date">Data *</label>
                    <input type="date" id="maintenance_date" name="maintenance_date" required 
                           value="${maintenance?.maintenance_date ? maintenance.maintenance_date.split('T')[0] : ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="description">Descrizione *</label>
                <textarea id="description" name="description" required>${maintenance?.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="cost">Costo (€)</label>
                    <input type="number" step="0.01" id="cost" name="cost" 
                           value="${maintenance?.cost || ''}">
                </div>
                <div class="form-group">
                    <label for="performed_by">Eseguito da</label>
                    <input type="text" id="performed_by" name="performed_by" 
                           value="${maintenance?.performed_by || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="outcome">Esito *</label>
                <select id="outcome" name="outcome" required>
                    <option value="">Seleziona esito</option>
                    <option value="riparato" ${maintenance?.outcome === 'riparato' ? 'selected' : ''}>Riparato</option>
                    <option value="da_dismettere" ${maintenance?.outcome === 'da_dismettere' ? 'selected' : ''}>Da dismettere</option>
                    <option value="in_attesa" ${maintenance?.outcome === 'in_attesa' ? 'selected' : ''}>In attesa</option>
                </select>
            </div>
            <div class="form-group">
                <label for="notes">Note</label>
                <textarea id="notes" name="notes">${maintenance?.notes || ''}</textarea>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    ${isEdit ? 'Aggiorna' : 'Crea'} Manutenzione
                </button>
            </div>
        </form>
    `;
    
    // Set default date to today
    if (!isEdit) {
        document.getElementById('maintenance_date').value = new Date().toISOString().split('T')[0];
    }
    
    document.getElementById('maintenanceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveMaintenance(new FormData(e.target), isEdit);
    });
    
    openModal();
}

async function saveMaintenance(formData, isEdit) {
    try {
        const data = Object.fromEntries(formData);
        
        if (isEdit) {
            await apiRequest('/maintenance', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showSuccess('Manutenzione aggiornata con successo');
        } else {
            await apiRequest('/maintenance', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showSuccess('Manutenzione creata con successo');
        }
        
        closeModal();
        await loadMaintenance();
        await loadMaterials();
    } catch (error) {
        showError(error.message);
    }
}

function viewMaintenance(id) {
    const maintenance = state.maintenance.find(m => m.id === id);
    if (!maintenance) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Dettagli Manutenzione</h2>
        <div style="line-height: 2;">
            <p><strong>Materiale:</strong> ${maintenance.material_name} (${maintenance.material_barcode})</p>
            <p><strong>Tipo:</strong> ${maintenance.maintenance_type}</p>
            <p><strong>Data:</strong> ${formatDate(maintenance.maintenance_date)}</p>
            <p><strong>Descrizione:</strong> ${maintenance.description}</p>
            <p><strong>Costo:</strong> ${formatCurrency(maintenance.cost)}</p>
            <p><strong>Eseguito da:</strong> ${maintenance.performed_by || '-'}</p>
            <p><strong>Esito:</strong> ${getMaintenanceOutcomeBadge(maintenance.outcome)}</p>
            <p><strong>Note:</strong> ${maintenance.notes || '-'}</p>
            <p><strong>Creato da:</strong> ${maintenance.created_by_name || '-'}</p>
            <p><strong>Creato il:</strong> ${formatDateTime(maintenance.created_at)}</p>
        </div>
        <button class="btn btn-primary btn-block" onclick="closeModal()">Chiudi</button>
    `;
    
    openModal();
}

function editMaintenance(id) {
    const maintenance = state.maintenance.find(m => m.id === id);
    if (maintenance) {
        showMaintenanceModal(maintenance);
    }
}

// Modal Functions
function openModal() {
    document.getElementById('modalContainer').style.display = 'block';
}

function closeModal() {
    document.getElementById('modalContainer').style.display = 'none';
}

// Navigation
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    // Add active class to clicked button
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            await login(username, password);
            showMainApp();
            errorDiv.style.display = 'none';
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
    
    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            switchSection(section);
        });
    });
    
    // Materials Section
    document.getElementById('addMaterialBtn')?.addEventListener('click', () => showMaterialModal());
    document.getElementById('materialsSearch')?.addEventListener('input', loadMaterials);
    document.getElementById('materialsStatusFilter')?.addEventListener('change', loadMaterials);
    document.getElementById('materialsCategoryFilter')?.addEventListener('change', loadMaterials);
    
    // Volunteers Section
    document.getElementById('addVolunteerBtn')?.addEventListener('click', () => showVolunteerModal());
    document.getElementById('volunteersSearch')?.addEventListener('input', loadVolunteers);
    document.getElementById('volunteersActiveFilter')?.addEventListener('change', loadVolunteers);
    
    // Assignments Section
    document.getElementById('addAssignmentBtn')?.addEventListener('click', showAssignmentModal);
    document.getElementById('assignmentsStatusFilter')?.addEventListener('change', loadAssignments);
    
    // Maintenance Section
    document.getElementById('addMaintenanceBtn')?.addEventListener('click', () => showMaintenanceModal());
    document.getElementById('maintenanceOutcomeFilter')?.addEventListener('change', loadMaintenance);
    
    // Modal Close
    document.querySelector('.close')?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalContainer')) {
            closeModal();
        }
    });
    
    // Users Section (Admin Only)
    document.getElementById('addUserBtn')?.addEventListener('click', () => showUserModal());
    
    // Initialize
    initApp();
});

// Users Management (Admin Only)
async function loadUsers() {
    if (state.user.role !== 'admin') return;
    
    try {
        const users = await apiRequest('/users');
        renderUsers(users);
    } catch (error) {
        showError('Errore nel caricamento degli utenti: ' + error.message);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <div class="empty-state-text">Nessun utente trovato</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.full_name}</td>
            <td>${user.role === 'admin' ? '<span class="badge badge-danger">Admin</span>' : '<span class="badge badge-info">Operatore</span>'}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-warning" onclick="editUser(${user.id}, '${user.username}', '${user.full_name}', '${user.role}')">
                        ✏️ Modifica
                    </button>
                    ${user.id !== state.user.id ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">
                            🗑️ Elimina
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function showUserModal(user = null) {
    const isEdit = !!user;
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Modifica Utente' : 'Nuovo Utente'}</h2>
        <form id="userForm">
            ${isEdit ? `<input type="hidden" name="id" value="${user.id}">` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label for="username">Username *</label>
                    <input type="text" id="username" name="username" required 
                           value="${user?.username || ''}" ${isEdit ? 'readonly' : ''}>
                </div>
                <div class="form-group">
                    <label for="full_name">Nome Completo *</label>
                    <input type="text" id="full_name" name="full_name" required 
                           value="${user?.full_name || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="password">Password ${isEdit ? '(lascia vuoto per non modificare)' : '*'}</label>
                    <input type="password" id="password" name="password" ${isEdit ? '' : 'required'}>
                </div>
                <div class="form-group">
                    <label for="role">Ruolo *</label>
                    <select id="role" name="role" required>
                        <option value="operatore" ${user?.role === 'operatore' ? 'selected' : ''}>Operatore</option>
                        <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block">
                    ${isEdit ? 'Aggiorna' : 'Crea'} Utente
                </button>
            </div>
        </form>
    `;
    
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUser(new FormData(e.target), isEdit);
    });
    
    openModal();
}

async function saveUser(formData, isEdit) {
    try {
        const data = Object.fromEntries(formData);
        
        // Rimuovi password se vuota in modalità edit
        if (isEdit && !data.password) {
            delete data.password;
        }
        
        if (isEdit) {
            await apiRequest('/users', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showSuccess('Utente aggiornato con successo');
        } else {
            await apiRequest('/users', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showSuccess('Utente creato con successo');
        }
        
        closeModal();
        await loadUsers();
    } catch (error) {
        showError(error.message);
    }
}

async function deleteUser(id, username) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente "${username}"?`)) {
        return;
    }
    
    try {
        await apiRequest(`/users?id=${id}`, { method: 'DELETE' });
        showSuccess('Utente eliminato con successo');
        await loadUsers();
    } catch (error) {
        showError(error.message);
    }
}

function editUser(id, username, full_name, role) {
    showUserModal({ id, username, full_name, role });
}
