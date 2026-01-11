// ===================================
// MATERIALS PAGE
// Gestione interfaccia materiali
// CON RAGGRUPPAMENTO PER CATEGORIE
// ===================================

const MaterialsPage = {
    materials: [],
    currentFilter: {},
    collapsedCategories: new Set(), // Traccia categorie chiuse

    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>Gestione Materiali</h2>
                    <p>Inventario completo magazzino</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-info" onclick="MaterialsImportUI.showImportModal()" title="Importa materiali da file CSV">
                        📥 Importa CSV
                    </button>
                    <button class="btn btn-success" onclick="MaterialsPage.exportCSV()">
                        📤 Esporta CSV
                    </button>
                    <button class="btn btn-primary" onclick="MaterialsPage.showAddModal()">
                        <span>➕</span> Nuovo Materiale
                    </button>
                </div>
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
                            <select id="filterCategoria" class="form-control">
                                <option value="">Tutte le categorie</option>
                            </select>
                        </div>
                        <button class="btn btn-secondary" onclick="MaterialsPage.applyFilters()">
                            Filtra
                        </button>
                        <button class="btn btn-outline" onclick="MaterialsPage.resetFilters()">
                            Reset
                        </button>
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline" onclick="MaterialsPage.expandAllCategories()">
                            ➕ Espandi Tutte
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="MaterialsPage.collapseAllCategories()">
                            ➖ Chiudi Tutte
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tabella materiali raggruppata -->
            <div id="materialsTable"></div>
        `;

        await this.loadMaterials();
        
        // Carica categorie nel filtro
        await this.loadCategoriesIntoSelect('filterCategoria');
        
        this.setupEventListeners();
        
        // Nascondi pulsanti admin per operatori
        this.applyRoleBasedUI();
    },

    applyRoleBasedUI() {
        const isAdmin = AuthManager.isAdmin();
        
        if (!isAdmin) {
            // Nascondi pulsante "Nuovo Materiale"
            const btnNuovo = document.querySelector('button[onclick="MaterialsPage.showAddModal()"]');
            if (btnNuovo) btnNuovo.style.display = 'none';
            
            // Nascondi pulsante "Importa CSV"
            const btnImport = document.querySelector('button[onclick="MaterialsImportUI.showImportModal()"]');
            if (btnImport) btnImport.style.display = 'none';
        }
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
            this.renderGroupedTable();
        } catch (error) {
            UI.showToast('Errore nel caricamento dei materiali', 'error');
            console.error(error);
        } finally {
            UI.hideLoading();
        }
    },

    // NUOVO: Raggruppa materiali per categoria
    groupByCategory() {
        const groups = new Map();
        
        this.materials.forEach(material => {
            const categoryKey = material.categoria_id || 'senza_categoria';
            const categoryName = material.categoria_nome || 'Senza Categoria';
            const categoryIcon = material.categoria_icona || '📦';
            const categoryColor = material.categoria_colore || '#9E9E9E';
            
            if (!groups.has(categoryKey)) {
                groups.set(categoryKey, {
                    id: categoryKey,
                    nome: categoryName,
                    icona: categoryIcon,
                    colore: categoryColor,
                    materials: []
                });
            }
            
            groups.get(categoryKey).materials.push(material);
        });
        
        // Ordina categorie alfabeticamente (Senza Categoria va alla fine)
        return Array.from(groups.values()).sort((a, b) => {
            if (a.id === 'senza_categoria') return 1;
            if (b.id === 'senza_categoria') return -1;
            return a.nome.localeCompare(b.nome);
        });
    },

    // NUOVO: Render tabella raggruppata
    renderGroupedTable() {
        const container = document.getElementById('materialsTable');
        
        if (this.materials.length === 0) {
            container.innerHTML = '<div class="card p-3 text-center">Nessun materiale trovato</div>';
            return;
        }

        const groups = this.groupByCategory();
        
        container.innerHTML = groups.map(group => this.renderCategoryGroup(group)).join('');
        
        // EVENT DELEGATION: Aggiungi listener per i click sulle category-header
        const categoryHeaders = container.querySelectorAll('.category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const categoryId = e.currentTarget.getAttribute('data-category-id');
                this.toggleCategory(categoryId);
            });
        });
    },

    // NUOVO: Render singolo gruppo categoria - CON SIMBOLI ROBUSTI
    renderCategoryGroup(group) {
        // IMPORTANTE: Converti group.id a stringa per matching coerente con il Set
        const id = String(group.id);
        const isCollapsed = this.collapsedCategories.has(id);
        const totalQty = group.materials.reduce((sum, m) => sum + (m.quantita || 0), 0);
        const totalImpegnati = group.materials.reduce((sum, m) => sum + (m.quantita_assegnata || 0), 0);
        const totalDisponibili = totalQty - totalImpegnati;
        
        // USA CARATTERI UNICODE DIRETTI (più compatibili in template strings)
        const expandIcon = isCollapsed ? '▶' : '▼';
        
        console.log(`🎨 Rendering categoria ${group.nome} (ID: ${group.id} → "${id}"):`, {
            isCollapsed,
            expandIcon,
            materialsCount: group.materials.length,
            inSet: this.collapsedCategories.has(id)
        });
        
        return `
            <div class="card mb-3" style="border-left: 4px solid ${group.colore};">
                <div class="category-header" 
                     data-category-id="${id}"
                     style="
                        cursor: pointer; 
                        padding: 15px 20px; 
                        background: linear-gradient(135deg, ${group.colore}15 0%, ${group.colore}05 100%);
                        border-bottom: 1px solid ${group.colore}30;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        user-select: none;
                     ">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 28px;">${group.icona}</span>
                        <div>
                            <h4 style="margin: 0; color: ${group.colore}; font-weight: 600;">
                                ${group.nome}
                            </h4>
                            <small style="color: #666;">
                                ${group.materials.length} materiali • 
                                Tot: ${totalQty} • 
                                Disp: <strong style="color: ${totalDisponibili > 0 ? '#28a745' : '#dc3545'}">${totalDisponibili}</strong> • 
                                Imp: ${totalImpegnati}
                            </small>
                        </div>
                    </div>
                    <span style="font-size: 24px; transition: transform 0.2s;">
                        ${expandIcon}
                    </span>
                </div>
                
                <div id="category-${id}" style="display: ${isCollapsed ? 'none' : 'block'};">
                    <table class="table">
                        <thead>
                            <tr>
                                <th width="120">Codice Barre</th>
                                <th>Nome</th>
                                <th width="100">Qtà Tot</th>
                                <th width="100">Disponibili</th>
                                <th width="100">Impegnati</th>
                                <th width="120">Stato</th>
                                <th width="150">Posizione</th>
                                <th width="200">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.materials.map(m => this.renderMaterialRow(m)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    toggleCategory(categoryId) {
        // IMPORTANTE: Converti categoryId nel tipo corretto (potrebbe essere stringa o numero)
        // Usiamo toString() per essere sicuri che sia sempre una stringa nel Set
        const id = String(categoryId);
        
        console.log('🔄 toggleCategory chiamato per:', categoryId, '(tipo:', typeof categoryId, '→ converti a:', id, ')');
        console.log('📊 Stato PRIMA:', {
            collapsed: Array.from(this.collapsedCategories),
            isCollapsed: this.collapsedCategories.has(id)
        });
        
        if (this.collapsedCategories.has(id)) {
            this.collapsedCategories.delete(id);
            console.log('✅ Categoria espansa:', id);
        } else {
            this.collapsedCategories.add(id);
            console.log('➖ Categoria collassata:', id);
        }
        
        console.log('📊 Stato DOPO:', {
            collapsed: Array.from(this.collapsedCategories),
            isCollapsed: this.collapsedCategories.has(id)
        });
        
        console.log('🔄 Chiamo renderGroupedTable()...');
        this.renderGroupedTable();
        console.log('✅ renderGroupedTable() completato');
    },

    expandAllCategories() {
        this.collapsedCategories.clear();
        this.renderGroupedTable();
    },

    collapseAllCategories() {
        const groups = this.groupByCategory();
        groups.forEach(group => {
            // IMPORTANTE: Converti a stringa per coerenza
            this.collapsedCategories.add(String(group.id));
        });
        this.renderGroupedTable();
    },

    renderMaterialRow(material) {
        const isAdmin = AuthManager.isAdmin();
        const quantitaTotale = material.quantita || 0;
        const quantitaImpegnata = material.quantita_assegnata || 0;
        const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
        
        const statoClass = {
            'disponibile': 'badge-success',
            'assegnato': 'badge-warning',
            'in_manutenzione': 'badge-info',
            'fuori_servizio': 'badge-danger',
            'dismesso': 'badge-secondary'
        }[material.stato] || 'badge-secondary';
        
        const statoText = {
            'disponibile': 'Disponibile',
            'assegnato': 'Assegnato',
            'in_manutenzione': 'In Manutenzione',
            'fuori_servizio': 'Fuori Servizio',
            'dismesso': 'Dismesso'
        }[material.stato] || material.stato;
        
        return `
            <tr>
                <td><code>${material.codice_barre}</code></td>
                <td>
                    <strong>${material.nome}</strong>
                    ${material.descrizione ? `<br><small class="text-muted">${material.descrizione}</small>` : ''}
                </td>
                <td class="text-center">${quantitaTotale}</td>
                <td class="text-center">
                    <strong style="color: ${quantitaDisponibile > 0 ? '#28a745' : '#dc3545'}">
                        ${quantitaDisponibile}
                    </strong>
                </td>
                <td class="text-center">${quantitaImpegnata}</td>
                <td><span class="badge ${statoClass}">${statoText}</span></td>
                <td>${material.posizione_magazzino || '-'}</td>
                <td>
                    <div class="btn-group-vertical">
                        <button class="btn btn-sm btn-info btn-icon" 
                                onclick="MaterialsPage.showDetailModal(${material.id})"
                                title="Dettagli">
                            ℹ️
                        </button>
                        ${isAdmin ? `
                        <button class="btn btn-sm btn-primary btn-icon" 
                                onclick="MaterialsPage.showEditModal(${material.id})"
                                title="Modifica">
                            ✏️
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-success btn-icon" 
                                onclick="MaterialsPage.printBarcode(${material.id})"
                                title="Stampa Etichetta">
                            🏷️
                        </button>
                        ${isAdmin ? `
                        <button class="btn btn-sm btn-danger btn-icon" 
                                onclick="MaterialsPage.deleteMaterial(${material.id})"
                                title="Elimina">
                            🗑️
                        </button>
                        ` : ''}
                    </div>
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

    async showAddModal() {
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
                        <select name="categoria_id" class="form-control" id="categoriaSelect">
                            <option value="">Caricamento...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantità *</label>
                        <input type="number" name="quantita" value="1" min="0" required class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="stato" class="form-control">
                            <option value="disponibile">Disponibile</option>
                            <option value="assegnato">Assegnato</option>
                            <option value="in_manutenzione">In Manutenzione</option>
                            <option value="fuori_servizio">Fuori Servizio</option>
                            <option value="dismesso">Dismesso</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Posizione Magazzino</label>
                        <input type="text" name="posizione_magazzino" class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Data Acquisto</label>
                        <input type="date" name="data_acquisto" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Fornitore</label>
                        <input type="text" name="fornitore" class="form-control">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Costo (€)</label>
                        <input type="number" name="costo" step="0.01" min="0" class="form-control">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="note" class="form-control"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Salva</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        // Carica categorie con retry e logging
        console.log('🔍 Inizio caricamento categorie per modal...');
        setTimeout(async () => {
            try {
                await this.loadCategoriesIntoSelect('categoriaSelect');
                console.log('✅ Categorie caricate con successo');
            } catch (error) {
                console.error('❌ Errore caricamento categorie:', error);
                const select = document.getElementById('categoriaSelect');
                if (select) {
                    select.innerHTML = '<option value="">Errore caricamento categorie</option>';
                }
            }
        }, 100);
        
        // Gestisci submit
        setTimeout(() => {
            const form = document.getElementById('addMaterialForm');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    await this.saveMaterial(new FormData(e.target));
                };
            }
        }, 100);
    },

    async showEditModal(id) {
        try {
            const material = await API.materials.getById(id);
            
            const modalContent = `
                <h3 class="mb-3">Modifica Materiale</h3>
                <form id="editMaterialForm">
                    <input type="hidden" name="id" value="${material.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Codice a Barre *</label>
                            <input type="text" name="codice_barre" value="${material.codice_barre}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="nome" value="${material.nome}" required class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Descrizione</label>
                        <textarea name="descrizione" class="form-control">${material.descrizione || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoria</label>
                            <select name="categoria_id" class="form-control" id="categoriaSelectEdit">
                                <option value="">Caricamento...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantità *</label>
                            <input type="number" name="quantita" value="${material.quantita}" min="0" required class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Stato</label>
                            <select name="stato" class="form-control">
                                <option value="disponibile" ${material.stato === 'disponibile' ? 'selected' : ''}>Disponibile</option>
                                <option value="assegnato" ${material.stato === 'assegnato' ? 'selected' : ''}>Assegnato</option>
                                <option value="in_manutenzione" ${material.stato === 'in_manutenzione' ? 'selected' : ''}>In Manutenzione</option>
                                <option value="fuori_servizio" ${material.stato === 'fuori_servizio' ? 'selected' : ''}>Fuori Servizio</option>
                                <option value="dismesso" ${material.stato === 'dismesso' ? 'selected' : ''}>Dismesso</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Posizione Magazzino</label>
                            <input type="text" name="posizione_magazzino" value="${material.posizione_magazzino || ''}" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data Acquisto</label>
                            <input type="date" name="data_acquisto" value="${material.data_acquisto || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Fornitore</label>
                            <input type="text" name="fornitore" value="${material.fornitore || ''}" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Costo (€)</label>
                            <input type="number" name="costo" value="${material.costo || ''}" step="0.01" min="0" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="note" class="form-control">${material.note || ''}</textarea>
                    </div>
                    
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            // Carica categorie con retry e logging
            console.log('🔍 Inizio caricamento categorie per modal edit...');
            setTimeout(async () => {
                try {
                    await this.loadCategoriesIntoSelect('categoriaSelectEdit', material.categoria_id);
                    console.log('✅ Categorie caricate con successo');
                } catch (error) {
                    console.error('❌ Errore caricamento categorie:', error);
                    const select = document.getElementById('categoriaSelectEdit');
                    if (select) {
                        select.innerHTML = '<option value="">Errore caricamento categorie</option>';
                    }
                }
            }, 100);
            
            // Gestisci submit
            setTimeout(() => {
                const form = document.getElementById('editMaterialForm');
                if (form) {
                    form.onsubmit = async (e) => {
                        e.preventDefault();
                        await this.saveMaterial(new FormData(e.target), material.id);
                    };
                }
            }, 100);
        } catch (error) {
            UI.showToast('Errore nel caricamento del materiale', 'error');
            console.error(error);
        }
    },

    async showDetailModal(id) {
        try {
            const material = await API.materials.getById(id);
            
            const quantitaTotale = material.quantita || 0;
            const quantitaImpegnata = material.quantita_assegnata || 0;
            const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
            
            const modalContent = `
                <h3 class="mb-3">Dettagli Materiale</h3>
                
                <div class="detail-grid">
                    <div class="detail-row">
                        <strong>Codice a Barre:</strong>
                        <span><code>${material.codice_barre}</code></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Nome:</strong>
                        <span>${material.nome}</span>
                    </div>
                    
                    ${material.descrizione ? `
                    <div class="detail-row">
                        <strong>Descrizione:</strong>
                        <span>${material.descrizione}</span>
                    </div>
                    ` : ''}
                    
                    <div class="detail-row">
                        <strong>Categoria:</strong>
                        <span>${material.categoria_nome ? `${material.categoria_icona} ${material.categoria_nome}` : 'Nessuna'}</span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Quantità Totale:</strong>
                        <span><strong>${quantitaTotale}</strong></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Disponibili:</strong>
                        <span style="color: ${quantitaDisponibile > 0 ? '#28a745' : '#dc3545'}">
                            <strong>${quantitaDisponibile}</strong>
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Impegnati:</strong>
                        <span><strong>${quantitaImpegnata}</strong></span>
                    </div>
                    
                    <div class="detail-row">
                        <strong>Stato:</strong>
                        <span>${material.stato}</span>
                    </div>
                    
                    ${material.posizione_magazzino ? `
                    <div class="detail-row">
                        <strong>Posizione:</strong>
                        <span>${material.posizione_magazzino}</span>
                    </div>
                    ` : ''}
                    
                    ${material.data_acquisto ? `
                    <div class="detail-row">
                        <strong>Data Acquisto:</strong>
                        <span>${new Date(material.data_acquisto).toLocaleDateString('it-IT')}</span>
                    </div>
                    ` : ''}
                    
                    ${material.fornitore ? `
                    <div class="detail-row">
                        <strong>Fornitore:</strong>
                        <span>${material.fornitore}</span>
                    </div>
                    ` : ''}
                    
                    ${material.costo ? `
                    <div class="detail-row">
                        <strong>Costo:</strong>
                        <span>€ ${parseFloat(material.costo).toFixed(2)}</span>
                    </div>
                    ` : ''}
                    
                    ${material.note ? `
                    <div class="detail-row">
                        <strong>Note:</strong>
                        <span>${material.note}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary" onclick="MaterialsPage.showEditModal(${material.id})">
                        ✏️ Modifica
                    </button>
                    <button class="btn btn-success" onclick="MaterialsPage.printBarcode(${material.id})">
                        🏷️ Stampa Etichetta
                    </button>
                    <button class="btn btn-secondary" onclick="UI.closeModal()">Chiudi</button>
                </div>
            `;
            
            UI.showModal(modalContent);
        } catch (error) {
            UI.showToast('Errore nel caricamento dei dettagli', 'error');
            console.error(error);
        }
    },

    async saveMaterial(formData, id = null) {
        try {
            const data = {};
            formData.forEach((value, key) => {
                // Converti stringhe vuote in null per campi opzionali
                if (value === '') {
                    data[key] = null;
                } else {
                    data[key] = value;
                }
            });
            
            if (id) {
                await API.materials.update(id, data);
                UI.showToast('Materiale aggiornato con successo', 'success');
            } else {
                await API.materials.create(data);
                UI.showToast('Materiale creato con successo', 'success');
            }
            
            UI.closeModal();
            await this.loadMaterials();
        } catch (error) {
            UI.showToast(error.message || 'Errore nel salvataggio', 'error');
            console.error(error);
        }
    },

    async deleteMaterial(id) {
        if (!confirm('Sei sicuro di voler eliminare questo materiale?')) {
            return;
        }
        
        try {
            await API.materials.delete(id);
            UI.showToast('Materiale eliminato con successo', 'success');
            await this.loadMaterials();
        } catch (error) {
            UI.showToast(error.message || 'Errore nell\'eliminazione', 'error');
            console.error(error);
        }
    },

    async printBarcode(id) {
        try {
            const material = await API.materials.getById(id);
            window.open(`print-barcode.html?code=${material.codice_barre}&name=${encodeURIComponent(material.nome)}`, '_blank');
        } catch (error) {
            UI.showToast('Errore nella generazione del codice a barre', 'error');
            console.error(error);
        }
    },

    async loadCategoriesIntoSelect(selectId, selectedId = null) {
        console.log(`📋 loadCategoriesIntoSelect chiamata per: ${selectId}`);
        
        try {
            console.log('🌐 Chiamata API.materialCategories.getAll()...');
            const categories = await API.materialCategories.getAll();
            console.log(`✅ Ricevute ${categories.length} categorie:`, categories);
            
            const select = document.getElementById(selectId);
            
            if (!select) {
                console.error(`❌ Select con id '${selectId}' non trovato nel DOM`);
                return;
            }
            
            console.log(`✅ Select trovato: ${selectId}`);
            
            // Pulisci e inizializza il select
            select.innerHTML = '<option value="">Seleziona categoria...</option>';
            
            // Aggiungi le categorie
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icona} ${cat.nome}`;
                if (selectedId && cat.id == selectedId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
            
            console.log(`✅ Select popolato con ${categories.length} categorie`);
            
        } catch (error) {
            console.error('❌ Errore caricamento categorie:', error);
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Errore: ' + error.message + '</option>';
            }
            UI.showToast('Errore nel caricamento delle categorie: ' + error.message, 'error');
            throw error;
        }
    },

    async exportCSV() {
        try {
            const data = await API.materials.getAll({});
            let materials = data.materials;
            
            if (materials.length === 0) {
                UI.showToast('Nessun materiale da esportare', 'warning');
                return;
            }
            
            // ORDINA per categoria, poi per nome
            materials.sort((a, b) => {
                const catA = a.categoria_nome || 'Senza Categoria';
                const catB = b.categoria_nome || 'Senza Categoria';
                
                // Senza Categoria va alla fine
                if (catA === 'Senza Categoria' && catB !== 'Senza Categoria') return 1;
                if (catB === 'Senza Categoria' && catA !== 'Senza Categoria') return -1;
                
                // Ordina per categoria
                const catCompare = catA.localeCompare(catB);
                if (catCompare !== 0) return catCompare;
                
                // Poi per nome
                return (a.nome || '').localeCompare(b.nome || '');
            });
            
            // Intestazioni CSV
            const headers = [
                'categoria',
                'codice_barre',
                'nome',
                'descrizione',
                'quantita',
                'disponibili',
                'impegnati',
                'stato',
                'posizione_magazzino',
                'data_acquisto',
                'fornitore',
                'costo',
                'note'
            ];
            
            // Converti dati in CSV con separatori categoria
            const csvRows = [headers.join(',')];
            
            let currentCategory = null;
            
            materials.forEach(m => {
                const categoria = m.categoria_nome || 'Senza Categoria';
                
                // Aggiungi riga separatrice quando cambia categoria
                if (categoria !== currentCategory) {
                    currentCategory = categoria;
                    // Riga vuota separatore
                    csvRows.push('');
                    // Riga intestazione categoria
                    csvRows.push(`"=== ${categoria} ==="`);
                }
                
                const quantitaTotale = m.quantita || 0;
                const quantitaImpegnata = m.quantita_assegnata || 0;
                const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
                
                const row = [
                    categoria,
                    m.codice_barre || '',
                    `"${(m.nome || '').replace(/"/g, '""')}"`,
                    `"${(m.descrizione || '').replace(/"/g, '""')}"`,
                    quantitaTotale,
                    quantitaDisponibile,
                    quantitaImpegnata,
                    m.stato || 'disponibile',
                    m.posizione_magazzino || '',
                    m.data_acquisto || '',
                    m.fornitore || '',
                    m.costo || '',
                    `"${(m.note || '').replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
            });
            
            // Download file
            const csv = csvRows.join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `materiali_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            UI.showToast(`Export completato: ${materials.length} materiali raggruppati per categoria`, 'success');
        } catch (error) {
            UI.showToast('Errore nell\'export', 'error');
            console.error(error);
        }
    }
};
