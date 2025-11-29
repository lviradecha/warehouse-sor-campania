// ===================================
// API MANAGER
// Gestione centralizzata chiamate API
// ===================================

const API = {
    baseURL: '/api',

    // Helper per le chiamate API
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = AuthManager.getAuthHeaders();

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Errore nella richiesta');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // ===================================
    // MATERIALI
    // ===================================
    materials: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/materiali?${params}`);
        },
        
        getById: (id) => API.request(`/materiali/${id}`),
        
        create: (data) => API.request('/materiali', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/materiali/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/materiali/${id}`, {
            method: 'DELETE'
        }),
        
        updateStatus: (id, stato, note = '') => API.request(`/materiali/${id}/stato`, {
            method: 'PATCH',
            body: JSON.stringify({ stato, note })
        }),

        generateBarcode: (id) => API.request(`/materiali/${id}/barcode`)
    },

    // ===================================
    // CATEGORIE MATERIALI
    // ===================================
    materialCategories: {
        getAll: () => API.request(`/categorie-materiali?_t=${Date.now()}`),
        
        getById: (id) => API.request(`/categorie-materiali/${id}`),
        
        create: (data) => API.request('/categorie-materiali', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/categorie-materiali/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/categorie-materiali/${id}`, {
            method: 'DELETE'
        })
    },

    // ===================================
    // VOLONTARI
    // ===================================
    volunteers: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/volontari?${params}`);
        },
        
        getById: (id) => API.request(`/volontari/${id}`),
        
        create: (data) => API.request('/volontari', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/volontari/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/volontari/${id}`, {
            method: 'DELETE'
        }),

        getAssignments: (id) => API.request(`/volontari/${id}/assegnazioni`)
    },

    // ===================================
    // ASSEGNAZIONI
    // ===================================
    assignments: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/assegnazioni?${params}`);
        },
        
        getById: (id) => API.request(`/assegnazioni/${id}`),
        
        create: (data) => API.request('/assegnazioni', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        returnMaterial: (id, data) => API.request(`/assegnazioni/${id}/rientro`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/assegnazioni/${id}`, {
            method: 'DELETE'
        })
    },

    // ===================================
    // MANUTENZIONI
    // ===================================
    maintenance: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/manutenzioni?${params}`);
        },
        
        getById: (id) => API.request(`/manutenzioni/${id}`),
        
        create: (data) => API.request('/manutenzioni', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/manutenzioni/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        complete: (id, data) => API.request(`/manutenzioni/${id}/completa`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        
        getByMaterial: (materialId) => API.request(`/materiali/${materialId}/manutenzioni`)
    },

    // ===================================
    // UTENTI
    // ===================================
    users: {
        getAll: () => API.request('/utenti'),
        
        getById: (id) => API.request(`/utenti/${id}`),
        
        create: (data) => API.request('/utenti', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/utenti/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/utenti/${id}`, {
            method: 'DELETE'
        }),
        
        changePassword: (id, passwords) => API.request(`/utenti/${id}/password`, {
            method: 'PATCH',
            body: JSON.stringify(passwords)
        })
    },


    // ===================================
    // AUTOMEZZI / VEICOLI
    // ===================================
    vehicles: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/automezzi?${params}`);
        },
        
        getById: (id) => API.request(`/automezzi/${id}`),
        
        create: (data) => API.request('/automezzi', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/automezzi/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/automezzi/${id}`, {
            method: 'DELETE'
        }),
        
        // Assegnazioni veicoli
        assign: (data) => API.request('/automezzi/assegnazioni', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        getAllAssignments: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/automezzi/assegnazioni?${params}`);
        },
        
        getAssignment: (id) => API.request(`/automezzi/assegnazioni/${id}`),
        
        getAssignments: (vehicleId) => API.request(`/automezzi/${vehicleId}/assegnazioni`),
        
        returnVehicle: (assignmentId, data) => API.request(`/automezzi/assegnazioni/${assignmentId}/rientro`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        
        // Rifornimenti
        getRefueling: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/automezzi/rifornimenti?${params}`);
        },
        
        addRefueling: (data) => API.request('/automezzi/rifornimenti', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // ===================================
    // REPORT & STATISTICHE
    // ===================================
    reports: {
        getDashboard: () => API.request('/report/dashboard'),
        
        getMaterialsReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/materiali?${params}`);
        },
        
        getAssignmentsReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/assegnazioni?${params}`);
        },
        
        getActivityLog: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/attivita?${params}`);
        }
        ,

        // Report Automezzi
        getVehiclesUsageReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/automezzi-utilizzo?${params}`);
        },

        getVehiclesAssignmentsReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/automezzi-assegnazioni?${params}`);
        },

        getVehiclesMaintenanceReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/automezzi-manutenzioni?${params}`);
        },

        getVehiclesRefuelingReport: (filters = {}) => {
            const params = new URLSearchParams(filters);
            return API.request(`/report/automezzi-rifornimenti?${params}`);
        }
    }
};

// ===================================
// UI HELPERS
// ===================================

const UI = {
    // Mostra loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    },

    // Nascondi loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    },

    // Mostra toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span style="font-size: 1.25rem;">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Rimuovi dopo 4 secondi
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Mostra modal
    showModal(content) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = content;
        modal.style.display = 'flex';
        
        // Chiudi modal
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }
        
        // Chiudi cliccando fuori
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        };
    },

    // Chiudi modal
    closeModal() {
        const modal = document.getElementById('modal');
        modal.style.display = 'none';
    },

    // Formatta data
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Formatta data e ora
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Formatta valuta
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },

    // Conferma azione
    async confirm(message) {
        return confirm(message);
    }
};

// Aggiungi stile per animazione slideOut
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
