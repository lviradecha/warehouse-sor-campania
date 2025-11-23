// users.js
const UsersPage = {
    async render(container) {
        if (!AuthManager.isAdmin()) {
            container.innerHTML = '<div class="card"><p>Accesso negato</p></div>';
            return;
        }
        container.innerHTML = '<div class="card"><h3>Gestione Utenti</h3><p>Funzionalità in sviluppo...</p></div>';
    }
};
