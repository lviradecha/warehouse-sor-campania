// ===================================
// MAIN APPLICATION
// Gestione navigazione e inizializzazione
// CON FIX ACTIVE TAB
// ===================================

const App = {
    currentPage: 'dashboard',
    
    // Inizializzazione applicazione
    init() {
        // Verifica autenticazione (già fatto in index.html, ma doppio check)
        if (!AuthManager.isAuthenticated()) {
            window.location.replace('login.html');
            return;
        }

        // Setup dashboard
        this.setupDashboard();
        
        // Carica pagina iniziale (controlla hash URL)
        const initialPage = this.getPageFromHash() || 'dashboard';
        this.loadPage(initialPage);
        
        // Aggiorna tab attivo in base alla pagina iniziale
        this.updateActiveTab(initialPage);
        
        // Setup navigation
        this.setupNavigation();
        
        // Mostra/nascondi elementi admin
        this.setupRoleBasedUI();
        
        // Gestisci cambio hash (back/forward browser)
        this.setupHashNavigation();
    },

    // Setup dashboard (non più show/hide)
    setupDashboard() {
        // Mostra link admin se necessario
        const user = AuthManager.getUser();
        const ruolo = sessionStorage.getItem('ruolo') || sessionStorage.getItem('role');
        
        if ((user && user.role === 'admin') || ruolo === 'admin') {
            const linkAdmin = document.getElementById('linkAdmin');
            if (linkAdmin) {
                linkAdmin.style.display = '';
            }
            document.body.classList.add('admin');
        }
    },

    // Ottieni pagina da hash URL
    getPageFromHash() {
        const hash = window.location.hash.substring(1); // Rimuove il #
        if (!hash) return null;
        
        // Mappa hash → pagina
        const validPages = ['dashboard', 'materials', 'volunteers', 'assignments', 'maintenance', 'users', 'reports'];
        return validPages.includes(hash) ? hash : null;
    },

    // Setup navigazione tramite hash
    setupHashNavigation() {
        window.addEventListener('hashchange', () => {
            const page = this.getPageFromHash();
            if (page) {
                this.loadPage(page);
                this.updateActiveTab(page);
            }
        });
    },

    // Aggiorna tab attivo nella navbar - VERSIONE MIGLIORATA
    updateActiveTab(pageName) {
        console.log('🔄 Aggiornamento tab attivo:', pageName);
        
        // Rimuovi active da tutti i link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Aggiungi active al link corretto
        const targetLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
            console.log('✅ Tab attivato:', pageName);
        } else {
            console.warn('⚠️ Link non trovato per pagina:', pageName);
        }
    },

    // Setup navigazione
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                const page = link.dataset.page;
                
                // Se il link è esterno (non inizia con #), lascialo funzionare normalmente
                if (href && !href.startsWith('#')) {
                    console.log('🔗 Link esterno:', href);
                    return; // Permette automezzi.html e calendario-prenotazioni.html di aprirsi
                }
                
                // Se è link interno (#) ma non ha data-page, ignora (non dovrebbe succedere)
                if (!page) {
                    console.warn('⚠️ Link con href="#" ma senza data-page:', link);
                    return;
                }
                
                // Link interno con data-page: gestisci con SPA routing
                e.preventDefault();
                
                console.log('📄 Navigazione a:', page);
                
                // Aggiorna immediatamente il tab attivo (prima di cambiare hash)
                this.updateActiveTab(page);
                
                // Aggiorna hash URL (triggerà anche hashchange, ma updateActiveTab è idempotente)
                window.location.hash = page;
            });
        });
        
        console.log('✅ Navigazione configurata per', navLinks.length, 'link');
    },

    // Setup UI basato sul ruolo
    setupRoleBasedUI() {
        const user = AuthManager.getUser();
        const ruolo = sessionStorage.getItem('ruolo') || sessionStorage.getItem('role');
        
        // Nascondi elementi solo admin se utente è operatore
        if (user && user.role !== 'admin' && ruolo !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    },

    // Carica pagina
    async loadPage(pageName) {
        this.currentPage = pageName;
        const content = document.getElementById('pageContent');
        
        console.log('📂 Caricamento pagina:', pageName);
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
            console.log('✅ Pagina caricata:', pageName);
        } catch (error) {
            console.error('❌ Errore caricamento pagina:', error);
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
                        <div class="stat-icon green">✅</div>
                        <div class="stat-details">
                            <h3>${data.materials.disponibili || 0}</h3>
                            <p>Disponibili</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow">🔑</div>
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

                <!-- Statistiche Automezzi -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">🚗 Automezzi</h3>
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon red">🚗</div>
                                <div class="stat-details">
                                    <h3>${data.vehicles?.totale || 0}</h3>
                                    <p>Automezzi Totali</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon green">✅</div>
                                <div class="stat-details">
                                    <h3>${data.vehicles?.disponibili || 0}</h3>
                                    <p>Disponibili</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon yellow">🔑</div>
                                <div class="stat-details">
                                    <h3>${data.vehicles?.in_uso || 0}</h3>
                                    <p>In Uso</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon blue">🔧</div>
                                <div class="stat-details">
                                    <h3>${data.vehicles?.in_manutenzione || 0}</h3>
                                    <p>In Manutenzione</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="stats-grid" style="margin-top: 20px;">
                            <div class="stat-card">
                                <div class="stat-icon blue">📏</div>
                                <div class="stat-details">
                                    <h3>${(data.km_stats?.km_ultimo_mese || 0).toLocaleString()}</h3>
                                    <p>Km Ultimo Mese</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon green">⛽</div>
                                <div class="stat-details">
                                    <h3>${data.refueling_stats?.rifornimenti_ultimo_mese || 0}</h3>
                                    <p>Rifornimenti Ultimo Mese</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon yellow">💰</div>
                                <div class="stat-details">
                                    <h3>€ ${(data.refueling_stats?.spesa_totale || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                                    <p>Spesa Carburante</p>
                                </div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon red">⚠️</div>
                                <div class="stat-details">
                                    <h3>${data.upcoming_deadlines?.length || 0}</h3>
                                    <p>Scadenze Prossime</p>
                                </div>
                            </div>
                        </div>

                        ${data.upcoming_deadlines && data.upcoming_deadlines.length > 0 ? `
                            <div style="margin-top: 20px;">
                                <h4 style="color: #d32f2f; margin-bottom: 10px;">⚠️ Scadenze Imminenti (prossimi 30 giorni)</h4>
                                <div class="table-container">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Veicolo</th>
                                                <th>Tipo Scadenza</th>
                                                <th>Data Scadenza</th>
                                                <th>Giorni Rimanenti</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.upcoming_deadlines.map(d => `
                                                <tr>
                                                    <td><strong>${d.targa}</strong> (${d.tipo})</td>
                                                    <td>${d.tipo}</td>
                                                    <td>${UI.formatDate(d.data_scadenza)}</td>
                                                    <td><span class="badge ${d.giorni_rimanenti <= 7 ? 'badge-danger' : 'badge-warning'}">${d.giorni_rimanenti} giorni</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}
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
    console.log('🚀 Inizializzazione applicazione...');
    App.init();
});

// Reload app dopo login
window.addEventListener('storage', (e) => {
    if (e.key === AuthManager.TOKEN_KEY) {
        App.init();
    }
});
