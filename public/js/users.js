
// users.js
const UsersPage = {
    async render(container) {
        if (!AuthManager.isAdmin()) {
            container.innerHTML = '<div class="card"><p>Accesso negato</p></div>';
            return;
