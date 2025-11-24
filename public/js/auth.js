// ===================================
// AUTHENTICATION MANAGER
// ===================================

const AuthManager = {
    TOKEN_KEY: 'warehouse_auth_token',
    USER_KEY: 'warehouse_user_data',

    // Login utente
    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Errore di autenticazione');
            }

            // Salva token e dati utente
            this.setToken(data.token);
            this.setUser(data.user);

            return data;
        } catch (error) {
            console.error('Errore login:', error);
            throw error;
        }
    },

    // Logout utente - MODIFICATO per redirect a login.html
    logout() {
        console.log('🚪 Logout in corso...');
        
        // Pulisci tutto
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        sessionStorage.clear();
        
        // Redirect a login.html (non più reload)
        window.location.replace('login.html');
    },

    // Salva token
    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    // Recupera token
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    // Salva dati utente
    setUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    // Recupera dati utente
    getUser() {
        const userData = localStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    // Verifica se l'utente è autenticato
    isAuthenticated() {
        return !!this.getToken() || sessionStorage.getItem('isLoggedIn') === 'true';
    },

    // Verifica se l'utente è admin
    isAdmin() {
        const user = this.getUser();
        const ruolo = sessionStorage.getItem('ruolo');
        return (user && user.role === 'admin') || ruolo === 'admin';
    },

    // Verifica se l'utente è operatore
    isOperator() {
        const user = this.getUser();
        const ruolo = sessionStorage.getItem('ruolo');
        return (user && user.role === 'operatore') || ruolo === 'operatore';
    },

    // Ottieni header con autorizzazione
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
};

// NOTA: La gestione del form login è ora in login.html
// Questo file gestisce solo la logica auth generale

// Inizializza gestione logout
document.addEventListener('DOMContentLoaded', () => {
    // Controlla autenticazione solo se siamo in index.html (dashboard)
    if (document.getElementById('dashboardContainer')) {
        console.log('📊 Dashboard caricata - verifica auth');
        
        // Verifica autenticazione
        if (!AuthManager.isAuthenticated()) {
            console.log('❌ Non autenticato - redirect a login');
            window.location.replace('login.html');
            return;
        }
        
        console.log('✅ Utente autenticato');
        
        // Mostra/nascondi elementi in base al ruolo
        const ruolo = sessionStorage.getItem('ruolo');
        if (ruolo === 'admin') {
            const adminLinks = document.querySelectorAll('.admin-only');
            adminLinks.forEach(link => link.style.display = '');
        }
    }
    
    // Gestione bottone logout (se presente)
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Sei sicuro di voler uscire?')) {
                AuthManager.logout();
            }
        });
    }
});
