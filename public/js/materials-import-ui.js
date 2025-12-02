// ===================================
// MATERIALS IMPORT UI COMPONENT
// Componente per import CSV materiali
// ===================================

const MaterialsImportUI = {
    parsedData: [],
    
    // Categorie hardcoded dal database (backup se API non risponde)
    categoriesBackup: [
        { id: 1, nome: 'Telecomunicazioni', icona: '📡' },
        { id: 2, nome: 'Idrogeologico', icona: '💧' },
        { id: 3, nome: 'Elettrico', icona: '⚡' },
        { id: 4, nome: 'Sanitario', icona: '🏥' },
        { id: 5, nome: 'Logistica', icona: '📦' },
        { id: 6, nome: 'Antincendio', icona: '🔥' },
        { id: 7, nome: 'Rescue', icona: '🚁' },
        { id: 8, nome: 'Campo Base', icona: '⛺' },
        { id: 9, nome: 'Cucina', icona: '🍳' },
        { id: 10, nome: 'Vestiario', icona: '👕' },
        { id: 11, nome: 'Movimentazione', icona: '🚜' },
        { id: 12, nome: 'Illuminazione', icona: '💡' },
        { id: 13, nome: 'Altro', icona: '📋' }
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
                <h4>📊 Anteprima Dati (prime 5 righe)</h4>
                <div id="previewTable" style="overflow-x: auto;"></div>
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
                </tr>
            `).join('');
        
        const modalContent = `
            <h3>📋 Categorie Materiali Disponibili</h3>
            
            <div class="alert alert-info" style="margin-bottom: 20px;">
                <strong>💡 Importante:</strong> Nel CSV, usa esattamente il nome della categoria come mostrato nella colonna "Valore CSV".
            </div>
            
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th style="width: 60px; text-align: center;">Icona</th>
                        <th>Nome Categoria</th>
                        <th>Valore CSV</th>
                    </tr>
                </thead>
                <tbody>
                    ${categoriesTable}
                </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
                <strong>📝 Esempio uso nel CSV:</strong>
                <pre style="margin: 10px 0 0 0; background: white; padding: 10px; border-radius: 4px;">TEL001,Radio VHF,Radio portatile,<strong style="color: #d32f2f;">Telecomunicazioni</strong>,5,disponibile,...</pre>
            </div>
            
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-secondary" onclick="MaterialsImportUI.showImportModal()">
                    ← Torna a Import
                </button>
                <button class="btn btn-primary" onclick="MaterialsImportUI.downloadTemplate()">
                    📄 Scarica Template
                </button>
                <button class="btn btn-secondary" onclick="UI.closeModal()">
                    Chiudi
                </button>
            </div>
        `;
        
        UI.showModal(modalContent);
    },
    
    downloadTemplate() {
        // Header CSV
        let csv = 'codice_barre,nome,descrizione,categoria,quantita,stato,data_acquisto,fornitore,costo,posizione_magazzino,note\n';
        
        // Aggiungi esempi per ogni categoria
        const examples = [
            ['TEL001', 'Radio Portatile VHF', 'Radio portatile VHF/UHF programmabile', 'Telecomunicazioni', '10', 'disponibile', '2024-01-15', 'RadioComm SRL', '180.00', 'Armadietto A1', 'Frequenze programmate'],
            ['IDR001', 'Motopompa Acqua', 'Motopompa Honda per drenaggio acque', 'Idrogeologico', '4', 'disponibile', '2024-02-05', 'PumpItalia', '850.00', 'Deposito C', 'Controllo trimestrale'],
            ['ELE001', 'Generatore 5kW', 'Generatore elettrico benzina 5kW Honda', 'Elettrico', '3', 'disponibile', '2024-01-12', 'PowerGen', '1200.00', 'Deposito Mezzi', 'Tagliando 100h'],
            ['SAN001', 'Barella Pieghevole', 'Barella pieghevole Spencer in alluminio', 'Sanitario', '5', 'disponibile', '2024-01-15', 'MedSupply', '450.00', 'Ambulanza 1', 'Controllo annuale'],
            ['LOG001', 'Tenda Campo Base 6x6', 'Tenda gonfiabile per campo base 36mq', 'Logistica', '2', 'disponibile', '2023-10-15', 'TentPro', '3500.00', 'Deposito Strutture', 'Include compressore'],
            ['ANT001', 'Estintore 6kg', 'Estintore polvere ABC 6kg con supporto', 'Antincendio', '30', 'disponibile', '2024-01-20', 'FireSafety', '45.00', 'Vari', 'Revisione annuale'],
            ['RES001', 'Corda Soccorso 50m', 'Corda statica 11mm certificata EN per SAF', 'Rescue', '8', 'disponibile', '2024-01-15', 'RopeRescue', '180.00', 'Magazzino SAF', 'Controllo annuale'],
            ['CAM001', 'Tenda Pneumatica 4x4', 'Tenda gonfiabile rapida 16mq', 'Campo Base', '4', 'disponibile', '2023-11-20', 'TentSystems', '2800.00', 'Deposito Tende', 'Include pompa'],
            ['CUC001', 'Cucina da Campo', 'Cucina mobile GPL 4 fuochi', 'Cucina', '3', 'disponibile', '2024-01-08', 'CampKitchen', '850.00', 'Deposito Cucine', 'Certificata CE'],
            ['VES001', 'Gilet Alta Visibilità', 'Gilet catarifrangente con logo CRI', 'Vestiario', '100', 'disponibile', '2024-01-05', 'UniformCRI', '12.00', 'Magazzino Abbigliamento', ''],
            ['MOV001', 'Transpallet Manuale', 'Transpallet manuale 2500kg', 'Movimentazione', '4', 'disponibile', '2024-01-10', 'LiftEquip', '280.00', 'Deposito Logistica', 'Revisione annuale'],
            ['ILL001', 'Torre Faro', 'Torre faro telescopica 4x1000W', 'Illuminazione', '2', 'disponibile', '2023-12-15', 'LightSystems', '3500.00', 'Deposito Mezzi', 'Generatore integrato'],
            ['ALT001', 'Bandiera CRI', 'Bandiera Croce Rossa Italiana 150x100cm', 'Altro', '20', 'disponibile', '2024-01-05', 'FlagSupply', '18.00', 'Magazzino Varie', '']
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
        
        this.showPreview();
        document.getElementById('importBtn').disabled = false;
    },
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
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
    
    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const previewTable = document.getElementById('previewTable');
        const previewStats = document.getElementById('previewStats');
        
        previewSection.style.display = 'block';
        
        // Mostra prime 5 righe
        const preview = this.parsedData.slice(0, 5);
        const headers = Object.keys(preview[0]);
        
        let html = '<table class="table table-sm"><thead><tr>';
        headers.forEach(h => {
            html += `<th>${h}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        preview.forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                html += `<td>${row[h] || '-'}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        previewTable.innerHTML = html;
        
        previewStats.innerHTML = `
            ✅ Totale righe da importare: <strong>${this.parsedData.length}</strong>
            ${this.parsedData.length > 5 ? ` (mostrate prime 5)` : ''}
        `;
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
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
                <div class="stat-card" style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #2e7d32;">${stats.imported}</div>
                    <div style="color: #666;">✅ Creati</div>
                </div>
                <div class="stat-card" style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #1565c0;">${stats.updated}</div>
                    <div style="color: #666;">🔄 Aggiornati</div>
                </div>
                <div class="stat-card" style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #ef6c00;">${stats.skipped}</div>
                    <div style="color: #666;">⏭️ Saltati</div>
                </div>
                <div class="stat-card" style="background: #ffebee; padding: 15px; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: bold; color: #c62828;">${stats.errors}</div>
                    <div style="color: #666;">❌ Errori</div>
                </div>
            </div>
        `;
        
        // Mostra errori se presenti
        if (result.errors.length > 0) {
            html += `
                <div class="alert alert-danger" style="margin-top: 20px; max-height: 300px; overflow-y: auto;">
                    <h4>❌ Errori (${result.errors.length})</h4>
                    <ul>
            `;
            result.errors.forEach(err => {
                html += `<li><strong>Riga ${err.row}:</strong> ${err.error}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // Mostra saltati se presenti
        if (result.skipped.length > 0 && result.skipped.length <= 10) {
            html += `
                <div class="alert alert-warning" style="margin-top: 20px;">
                    <h4>⏭️ Saltati (${result.skipped.length})</h4>
                    <ul>
            `;
            result.skipped.forEach(skip => {
                html += `<li><strong>Riga ${skip.row}:</strong> ${skip.reason}</li>`;
            });
            html += `</ul></div>`;
        }
        
        html += `
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-primary" onclick="UI.closeModal()">Chiudi</button>
            </div>
        `;
        
        UI.showModal(html);
        
        const successMsg = `Import completato: ${stats.imported} creati, ${stats.updated} aggiornati`;
        UI.showToast(successMsg, stats.errors > 0 ? 'warning' : 'success');
    }
};
