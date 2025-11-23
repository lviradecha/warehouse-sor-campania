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

    // Logout utente
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        window.location.reload();
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
        return !!this.getToken();
    },

    // Verifica se l'utente è admin
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    // Verifica se l'utente è operatore
    isOperator() {
        const user = this.getUser();
        return user && user.role === 'operatore';
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

// Gestione form login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            loginError.style.display = 'none';
            loginError.textContent = '';

            // Mostra loading
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Accesso in corso...';

            try {
                await AuthManager.login(username, password);
                
                // Reindirizza alla dashboard
                window.location.reload();
            } catch (error) {
                loginError.textContent = error.message;
                loginError.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Gestione logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Sei sicuro di voler uscire?')) {
                AuthManager.logout();
            }
        });
    }
});
