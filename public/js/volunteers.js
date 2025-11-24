// ===================================
// VOLUNTEERS PAGE
// Gestione volontari CRI
// ===================================

const VolunteersPage = {
    volunteers: [],
    
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <div>
                    <h2>👥 Gestione Volontari</h2>
                    <p>Anagrafica volontari CRI</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-success" onclick="VolunteersPage.exportCSV()" 
                            title="Esporta tutti i volontari in CSV">
                        📥 Esporta CSV
                    </button>
                    <button class="btn btn-info" onclick="VolunteersPage.showImportModal()" 
                            title="Importa volontari da file CSV">
                        📤 Importa CSV
                    </button>
                    <button class="btn btn-primary" onclick="VolunteersPage.showAddModal()">
                        ➕ Nuovo Volontario
                    </button>
                </div>
            </div>
            
            <!-- Filtri -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" id="searchVolunteers" 
                                   placeholder="Cerca per nome, cognome, CF, email..." 
                                   class="form-control">
                        </div>
                        <div class="form-group">
                            <input type="text" id="filterComitato" 
                                   placeholder="Filtra per comitato..." 
                                   class="form-control">
                        </div>
                        <button class="btn btn-secondary" onclick="VolunteersPage.applyFilters()">
                            Filtra
                        </button>
                        <button class="btn btn-outline" onclick="VolunteersPage.resetFilters()">
                            Reset
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div id="volunteersTable"></div>
            </div>
        `;
        
        await this.loadVolunteers();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const searchInput = document.getElementById('searchVolunteers');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
    },
    
    async loadVolunteers() {
        try {
            UI.showLoading();
            const filters = {};
            
            const search = document.getElementById('searchVolunteers')?.value;
            const comitato = document.getElementById('filterComitato')?.value;
            
            if (search) filters.search = search;
            if (comitato) filters.gruppo = comitato;
            
            this.volunteers = await API.volunteers.getAll(filters);
            this.renderTable();
        } catch (error) {
            UI.showToast('Errore caricamento volontari', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    renderTable() {
        const container = document.getElementById('volunteersTable');
        if (this.volunteers.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">Nessun volontario trovato</div>';
            return;
        }
        
        // Controlla ruolo utente una volta sola
        const isAdmin = AuthManager.isAdmin();
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Cognome</th>
                        <th>Codice Fiscale</th>
                        <th>Comitato</th>
                        <th>Telefono</th>
                        <th>Email</th>
                        <th style="text-align: center; width: 180px;">Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.volunteers.map(v => `
                        <tr>
                            <td>${v.nome}</td>
                            <td>${v.cognome}</td>
                            <td><code>${v.codice_fiscale || '-'}</code></td>
                            <td>${v.gruppo || '-'}</td>
                            <td>${v.telefono || '-'}</td>
                            <td>${v.email || '-'}</td>
                            <td style="text-align: center;">
                                <div style="display: flex; gap: 5px; justify-content: center;">
                                    <button class="btn btn-sm btn-secondary" 
                                            onclick="VolunteersPage.showDetailModal(${v.id})"
                                            title="Visualizza dettagli"
                                            style="min-width: 35px;">
                                        👁️
                                    </button>
                                    ${isAdmin ? `
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="VolunteersPage.showEditModal(${v.id})"
                                            title="Modifica volontario"
                                            style="min-width: 35px;">
                                        ✏️
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="VolunteersPage.deleteVolunteer(${v.id})"
                                            title="Elimina volontario"
                                            style="min-width: 35px;">
                                        🗑️
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    applyFilters() {
        this.loadVolunteers();
    },
    
    resetFilters() {
        document.getElementById('searchVolunteers').value = '';
        document.getElementById('filterComitato').value = '';
        this.loadVolunteers();
    },
    
    // ===================================
    // EXPORT CSV
    // ===================================
    exportCSV() {
        if (this.volunteers.length === 0) {
            UI.showToast('Nessun volontario da esportare', 'warning');
            return;
        }
        
        // Headers CSV
        const headers = ['Nome', 'Cognome', 'Codice Fiscale', 'Comitato', 'Telefono', 'Email', 'Attivo'];
        
        // Converti dati in righe CSV
        const rows = this.volunteers.map(v => [
            v.nome || '',
            v.cognome || '',
            v.codice_fiscale || '',
            v.gruppo || '',
            v.telefono || '',
            v.email || '',
            v.attivo ? 'Si' : 'No'
        ]);
        
        // Crea CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `volontari_CRI_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showToast(`${this.volunteers.length} volontari esportati`, 'success');
    },
    
    // ===================================
    // IMPORT CSV
    // ===================================
    showImportModal() {
        const modalContent = `
            <h3>📤 Importa Volontari da CSV</h3>
            
            <div class="alert alert-info">
                <strong>ℹ️ Formato File CSV:</strong><br>
                Il file CSV deve contenere le seguenti colonne nell'ordine:<br>
                <code>Nome, Cognome, Codice Fiscale, Comitato, Telefono, Email</code>
                <br><br>
                <button class="btn btn-sm btn-secondary" onclick="VolunteersPage.downloadTemplate()">
                    📥 Scarica Template CSV
                </button>
            </div>
            
            <div class="form-group">
                <label>Seleziona file CSV *</label>
                <input type="file" id="csvFileInput" accept=".csv" class="form-control">
                <small>Formato supportato: CSV (con virgola come separatore)</small>
            </div>
            
            <div id="csvPreview" style="display: none; margin-top: 20px;">
                <h4>📋 Anteprima Dati (primi 5)</h4>
                <div id="csvPreviewTable" style="max-height: 300px; overflow-y: auto;"></div>
                <p id="csvSummary" style="margin-top: 10px; font-weight: 600;"></p>
            </div>
            
            <div class="d-flex gap-2 mt-3">
                <button id="btnImportCSV" class="btn btn-primary" disabled onclick="VolunteersPage.processImport()">
                    Importa Volontari
                </button>
                <button class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
            </div>
        `;
        
        UI.showModal(modalContent);
        
        // Setup file input listener
        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.previewCSV(e.target.files[0]);
        });
    },
    
    downloadTemplate() {
        const template = [
            ['Nome', 'Cognome', 'Codice Fiscale', 'Comitato', 'Telefono', 'Email'],
            ['Mario', 'Rossi', 'RSSMRA85M01H501Z', 'Napoli 1', '3331234567', 'mario.rossi@example.com'],
            ['Laura', 'Bianchi', 'BNCHLR90A41F839X', 'Salerno 1', '3337654321', 'laura.bianchi@example.com']
        ];
        
        const csvContent = template.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'template_volontari_CRI.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showToast('Template scaricato', 'success');
    },
    
    async previewCSV(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                UI.showToast('File CSV vuoto o non valido', 'error');
                return;
            }
            
            // Parse CSV (gestisce virgole tra virgolette)
            const parseCSVLine = (line) => {
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
            };
            
            const headers = parseCSVLine(lines[0]);
            const dataRows = lines.slice(1).map(line => parseCSVLine(line));
            
            // Salva dati per import
            this.csvData = dataRows;
            
            // Mostra anteprima
            const previewRows = dataRows.slice(0, 5);
            const previewHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('csvPreview').style.display = 'block';
            document.getElementById('csvPreviewTable').innerHTML = previewHTML;
            document.getElementById('csvSummary').textContent = 
                `Trovati ${dataRows.length} volontari da importare`;
            document.getElementById('btnImportCSV').disabled = false;
            
        } catch (error) {
            console.error('Errore parsing CSV:', error);
            UI.showToast('Errore nella lettura del file CSV', 'error');
        }
    },
    
    async processImport() {
        if (!this.csvData || this.csvData.length === 0) {
            UI.showToast('Nessun dato da importare', 'warning');
            return;
        }
        
        try {
            UI.showLoading();
            
            let successCount = 0;
            let errorCount = 0;
            const errors = [];
            
            for (let i = 0; i < this.csvData.length; i++) {
                const row = this.csvData[i];
                
                // Salta righe vuote
                if (!row[0] && !row[1]) continue;
                
                const volunteerData = {
                    nome: row[0]?.trim() || '',
                    cognome: row[1]?.trim() || '',
                    codice_fiscale: row[2]?.trim() || '',
                    gruppo: row[3]?.trim() || '',
                    telefono: row[4]?.trim() || '',
                    email: row[5]?.trim() || '',
                    attivo: true
                };
                
                // Validazione base
                if (!volunteerData.nome || !volunteerData.cognome) {
                    errorCount++;
                    errors.push(`Riga ${i + 2}: Nome o Cognome mancante`);
                    continue;
                }
                
                if (!volunteerData.codice_fiscale || volunteerData.codice_fiscale.length !== 16) {
                    errorCount++;
                    errors.push(`Riga ${i + 2}: Codice Fiscale non valido`);
                    continue;
                }
                
                try {
                    await API.volunteers.create(volunteerData);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`Riga ${i + 2}: ${error.message}`);
                }
            }
            
            UI.closeModal();
            
            // Mostra risultato
            if (errorCount === 0) {
                UI.showToast(`✅ ${successCount} volontari importati con successo`, 'success');
            } else {
                const summary = `Importati: ${successCount}, Errori: ${errorCount}`;
                UI.showToast(summary, errorCount > successCount ? 'error' : 'warning');
                
                if (errors.length > 0) {
                    console.error('Errori import:', errors);
                    alert(`Dettagli errori:\n\n${errors.slice(0, 10).join('\n')}\n\n${errors.length > 10 ? '(vedi console per tutti gli errori)' : ''}`);
                }
            }
            
            // Ricarica lista
            await this.loadVolunteers();
            
        } catch (error) {
            console.error('Errore import CSV:', error);
            UI.showToast('Errore durante l\'importazione', 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    showAddModal() {
        const modalContent = `
            <h3>Nuovo Volontario</h3>
            <form id="addVolunteerForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" name="nome" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Cognome *</label>
                        <input type="text" name="cognome" required class="form-control">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Codice Fiscale *</label>
                        <input type="text" name="codice_fiscale" maxlength="16" 
                               required class="form-control" 
                               placeholder="16 caratteri"
                               pattern="[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]"
                               title="Formato: 16 caratteri alfanumerici">
                    </div>
                    <div class="form-group">
                        <label>Comitato CRI *</label>
                        <input type="text" name="gruppo" required class="form-control" 
                               placeholder="Es: Napoli 1" list="comitatoList">
                        <datalist id="comitatoList">
                            <option value="Napoli 1">
                            <option value="Napoli 2">
                            <option value="Salerno 1">
                            <option value="Salerno 2">
                            <option value="Caserta 1">
                            <option value="Avellino 1">
                            <option value="Benevento 1">
                        </datalist>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Telefono *</label>
                        <input type="tel" name="telefono" required class="form-control" 
                               placeholder="Es: 3331234567">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" class="form-control" 
                               placeholder="email@example.com">
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" class="btn btn-primary">Crea Volontario</button>
                    <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                </div>
            </form>
        `;
        
        UI.showModal(modalContent);
        
        document.getElementById('addVolunteerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            try {
                UI.showLoading();
                await API.volunteers.create(data);
                UI.closeModal();
                UI.showToast('Volontario creato', 'success');
                await this.loadVolunteers();
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
            const volunteer = await API.volunteers.getById(id);
            
            const modalContent = `
                <h3>Dettagli Volontario</h3>
                
                <div class="mb-3">
                    <strong>Nome Completo:</strong><br>
                    <h4 style="color: #d32f2f; margin: 5px 0;">${volunteer.nome} ${volunteer.cognome}</h4>
                </div>
                
                ${volunteer.codice_fiscale ? `
                    <div class="mb-3">
                        <strong>Codice Fiscale:</strong><br>
                        <code style="font-size: 1.1em;">${volunteer.codice_fiscale}</code>
                    </div>
                ` : ''}
                
                <div class="mb-3">
                    <strong>Comitato CRI:</strong> ${volunteer.gruppo || '-'}<br>
                    <strong>Telefono:</strong> ${volunteer.telefono || '-'}<br>
                    <strong>Email:</strong> ${volunteer.email || '-'}
                </div>
                
                <div class="mb-3">
                    <strong>Stato:</strong> 
                    ${volunteer.attivo 
                        ? '<span class="badge badge-success">Attivo</span>' 
                        : '<span class="badge badge-danger">Non Attivo</span>'}
                </div>
                
                <div class="mb-3">
                    <strong>Registrato il:</strong> ${UI.formatDate(volunteer.created_at)}
                </div>
                
                <hr>
                
                <h4>Storico Assegnazioni</h4>
                <div id="volunteerAssignments">Caricamento...</div>
                
                <button class="btn btn-secondary mt-3" onclick="UI.closeModal()">Chiudi</button>
            `;
            
            UI.showModal(modalContent);
            
            // Carica assegnazioni
            try {
                const assignments = await API.volunteers.getAssignments(id);
                const assignmentsContainer = document.getElementById('volunteerAssignments');
                
                if (assignments.length === 0) {
                    assignmentsContainer.innerHTML = '<p>Nessuna assegnazione registrata</p>';
                } else {
                    assignmentsContainer.innerHTML = `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Evento</th>
                                    <th>Materiale</th>
                                    <th>Data Uscita</th>
                                    <th>Stato</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${assignments.map(a => `
                                    <tr>
                                        <td>${a.evento}</td>
                                        <td>${a.material_nome}<br><small>${a.codice_barre}</small></td>
                                        <td>${UI.formatDate(a.data_uscita)}</td>
                                        <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
            } catch (error) {
                document.getElementById('volunteerAssignments').innerHTML = 
                    '<p class="error">Errore caricamento assegnazioni</p>';
            }
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    },
    
    async showEditModal(id) {
        try {
            const volunteer = await API.volunteers.getById(id);
            
            const modalContent = `
                <h3>Modifica Volontario</h3>
                <form id="editVolunteerForm">
                    <input type="hidden" name="id" value="${volunteer.id}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" name="nome" value="${volunteer.nome}" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Cognome *</label>
                            <input type="text" name="cognome" value="${volunteer.cognome}" required class="form-control">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Codice Fiscale *</label>
                            <input type="text" name="codice_fiscale" value="${volunteer.codice_fiscale || ''}" 
                                   maxlength="16" required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Comitato CRI *</label>
                            <input type="text" name="gruppo" value="${volunteer.gruppo || ''}" 
                                   required class="form-control" list="comitatoList">
                            <datalist id="comitatoList">
                                <option value="Napoli 1">
                                <option value="Napoli 2">
                                <option value="Salerno 1">
                                <option value="Salerno 2">
                                <option value="Caserta 1">
                                <option value="Avellino 1">
                                <option value="Benevento 1">
                            </datalist>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Telefono *</label>
                            <input type="tel" name="telefono" value="${volunteer.telefono || ''}" 
                                   required class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${volunteer.email || ''}" 
                                   class="form-control">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Stato</label>
                        <select name="attivo" class="form-control">
                            <option value="true" ${volunteer.attivo ? 'selected' : ''}>Attivo</option>
                            <option value="false" ${!volunteer.attivo ? 'selected' : ''}>Non Attivo</option>
                        </select>
                    </div>
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">Salva Modifiche</button>
                        <button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Annulla</button>
                    </div>
                </form>
            `;
            
            UI.showModal(modalContent);
            
            document.getElementById('editVolunteerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                const volunteerId = data.id;
                delete data.id;
                
                try {
                    UI.showLoading();
                    await API.volunteers.update(volunteerId, data);
                    UI.closeModal();
                    UI.showToast('Volontario aggiornato', 'success');
                    await this.loadVolunteers();
                } catch (error) {
                    UI.showToast(error.message, 'error');
                } finally {
                    UI.hideLoading();
                }
            });
        } catch (error) {
            UI.showToast(error.message, 'error');
        }
    },
    
    async deleteVolunteer(id) {
        if (!await UI.confirm('Sei sicuro di voler eliminare questo volontario?')) return;
        
        try {
            UI.showLoading();
            await API.volunteers.delete(id);
            UI.showToast('Volontario eliminato', 'success');
            await this.loadVolunteers();
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }
};
