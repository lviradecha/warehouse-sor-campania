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
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success" onclick="MaterialsPage.exportCSV()">
                        📥 Esporta CSV
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
        
        // Carica categorie nel filtro
        await this.loadCategoriesIntoSelect('filterCategoria');
        
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
                        <th style="text-align: center;">Disponibili</th>
                        <th style="text-align: center;">Impegnati</th>
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
        // Calcola quantità disponibili e impegnate
        const quantitaTotale = material.quantita || 0;
        const quantitaImpegnata = material.quantita_assegnata || 0;
        const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
        
        // Badge categoria con colore e icona
        const categoriaBadge = material.categoria_nome 
            ? `<span class="badge-categoria" style="background-color: ${material.categoria_colore || '#9E9E9E'}">
                ${material.categoria_icona || ''} ${material.categoria_nome}
               </span>`
            : '<span style="color: #999;">-</span>';
        
        // Classe CSS per evidenziare disponibili = 0
        const disponibiliClass = quantitaDisponibile === 0 ? 'text-danger' : 'text-success';
        
        return `
            <tr>
                <td><code>${material.codice_barre}</code></td>
                <td><strong>${material.nome}</strong></td>
                <td>${categoriaBadge}</td>
                <td><span class="badge badge-${material.stato}">${material.stato}</span></td>
                <td style="text-align: center;">
                    <strong class="${disponibiliClass}" style="font-size: 1.1em;">
                        ${quantitaDisponibile}
                    </strong>
                </td>
                <td style="text-align: center;">
                    <strong class="text-warning" style="font-size: 1.1em;">
                        ${quantitaImpegnata}
                    </strong>
                </td>
                <td>${material.posizione_magazzino || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary btn-icon" 
                                onclick="MaterialsPage.showDetailModal(${material.id})"
                                title="Dettagli">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-primary btn-icon" 
                                onclick="MaterialsPage.showEditModal(${material.id})"
                                title="Modifica">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-success btn-icon" 
                                onclick="MaterialsPage.printBarcode(${material.id})"
                                title="Stampa Etichetta">
                            🏷️
                        </button>
                        <button class="btn btn-sm btn-danger btn-icon" 
                                onclick="MaterialsPage.deleteMaterial(${material.id})"
                                title="Elimina">
                            🗑️
                        </button>
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
                            <option value="">Seleziona categoria...</option>
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
                            <option value="in_manutenzione">In Manutenzione</option>
                            <option value="fuori_servizio">Fuori Servizio</option>
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
                
                <div class="form-group">
                    <label>Costo (€)</label>
                    <input type="number" name="costo" step="0.01" min="0" class="form-control">
                </div>
                
                <div class="form-group">
                    <label>Note</label>
                    <textarea name="note" class="form-control"></textarea>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Crea Materiale</button>
                    <button type="button" class="btn btn-secondary" 
                            onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        // Carica categorie nel select
        await this.loadCategoriesIntoSelect('categoriaSelect');
        
        document.getElementById('addMaterialForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.materials.create(data);
                UI.closeModal();
                UI.showToast('Materiale creato con successo', 'success');
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
            const material = await API.materials.getOne(id);
            
            // Calcola quantità
            const quantitaTotale = material.quantita || 0;
            const quantitaImpegnata = material.quantita_assegnata || 0;
            const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
            
            const modalContent = `
                <h3 class="mb-3">Dettagli Materiale</h3>
                <div class="detail-view">
                    <div class="detail-row">
                        <strong>Codice a Barre:</strong>
                        <span><code>${material.codice_barre}</code></span>
                    </div>
                    <div class="detail-row">
                        <strong>Nome:</strong>
                        <span>${material.nome}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Categoria:</strong>
                        <span>${material.categoria_nome || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Stato:</strong>
                        <span class="badge badge-${material.stato}">${material.stato}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Quantità Totale:</strong>
                        <span>${quantitaTotale}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Disponibili:</strong>
                        <span class="text-success" style="font-weight: bold; font-size: 1.1em;">
                            ${quantitaDisponibile}
                        </span>
                    </div>
                    <div class="detail-row">
                        <strong>Impegnati:</strong>
                        <span class="text-warning" style="font-weight: bold; font-size: 1.1em;">
                            ${quantitaImpegnata}
                        </span>
                    </div>
                    <div class="detail-row">
                        <strong>Posizione:</strong>
                        <span>${material.posizione_magazzino || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Descrizione:</strong>
                        <span>${material.descrizione || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Data Acquisto:</strong>
                        <span>${material.data_acquisto || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Fornitore:</strong>
                        <span>${material.fornitore || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Costo:</strong>
                        <span>${material.costo ? '€' + material.costo : '-'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Note:</strong>
                        <span>${material.note || '-'}</span>
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary" onclick="MaterialsPage.showEditModal(${id}); UI.closeModal();">
                        Modifica
                    </button>
                    <button class="btn btn-secondary" onclick="UI.closeModal()">Chiudi</button>
                </div>
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
            const material = await API.materials.getOne(id);
            
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
                            <select name="categoria_id" class="form-control" id="categoriaSelectEdit">
                                <option value="">Seleziona categoria...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Quantità Totale *</label>
                            <input type="number" name="quantita" value="${material.quantita || 0}" 
                                   min="0" required class="form-control">
                            <small class="form-text text-muted">
                                Impegnati: ${material.quantita_assegnata || 0}
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Posizione Magazzino</label>
                        <input type="text" name="posizione_magazzino" 
                               value="${material.posizione_magazzino || ''}" class="form-control">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data Acquisto</label>
                            <input type="date" name="data_acquisto" 
                                   value="${material.data_acquisto || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Fornitore</label>
                            <input type="text" name="fornitore" 
                                   value="${material.fornitore || ''}" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Costo (€)</label>
                        <input type="number" name="costo" step="0.01" min="0" 
                               value="${material.costo || ''}" class="form-control">
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
            
            // Carica categorie con valore preselezionato
            await this.loadCategoriesIntoSelect('categoriaSelectEdit', material.categoria_id);
            
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
    },

    // Carica categorie nel select dropdown
    async loadCategoriesIntoSelect(selectId, selectedId = null) {
        try {
            const categories = await API.materialCategories.getAll();
            const select = document.getElementById(selectId);
            
            if (!select) return;
            
            // Mantieni opzione vuota
            select.innerHTML = '<option value="">Seleziona categoria...</option>';
            
            // Aggiungi categorie
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icona || ''} ${cat.nome}`;
                if (selectedId && cat.id === selectedId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Errore caricamento categorie:', error);
            UI.showToast('Errore nel caricamento delle categorie', 'error');
        }
    },
    
    exportCSV() {
        if (this.materials.length === 0) {
            UI.showToast('Nessun materiale da esportare', 'warning');
            return;
        }
        
        const headers = [
            'Codice Barre', 'Nome', 'Categoria', 'Stato', 'Quantità Totale', 
            'Disponibili', 'Impegnati', 'Posizione', 'Note', 'Data Acquisto', 
            'Costo', 'Fornitore'
        ];
        
        const rows = this.materials.map(m => {
            const quantitaTotale = m.quantita || 0;
            const quantitaImpegnata = m.quantita_assegnata || 0;
            const quantitaDisponibile = quantitaTotale - quantitaImpegnata;
            
            return [
                m.codice_barre || '',
                m.nome || '',
                m.categoria_nome || '',
                m.stato || '',
                quantitaTotale,
                quantitaDisponibile,
                quantitaImpegnata,
                m.posizione_magazzino || '',
                (m.note || '').replace(/"/g, '""'),
                m.data_acquisto || '',
                m.costo || '',
                m.fornitore || ''
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `materiali_CRI_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showToast(`${this.materials.length} materiali esportati`, 'success');
    }
};
