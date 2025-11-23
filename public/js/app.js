// ===================================
// MAIN APPLICATION
// Gestione navigazione e inizializzazione
// ===================================

const App = {
    currentPage: 'dashboard',
    
    // Inizializzazione applicazione
    init() {
        // Verifica autenticazione
        if (!AuthManager.isAuthenticated()) {
            this.showLogin();
            return;
        }

        // Mostra dashboard
        this.showDashboard();
        
        // Carica pagina iniziale
        this.loadPage('dashboard');
        
        // Setup navigation
        this.setupNavigation();
        
        // Mostra/nascondi elementi admin
        this.setupRoleBasedUI();
    },

    // Mostra schermata login
    showLogin() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('dashboardContainer').style.display = 'none';
    },

    // Mostra dashboard
    showDashboard() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('dashboardContainer').style.display = 'block';
        
        // Mostra link admin se necessario
        const user = AuthManager.getUser();
        if (user && user.role === 'admin') {
            document.getElementById('linkAdmin').style.display = 'flex';
            document.body.classList.add('admin');
        }
    },

    // Setup navigazione
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.loadPage(page);
                
                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    // Setup UI basato sul ruolo
    setupRoleBasedUI() {
        const user = AuthManager.getUser();
        
        // Nascondi elementi solo admin se utente è operatore
        if (user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    },

    // Carica pagina
    async loadPage(pageName) {
        this.currentPage = pageName;
        const content = document.getElementById('pageContent');
        
        UI.showLoading();
        
        try {
            switch(pageName) {
                case 'dashboard':
                    await this.loadDashboard(content);
                    break;
                case 'materials':
                    await MaterialsPage.render(content);
                    break;
                case 'volunteers':
                    await VolunteersPage.render(content);
                    break;
                case 'assignments':
                    await AssignmentsPage.render(content);
                    break;
                case 'maintenance':
                    await MaintenancePage.render(content);
                    break;
                case 'users':
                    if (AuthManager.isAdmin()) {
                        await UsersPage.render(content);
                    } else {
                        content.innerHTML = '<div class="card"><p>Accesso negato</p></div>';
                    }
                    break;
                case 'reports':
                    await ReportsPage.render(content);
                    break;
                default:
                    content.innerHTML = '<div class="card"><p>Pagina non trovata</p></div>';
            }
        } catch (error) {
            console.error('Errore caricamento pagina:', error);
            content.innerHTML = `
                <div class="card">
                    <div class="error-message">
                        Errore nel caricamento della pagina: ${error.message}
                    </div>
                </div>
            `;
        } finally {
            UI.hideLoading();
        }
    },

    // Carica dashboard con statistiche
    async loadDashboard(container) {
        try {
            const data = await API.reports.getDashboard();
            
            container.innerHTML = `
                <div class="page-header mb-3">
                    <h2>Dashboard</h2>
                    <p>Panoramica generale del magazzino</p>
                </div>

                <!-- Statistiche Materiali -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon red">📦</div>
                        <div class="stat-details">
                            <h3>${data.materials.totale || 0}</h3>
                            <p>Materiali Totali</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✓</div>
                        <div class="stat-details">
                            <h3>${data.materials.disponibili || 0}</h3>
                            <p>Disponibili</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon yellow">📤</div>
                        <div class="stat-details">
                            <h3>${data.materials.assegnati || 0}</h3>
                            <p>Assegnati</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon blue">🔧</div>
                        <div class="stat-details">
                            <h3>${data.materials.in_manutenzione || 0}</h3>
                            <p>In Manutenzione</p>
                        </div>
                    </div>
                </div>

                <!-- Statistiche Volontari -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Volontari</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon green">👥</div>
                                <div class="stat-details">
                                    <h3>${data.volunteers.attivi || 0}</h3>
                                    <p>Volontari Attivi</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon yellow">📋</div>
                                <div class="stat-details">
                                    <h3>${data.assignments.in_corso || 0}</h3>
                                    <p>Assegnazioni in Corso</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Attività Recenti -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Attività Recenti</h3>
                    </div>
                    <div class="card-body">
                        <div id="recentActivity">
                            ${this.renderRecentActivity(data.recent_activity || [])}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Errore caricamento dashboard:', error);
            throw error;
        }
    },

    // Render attività recenti
    renderRecentActivity(activities) {
        if (!activities || activities.length === 0) {
            return '<p class="text-center">Nessuna attività recente</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Utente</th>
                            <th>Azione</th>
                            <th>Dettagli</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => `
                            <tr>
                                <td>${UI.formatDateTime(activity.created_at)}</td>
                                <td>${activity.user_nome} ${activity.user_cognome}</td>
                                <td><span class="badge">${activity.azione}</span></td>
                                <td>${activity.dettagli || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};

// Inizializza app al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Reload app dopo login
window.addEventListener('storage', (e) => {
    if (e.key === AuthManager.TOKEN_KEY) {
        App.init();
    }
});
