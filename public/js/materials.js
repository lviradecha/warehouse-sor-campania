// ===================================
// MATERIALS PAGE
// Gestione interfaccia materiali
// ===================================

const MaterialsPage = {
    materials: [],
    currentFilter: {},

    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>Gestione Materiali</h2>
                    <p>Inventario completo magazzino</p>
                </div>
                <button class="btn btn-primary" onclick="MaterialsPage.showAddModal()">
                    <span>➕</span> Nuovo Materiale
                </button>
            </div>

            <!-- Filtri -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" id="searchMaterials" 
                                   placeholder="Cerca per nome, codice a barre..." 
                                   class="form-control">
                        </div>
                        <div class="form-group">
                            <select id="filterStato" class="form-control">
                                <option value="">Tutti gli stati</option>
                                <option value="disponibile">Disponibile</option>
                                <option value="assegnato">Assegnato</option>
                                <option value="in_manutenzione">In Manutenzione</option>
                                <option value="fuori_servizio">Fuori Servizio</option>
                                <option value="dismesso">Dismesso</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <input type="text" id="filterCategoria" 
                                   placeholder="Categoria..." 
                                   class="form-control">
                        </div>
                        <button class="btn btn-secondary" onclick="MaterialsPage.applyFilters()">
                            Filtra
                        </button>
                        <button class="btn btn-secondary" onclick="MaterialsPage.resetFilters()">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabella materiali -->
            <div class="card">
                <div id="materialsTable"></div>
            </div>
        `;

        await this.loadMaterials();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Ricerca in tempo reale
        const searchInput = document.getElementById('searchMaterials');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilter.search = e.target.value;
                    this.loadMaterials();
                }, 300);
            });
        }
    },

    async loadMaterials() {
        try {
            UI.showLoading();
            const data = await API.materials.getAll(this.currentFilter);
            this.materials = data.materials;
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore nel caricamento dei materiali', 'error');
        } finally {
            UI.hideLoading();
        }
    },

    renderTable() {
        const container = document.getElementById('materialsTable');
        
        if (this.materials.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun materiale trovato</div>';
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Codice Barre</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Stato</th>
                        <th>Posizione</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.materials.map(m => this.renderRow(m)).join('')}
                </tbody>
            </table>
        `;
    },

    renderRow(material) {
        return `
            <tr>
                <td><code>${material.codice_barre}</code></td>
                <td><strong>${material.nome}</strong></td>
                <td>${material.categoria || '-'}</td>
                <td><span class="badge badge-${material.stato}">${material.stato}</span></td>
                <td>${material.posizione_magazzino || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" 
                            onclick="MaterialsPage.showDetailModal(${material.id})"
                            title="Dettagli">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-primary" 
                            onclick="MaterialsPage.showEditModal(${material.id})"
                            title="Modifica">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-success" 
                            onclick="MaterialsPage.printBarcode(${material.id})"
                            title="Stampa Etichetta">
                        🏷️
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            onclick="MaterialsPage.deleteMaterial(${material.id})"
                            title="Elimina">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    },

    applyFilters() {
        const stato = document.getElementById('filterStato').value;
        const categoria = document.getElementById('filterCategoria').value;
        
        this.currentFilter = {};
        
        if (stato) this.currentFilter.stato = stato;
        if (categoria) this.currentFilter.categoria = categoria;
        
        this.loadMaterials();
    },

    resetFilters() {
        this.currentFilter = {};
        document.getElementById('searchMaterials').value = '';
        document.getElementById('filterStato').value = '';
        document.getElementById('filterCategoria').value = '';
        this.loadMaterials();
    },

    showAddModal() {
        const modalContent = `
            <h3 class="mb-3">Nuovo Materiale</h3>
            <form id="addMaterialForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Codice a Barre *</label>
                        <input type="text" name="codice_barre" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" name="nome" required class="form-control">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Descrizione</label>
                    <textarea name="descrizione" class="form-control"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoria</label>
                        <input type="text" name="categoria" class="form-control" 
                               list="categorieList">
                        <datalist id="categorieList">
                            <option value="Tende">
                            <option value="Brandine">
                            <option value="Coperte">
                            <option value="Generatori">
                            <option value="Illuminazione">
                            <option value="Cucina">
                            <option value="Sanitario">
                            <option value="Altro">
                        </datalist>
                    </div>
                    <div class="form-group">
                        <label>Quantità</label>
                        <input type="number" name="quantita" value="1" min="1" class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Data Acquisto</label>
                        <input type="date" name="data_acquisto" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Costo (€)</label>
                        <input type="number" name="costo" step="0.01" min="0" class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Fornitore</label>
                        <input type="text" name="fornitore" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Posizione Magazzino</label>
                        <input type="text" name="posizione_magazzino" class="form-control" 
                               placeholder="Es: Scaffale A - Ripiano 3">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="note" class="form-control"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Salva</button>
                    <button type="button" class="btn btn-secondary" 
                            onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addMaterialForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.materials.create(data);
                UI.closeModal();
                UI.showToast('Materiale aggiunto con successo', 'success');
                await this.loadMaterials();
            } catch (error) {
                UI.showToast(error.message, 'error');
            } finally {
                UI.hideLoading();
            }
        });
    },

    async showDetailModal(id) {
        try {
            UI.showLoading();
            const material = await API.materials.getById(id);
            const maintenances = await API.maintenance.getByMaterial(id);
            
            const modalContent = `
                <h3 class="mb-3">Dettaglio Materiale</h3>
                
                <div class="mb-3">
                    <strong>Codice a Barre:</strong> <code>${material.codice_barre}</code>
                    <button class="btn btn-sm btn-success ml-2" 
                            onclick="MaterialsPage.printBarcode(${material.id})">
                        🏷️ Stampa Etichetta
                    </button>
                </div>
                
                <div class="mb-3">
                    <strong>Nome:</strong> ${material.nome}<br>
                    <strong>Categoria:</strong> ${material.categoria || '-'}<br>
                    <strong>Stato:</strong> <span class="badge badge-${material.stato}">${material.stato}</span>
                </div>
                
                ${material.descrizione ? `<div class="mb-3"><strong>Descrizione:</strong><br>${material.descrizione}</div>` : ''}
                
                <div class="mb-3">
                    <strong>Quantità:</strong> ${material.quantita}<br>
                    <strong>Posizione:</strong> ${material.posizione_magazzino || '-'}
                </div>
                
                ${material.data_acquisto ? `<div class="mb-3"><strong>Data Acquisto:</strong> ${UI.formatDate(material.data_acquisto)}</div>` : ''}
                ${material.fornitore ? `<div class="mb-3"><strong>Fornitore:</strong> ${material.fornitore}</div>` : ''}
                ${material.costo ? `<div class="mb-3"><strong>Costo:</strong> ${UI.formatCurrency(material.costo)}</div>` : ''}
                
                ${material.note ? `<div class="mb-3"><strong>Note:</strong><br>${material.note}</div>` : ''}
                
                <hr>
                
                <h4 class="mb-2">Storico Manutenzioni</h4>
                ${maintenances.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Esito</th>
                                <th>Descrizione</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${maintenances.map(m => `
                                <tr>
                                    <td>${UI.formatDate(m.data_inizio)}</td>
                                    <td>${m.tipo}</td>
                                    <td><span class="badge">${m.esito}</span></td>
                                    <td>${m.descrizione}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>Nessuna manutenzione registrata</p>'}
                
                <button class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    async showEditModal(id) {
        try {
            UI.showLoading();
            const material = await API.materials.getById(id);
            
            const modalContent = `
                <h3 class="mb-3">Modifica Materiale</h3>
                <form id="editMaterialForm">
                    <input type="hidden" name="id" value="${material.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Codice a Barre *</label>
                            <input type="text" name="codice_barre" value="${material.codice_barre}" 
                                   required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="nome" value="${material.nome}" 
                                   required class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="stato" class="form-control">
                            <option value="disponibile" ${material.stato === 'disponibile' ? 'selected' : ''}>Disponibile</option>
                            <option value="in_manutenzione" ${material.stato === 'in_manutenzione' ? 'selected' : ''}>In Manutenzione</option>
                            <option value="fuori_servizio" ${material.stato === 'fuori_servizio' ? 'selected' : ''}>Fuori Servizio</option>
                            <option value="dismesso" ${material.stato === 'dismesso' ? 'selected' : ''}>Dismesso</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Descrizione</label>
                        <textarea name="descrizione" class="form-control">${material.descrizione || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoria</label>
                            <input type="text" name="categoria" value="${material.categoria || ''}" 
                                   class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Posizione Magazzino</label>
                            <input type="text" name="posizione_magazzino" 
                                   value="${material.posizione_magazzino || ''}" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" class="form-control">${material.note || ''}</textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" 
                                onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editMaterialForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                const materialId = data.id;
                delete data.id;
                
                try {
                    UI.showLoading();
                    await API.materials.update(materialId, data);
                    UI.closeModal();
                    UI.showToast('Materiale aggiornato con successo', 'success');
                    await this.loadMaterials();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    async deleteMaterial(id) {
        if (!await UI.confirm('Sei sicuro di voler eliminare questo materiale?')) {
            return;
        }

        try {
            UI.showLoading();
            await API.materials.delete(id);
            UI.showToast('Materiale eliminato con successo', 'success');
            await this.loadMaterials();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },

    async printBarcode(id) {
        try {
            const data = await API.materials.generateBarcode(id);
            // Apri pagina di stampa in nuova finestra
            window.open(`/print-barcode.html?code=${data.codice_barre}&name=${encodeURIComponent(data.nome)}`, '_blank');
        } catch (error) {
            UI.showToast('Errore nella generazione del codice a barre', 'error');
        }
    }
};
