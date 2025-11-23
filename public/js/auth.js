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
                const loginData = await AuthManager.login(username, password);
                
                // Controlla se è primo login
                if (loginData.user && loginData.user.first_login) {
                    // Mostra modal cambio password obbligatorio
                    this.showFirstLoginPasswordChange(loginData.user);
                } else {
                    // Reindirizza alla dashboard
                    window.location.reload();
                }
            } catch (error) {
                loginError.textContent = error.message;
                loginError.style.display = 'block';
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
    
    // Mostra modal cambio password primo login
    showFirstLoginPasswordChange(user) {
        // Nascondi form login
        const loginContainer = document.getElementById('loginContainer');
        loginContainer.style.display = 'none';
        
        // Crea modal cambio password obbligatorio
        const modalHTML = `
            <div id="firstLoginModal" style="
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background: rgba(0,0,0,0.7); 
                display: flex; 
                align-items: center; 
                justify-content: center;
                z-index: 9999;">
                <div style="
                    background: white; 
                    padding: 30px; 
                    border-radius: 12px; 
                    max-width: 500px; 
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                    <h2 style="color: #d32f2f; margin-bottom: 20px;">🔐 Cambio Password Obbligatorio</h2>
                    <div class="alert alert-warning" style="margin-bottom: 20px;">
                        ⚠️ <strong>Primo accesso:</strong> Devi cambiare la password prima di continuare.
                    </div>
                    <p style="margin-bottom: 20px;">Benvenuto <strong>${user.nome} ${user.cognome}</strong>!</p>
                    <form id="firstLoginPasswordForm">
                        <div class="form-group">
                            <label>Nuova Password *</label>
                            <input type="password" id="newPassword1" required minlength="8" class="form-control" placeholder="Minimo 8 caratteri">
                        </div>
                        <div class="form-group">
                            <label>Conferma Password *</label>
                            <input type="password" id="newPassword2" required minlength="8" class="form-control" placeholder="Ripeti la password">
                        </div>
                        <div id="passwordError" class="error" style="display: none; margin-bottom: 15px;"></div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Cambia Password e Accedi</button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Gestisci form cambio password
        const form = document.getElementById('firstLoginPasswordForm');
        const errorDiv = document.getElementById('passwordError');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pwd1 = document.getElementById('newPassword1').value;
            const pwd2 = document.getElementById('newPassword2').value;
            
            errorDiv.style.display = 'none';
            
            // Validazione
            if (pwd1 !== pwd2) {
                errorDiv.textContent = 'Le password non corrispondono';
                errorDiv.style.display = 'block';
                return;
            }
            
            if (pwd1.length < 8) {
                errorDiv.textContent = 'La password deve essere di almeno 8 caratteri';
                errorDiv.style.display = 'block';
                return;
            }
            
            // Cambia password
            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Aggiornamento in corso...';
                
                const response = await fetch(`/api/utenti/${user.id}/password`, {
                    method: 'PATCH',
                    headers: AuthManager.getAuthHeaders(),
                    body: JSON.stringify({ newPassword: pwd1 })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Errore cambio password');
                }
                
                // Password cambiata con successo!
                alert('✅ Password cambiata con successo! Benvenuto nel sistema.');
                
                // Ricarica pagina per accedere al sistema
                window.location.reload();
                
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cambia Password e Accedi';
            }
        });
    },

    // Gestione logout
    logoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Sei sicuro di voler uscire?')) {
                    AuthManager.logout();
                }
            });
        }
    }
};

// Inizializza gestione logout
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Sei sicuro di voler uscire?')) {
                AuthManager.logout();
            }
        });
    }
});
