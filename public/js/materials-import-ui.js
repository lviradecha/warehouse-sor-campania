// ===================================
// MATERIALS IMPORT UI COMPONENT
// Componente per import CSV materiali
// CON PREVIEW RAGGRUPPATA PER CATEGORIA
// ===================================

const MaterialsImportUI = {
    parsedData: [],
    
    // Categorie hardcoded dal database (backup se API non risponde)
    categoriesBackup: [
        { id: 1, nome: 'Telecomunicazioni', icona: '📡', colore: '#2196F3' },
        { id: 2, nome: 'Idrogeologico', icona: '💧', colore: '#03A9F4' },
        { id: 3, nome: 'Elettrico', icona: '⚡', colore: '#FFC107' },
        { id: 4, nome: 'Sanitario', icona: '🏥', colore: '#4CAF50' },
        { id: 5, nome: 'Logistica', icona: '📦', colore: '#FF9800' },
        { id: 6, nome: 'Antincendio', icona: '🔥', colore: '#F44336' },
        { id: 7, nome: 'Rescue', icona: '🚁', colore: '#9C27B0' },
        { id: 8, nome: 'Campo Base', icona: '⛺', colore: '#795548' },
        { id: 9, nome: 'Cucina', icona: '🍳', colore: '#FF5722' },
        { id: 10, nome: 'Vestiario', icona: '👕', colore: '#607D8B' },
        { id: 11, nome: 'Movimentazione', icona: '🚜', colore: '#FF6F00' },
        { id: 12, nome: 'Illuminazione', icona: '💡', colore: '#E65100' },
        { id: 13, nome: 'Altro', icona: '📋', colore: '#9E9E9E' }
    ],
    
    async showImportModal() {
        const categoriesList = this.categoriesBackup
            .map(c => `<li>${c.icona} <strong>${c.nome}</strong></li>`)
            .join('');
        
        const modalContent = `
            <h3>📥 Importa Materiali da CSV</h3>
            
            <div class="alert alert-info" style="margin-bottom: 20px;">
                <strong>ℹ️ Formato CSV richiesto:</strong>
                <ul style="margin: 10px 0 0 20px;">
                    <li><strong>codice_barre</strong> (obbligatorio, univoco)</li>
                    <li><strong>nome</strong> (obbligatorio)</li>
                    <li>seriale (numero di serie, opzionale)</li>
                    <li>descrizione</li>
                    <li>categoria (nome della categoria esistente)</li>
                    <li>quantita (numero, default: 1)</li>
                    <li>stato (disponibile, assegnato, in_manutenzione, fuori_servizio, dismesso)</li>
                    <li>data_acquisto (formato: YYYY-MM-DD)</li>
                    <li>fornitore</li>
                    <li>costo (numero decimale)</li>
                    <li>posizione_magazzino</li>
                    <li>note</li>
                </ul>
            </div>
            
            <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="MaterialsImportUI.downloadTemplate()">
                    📄 Scarica Template CSV
                </button>
                <button class="btn btn-info" onclick="MaterialsImportUI.showCategoriesModal()">
                    📋 Vedi Categorie
                </button>
            </div>
            
            <div class="form-group">
                <label>Modalità Import</label>
                <select id="importMode" class="form-control">
                    <option value="add">➕ Solo Nuovi - Salta duplicati</option>
                    <option value="update">🔄 Aggiorna Esistenti - Crea nuovi</option>
                    <option value="replace">⚠️ Sostituisci - Aggiorna tutti</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>File CSV</label>
                <div id="dropZone" style="
                    border: 2px dashed #d32f2f;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    background: #f9f9f9;
                    transition: all 0.3s;
                ">
                    <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                    <p style="margin: 0; color: #666;">
                        Trascina il file CSV qui<br>
                        oppure clicca per selezionare
                    </p>
                    <input type="file" id="csvFile" accept=".csv" style="display: none;">
                </div>
            </div>
            
            <div id="previewSection" style="display: none; margin-top: 20px;">
                <h4>📊 Anteprima Dati Raggruppati per Categoria</h4>
                <div id="previewGrouped" style="margin-top: 15px;"></div>
                <p id="previewStats" style="margin-top: 10px; font-weight: bold;"></p>
            </div>
            
            <div class="d-flex gap-2 mt-3">
                <button id="importBtn" class="btn btn-primary" disabled onclick="MaterialsImportUI.executeImport()">
                    📥 Importa Materiali
                </button>
                <button class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
            </div>
        `;
        
        UI.showModal(modalContent);
        
        // Setup drag & drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('csvFile');
        
        dropZone.onclick = () => fileInput.click();
        
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.background = '#ffe0e0';
            dropZone.style.borderColor = '#d32f2f';
        };
        
        dropZone.ondragleave = () => {
            dropZone.style.background = '#f9f9f9';
            dropZone.style.borderColor = '#d32f2f';
        };
        
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.background = '#f9f9f9';
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileSelect(file);
        };
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileSelect(file);
        };
    },
    
    showCategoriesModal() {
        const categoriesTable = this.categoriesBackup
            .map(c => `
                <tr>
                    <td style="text-align: center; font-size: 24px;">${c.icona}</td>
                    <td><strong>${c.nome}</strong></td>
                    <td><code>${c.nome}</code></td>
                    <td><span style="background: ${c.colore}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px;">${c.colore}</span></td>
                </tr>
            `).join('');
        
        const modalContent = `
            <h3>📋 Categorie Materiali Disponibili</h3>
            
            <div class="alert alert-info" style="margin-bottom: 20px;">
                <strong>💡 Importante:</strong> Nel CSV, usa esattamente il nome della categoria come mostrato nella colonna "Valore CSV".
            </div>
            
            <div style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Icona</th>
                            <th>Nome Categoria</th>
                            <th>Valore CSV</th>
                            <th>Colore</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoriesTable}
                    </tbody>
                </table>
            </div>
            
            <button class="btn btn-secondary mt-2" onclick="UI.closeModal()">Chiudi</button>
        `;
        
        UI.showModal(modalContent);
    },
    
    downloadTemplate() {
        // Header CSV
        let csv = 'codice_barre,seriale,nome,descrizione,categoria,quantita,stato,data_acquisto,fornitore,costo,posizione_magazzino,note\n';
        
        // Aggiungi esempi per ogni categoria
        const examples = [
            ['TEL001', 'SN123456', 'Radio Portatile VHF', 'Radio portatile VHF/UHF programmabile', 'Telecomunicazioni', '10', 'disponibile', '2024-01-15', 'RadioComm SRL', '180.00', 'Armadietto A1', 'Frequenze programmate'],
            ['IDR001', '', 'Motopompa Acqua', 'Motopompa Honda per drenaggio acque', 'Idrogeologico', '4', 'disponibile', '2024-02-05', 'PumpItalia', '850.00', 'Deposito C', 'Controllo trimestrale'],
            ['ELE001', 'GEN5KW789', 'Generatore 5kW', 'Generatore elettrico benzina 5kW Honda', 'Elettrico', '3', 'disponibile', '2024-01-12', 'PowerGen', '1200.00', 'Deposito Mezzi', 'Tagliando 100h'],
            ['SAN001', 'BAR123XYZ', 'Barella Pieghevole', 'Barella pieghevole Spencer in alluminio', 'Sanitario', '5', 'disponibile', '2024-01-15', 'MedSupply', '450.00', 'Ambulanza 1', 'Controllo annuale'],
            ['LOG001', '', 'Tenda Campo Base 6x6', 'Tenda gonfiabile per campo base 36mq', 'Logistica', '2', 'disponibile', '2023-10-15', 'TentPro', '3500.00', 'Deposito Strutture', 'Include compressore'],
            ['ANT001', '', 'Estintore 6kg', 'Estintore polvere ABC 6kg con supporto', 'Antincendio', '30', 'disponibile', '2024-01-20', 'FireSafety', '45.00', 'Vari', 'Revisione annuale'],
            ['RES001', 'CR11MM456', 'Corda Soccorso 50m', 'Corda statica 11mm certificata EN per SAF', 'Rescue', '8', 'disponibile', '2024-01-15', 'RopeRescue', '180.00', 'Magazzino SAF', 'Controllo annuale'],
            ['CAM001', '', 'Tenda Pneumatica 4x4', 'Tenda gonfiabile rapida 16mq', 'Campo Base', '4', 'disponibile', '2023-11-20', 'TentSystems', '2800.00', 'Deposito Tende', 'Include pompa'],
            ['CUC001', '', 'Cucina da Campo', 'Cucina mobile GPL 4 fuochi', 'Cucina', '3', 'disponibile', '2024-01-08', 'CampKitchen', '850.00', 'Deposito Cucine', 'Certificata CE'],
            ['VES001', '', 'Gilet Alta Visibilità', 'Gilet catarifrangente con logo CRI', 'Vestiario', '100', 'disponibile', '2024-01-05', 'UniformCRI', '12.00', 'Magazzino Abbigliamento', ''],
            ['MOV001', 'TP2500KG', 'Transpallet Manuale', 'Transpallet manuale 2500kg', 'Movimentazione', '4', 'disponibile', '2024-01-10', 'LiftEquip', '280.00', 'Deposito Logistica', 'Revisione annuale'],
            ['ILL001', 'TF4X1000', 'Torre Faro', 'Torre faro telescopica 4x1000W', 'Illuminazione', '2', 'disponibile', '2023-12-15', 'LightSystems', '3500.00', 'Deposito Mezzi', 'Generatore integrato'],
            ['ALT001', '', 'Bandiera CRI', 'Bandiera Croce Rossa Italiana 150x100cm', 'Altro', '20', 'disponibile', '2024-01-05', 'FlagSupply', '18.00', 'Magazzino Varie', '']
        ];
        
        examples.forEach(row => {
            csv += row.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_materiali_CRI.csv';
        link.click();
        
        UI.showToast('Template scaricato con 13 esempi (uno per categoria)!', 'success');
    },
    
    handleFileSelect(file) {
        if (!file.name.endsWith('.csv')) {
            UI.showToast('Seleziona un file CSV valido', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseCSV(e.target.result);
            } catch (error) {
                UI.showToast('Errore lettura file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    },
    
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            UI.showToast('File CSV vuoto o non valido', 'error');
            return;
        }
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Verifica campi obbligatori
        if (!headers.includes('codice_barre') || !headers.includes('nome')) {
            UI.showToast('CSV deve contenere almeno: codice_barre, nome', 'error');
            return;
        }
        
        // Parse data rows
        this.parsedData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx];
                });
                this.parsedData.push(row);
            }
        }
        
        if (this.parsedData.length === 0) {
            UI.showToast('Nessun dato valido trovato nel CSV', 'error');
            return;
        }
        
        this.showPreviewGrouped();
        document.getElementById('importBtn').disabled = false;
    },
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        
        return result;
    },
    
    // NUOVO: Preview raggruppata per categoria
    showPreviewGrouped() {
        const previewSection = document.getElementById('previewSection');
        const previewGrouped = document.getElementById('previewGrouped');
        const previewStats = document.getElementById('previewStats');
        
        previewSection.style.display = 'block';
        
        // Raggruppa per categoria
        const groups = this.groupByCategory(this.parsedData);
        
        // Conta statistiche
        let totalItems = 0;
        let totalQuantity = 0;
        
        // Render gruppi
        let html = '';
        
        groups.forEach(group => {
            const categoryInfo = this.getCategoryInfo(group.categoria);
            const itemCount = group.items.length;
            const groupQuantity = group.items.reduce((sum, item) => sum + (parseInt(item.quantita) || 1), 0);
            
            totalItems += itemCount;
            totalQuantity += groupQuantity;
            
            html += `
                <div class="card mb-2" style="border-left: 4px solid ${categoryInfo.colore};">
                    <div style="
                        padding: 10px 15px; 
                        background: linear-gradient(135deg, ${categoryInfo.colore}15 0%, ${categoryInfo.colore}05 100%);
                        border-bottom: 1px solid ${categoryInfo.colore}30;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">${categoryInfo.icona}</span>
                            <div>
                                <strong style="color: ${categoryInfo.colore}; font-size: 1.1em;">
                                    ${categoryInfo.nome}
                                </strong>
                                <div style="font-size: 0.85em; color: #666;">
                                    ${itemCount} articoli | Quantità totale: ${groupQuantity}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 10px;">
                        <table class="table table-sm" style="font-size: 0.9em; margin: 0;">
                            <thead>
                                <tr style="background: ${categoryInfo.colore}10;">
                                    <th>Codice</th>
                                    <th>Seriale</th>
                                    <th>Nome</th>
                                    <th>Qtà</th>
                                    <th>Stato</th>
                                    <th>Posizione</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${group.items.map(item => `
                                    <tr>
                                        <td><code style="font-size: 0.85em;">${item.codice_barre}</code></td>
                                        <td>${item.seriale ? `<code style="font-size: 0.8em;">${item.seriale}</code>` : '<span style="color: #999;">-</span>'}</td>
                                        <td><strong>${item.nome}</strong></td>
                                        <td style="text-align: center;"><strong>${item.quantita || 1}</strong></td>
                                        <td><span class="badge badge-${item.stato || 'disponibile'}">${item.stato || 'disponibile'}</span></td>
                                        <td>${item.posizione_magazzino || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        previewGrouped.innerHTML = html;
        
        previewStats.innerHTML = `
            ✅ Totale: <strong>${totalItems} articoli</strong> | 
            Quantità totale: <strong>${totalQuantity}</strong> | 
            Categorie: <strong>${groups.length}</strong>
        `;
    },
    
    // NUOVO: Raggruppa materiali per categoria
    groupByCategory(data) {
        const groups = new Map();
        
        data.forEach(item => {
            const categoria = item.categoria || 'Altro';
            
            if (!groups.has(categoria)) {
                groups.set(categoria, {
                    categoria: categoria,
                    items: []
                });
            }
            
            groups.get(categoria).items.push(item);
        });
        
        // Ordina categorie alfabeticamente (Altro va alla fine)
        return Array.from(groups.values()).sort((a, b) => {
            if (a.categoria === 'Altro') return 1;
            if (b.categoria === 'Altro') return -1;
            return a.categoria.localeCompare(b.categoria);
        });
    },
    
    // NUOVO: Ottieni info categoria (icona, colore)
    getCategoryInfo(categoryName) {
        const category = this.categoriesBackup.find(
            c => c.nome.toLowerCase() === categoryName.toLowerCase()
        );
        
        return category || {
            nome: categoryName,
            icona: '📦',
            colore: '#9E9E9E'
        };
    },
    
    async executeImport() {
        if (this.parsedData.length === 0) {
            UI.showToast('Nessun dato da importare', 'error');
            return;
        }
        
        const mode = document.getElementById('importMode').value;
        
        if (!confirm(`Confermi l'import di ${this.parsedData.length} materiali in modalità "${mode}"?`)) {
            return;
        }
        
        try {
            UI.showLoading();
            
            const response = await fetch('/api/materiali-import', {
                method: 'POST',
                headers: AuthManager.getAuthHeaders(),
                body: JSON.stringify({
                    materials: this.parsedData,
                    mode: mode
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Errore durante import');
            }
            
            UI.closeModal();
            this.showImportResults(result);
            
            // Ricarica lista materiali
            if (typeof MaterialsPage !== 'undefined' && MaterialsPage.loadMaterials) {
                await MaterialsPage.loadMaterials();
            }
            
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    showImportResults(result) {
        const stats = result.stats;
        
        let html = `
            <h3>📊 Risultati Import</h3>
            
            <div class="card mb-3" style="background: #e8f5e9; border-left: 4px solid #4CAF50;">
                <div class="card-body">
                    <h4 style="margin: 0; color: #2e7d32;">✅ Import Completato</h4>
                    <div style="margin-top: 15px; font-size: 1.1em;">
                        <div style="margin: 5px 0;">
                            <strong>Totale righe:</strong> ${stats.total}
                        </div>
                        <div style="margin: 5px 0; color: #2e7d32;">
                            <strong>✅ Creati:</strong> ${stats.imported}
                        </div>
                        <div style="margin: 5px 0; color: #1976D2;">
                            <strong>🔄 Aggiornati:</strong> ${stats.updated}
                        </div>
                        ${stats.skipped > 0 ? `
                        <div style="margin: 5px 0; color: #F57C00;">
                            <strong>⏭️ Saltati:</strong> ${stats.skipped}
                        </div>
                        ` : ''}
                        ${stats.errors > 0 ? `
                        <div style="margin: 5px 0; color: #d32f2f;">
                            <strong>❌ Errori:</strong> ${stats.errors}
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Mostra dettagli errori se presenti
        if (result.errors && result.errors.length > 0) {
            html += `
                <div class="card mb-3" style="background: #ffebee; border-left: 4px solid #f44336;">
                    <div class="card-body">
                        <h4 style="margin: 0 0 10px 0; color: #c62828;">❌ Errori (${result.errors.length})</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Riga</th>
                                        <th>Codice</th>
                                        <th>Errore</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${result.errors.map(err => `
                                        <tr>
                                            <td>${err.row}</td>
                                            <td><code>${err.data.codice_barre || '-'}</code></td>
                                            <td style="color: #c62828;">${err.error}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Mostra materiali saltati se presenti
        if (result.skipped && result.skipped.length > 0) {
            html += `
                <div class="card mb-3" style="background: #fff3e0; border-left: 4px solid #ff9800;">
                    <div class="card-body">
                        <h4 style="margin: 0 0 10px 0; color: #e65100;">⏭️ Materiali Saltati (${result.skipped.length})</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Riga</th>
                                        <th>Codice</th>
                                        <th>Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${result.skipped.map(skip => `
                                        <tr>
                                            <td>${skip.row}</td>
                                            <td><code>${skip.data.codice_barre || '-'}</code></td>
                                            <td style="color: #e65100;">${skip.reason}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += `
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-secondary" onclick="UI.closeModal()">Chiudi</button>
            </div>
        `;
        
        UI.showModal(html);
    }
};
