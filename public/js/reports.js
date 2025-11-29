// ===================================
// REPORTS PAGE
// Report e statistiche avanzate
// ===================================

const ReportsPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <h2>📈 Report e Statistiche</h2>
                <p>Analisi dati magazzino e automezzi</p>
            </div>

            <!-- Filtri Report -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3 class="card-title">Filtri Report</h3>
                </div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo Report</label>
                            <select id="reportType" class="form-control">
                                <optgroup label="📦 Materiali">
                                    <option value="materiali">Materiali</option>
                                    <option value="assegnazioni">Assegnazioni Materiali</option>
                                </optgroup>
                                <optgroup label="🚗 Automezzi">
                                    <option value="automezzi-utilizzo">Utilizzo Automezzi</option>
                                    <option value="automezzi-assegnazioni">Assegnazioni Automezzi</option>
                                    <option value="automezzi-manutenzioni">Manutenzioni</option>
                                    <option value="automezzi-rifornimenti">Rifornimenti</option>
                                </optgroup>
                                <optgroup label="📋 Sistema">
                                    <option value="attivita">Log Attività</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data Da</label>
                            <input type="date" id="dataFrom" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Data A</label>
                            <input type="date" id="dataTo" class="form-control">
                        </div>
                        <button class="btn btn-primary" onclick="ReportsPage.generateReport()">
                            📊 Genera Report
                        </button>
                        <button class="btn btn-secondary" onclick="ReportsPage.exportCSV()" id="btnExportCSV" style="display: none;">
                            📥 Esporta CSV
                        </button>
                    </div>
                </div>
            </div>

            <!-- Statistiche Generali -->
            <div id="statsContainer"></div>

            <!-- Contenuto Report -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Risultati</h3>
                </div>
                <div id="reportContent">
                    <div class="p-3 text-center">
                        Seleziona i filtri e clicca su "Genera Report"
                    </div>
                </div>
            </div>
        `;
        
        await this.loadStats();
    },
    
    async loadStats() {
        try {
            const data = await API.reports.getDashboard();
            
            const statsHTML = `
                <div class="stats-grid">
                    <!-- Materiali -->
                    <div class="stat-card">
                        <div class="stat-icon red">📦</div>
                        <div class="stat-details">
                            <h3>${data.materials.totale || 0}</h3>
                            <p>Materiali Totali</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✔</div>
                        <div class="stat-details">
                            <h3>${data.materials.disponibili || 0}</h3>
                            <p>Disponibili</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon yellow">📤</div>
                        <div class="stat-details">
                            <h3>${data.materials.assegnati || 0}</h3>
                            <p>Assegnati</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon blue">🔧</div>
                        <div class="stat-details">
                            <h3>${data.materials.in_manutenzione || 0}</h3>
                            <p>In Manutenzione</p>
                        </div>
                    </div>
                    
                    <!-- Volontari e Assegnazioni -->
                    <div class="stat-card">
                        <div class="stat-icon green">👥</div>
                        <div class="stat-details">
                            <h3>${data.volunteers.attivi || 0}</h3>
                            <p>Volontari Attivi</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon yellow">📋</div>
                        <div class="stat-details">
                            <h3>${data.assignments.in_corso || 0}</h3>
                            <p>Assegnazioni in Corso</p>
                        </div>
                    </div>

                    <!-- Automezzi -->
                    <div class="stat-card">
                        <div class="stat-icon red">🚗</div>
                        <div class="stat-details">
                            <h3>${data.vehicles?.totale || 0}</h3>
                            <p>Automezzi Totali</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✅</div>
                        <div class="stat-details">
                            <h3>${data.vehicles?.disponibili || 0}</h3>
                            <p>Automezzi Disponibili</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon blue">📏</div>
                        <div class="stat-details">
                            <h3>${(data.km_stats?.km_ultimo_mese || 0).toLocaleString()}</h3>
                            <p>Km Ultimo Mese</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon yellow">💰</div>
                        <div class="stat-details">
                            <h3>€ ${(data.refueling_stats?.spesa_totale || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</h3>
                            <p>Spesa Carburante</p>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('statsContainer').innerHTML = statsHTML;
        } catch (error) {
            console.error('Errore caricamento statistiche:', error);
        }
    },
    
    currentReportData: null,
    currentReportType: null,
    
    async generateReport() {
        const reportType = document.getElementById('reportType').value;
        const dataFrom = document.getElementById('dataFrom').value;
        const dataTo = document.getElementById('dataTo').value;
        
        this.currentReportType = reportType;
        
        UI.showLoading();
        
        try {
            let data;
            const filters = {};
            if (dataFrom) filters.data_da = dataFrom;
            if (dataTo) filters.data_a = dataTo;
            
            switch(reportType) {
                case 'materiali':
                    data = await API.reports.getMaterialsReport(filters);
                    this.currentReportData = data;
                    this.renderMaterialsReport(data);
                    break;
                case 'assegnazioni':
                    data = await API.reports.getAssignmentsReport(filters);
                    this.currentReportData = data;
                    this.renderAssignmentsReport(data);
                    break;
                case 'attivita':
                    data = await API.reports.getActivityLog(filters);
                    this.currentReportData = data;
                    this.renderActivityReport(data);
                    break;
                case 'automezzi-utilizzo':
                    data = await API.reports.getVehiclesUsageReport(filters);
                    this.currentReportData = data;
                    this.renderVehiclesUsageReport(data);
                    break;
                case 'automezzi-assegnazioni':
                    data = await API.reports.getVehiclesAssignmentsReport(filters);
                    this.currentReportData = data;
                    this.renderVehiclesAssignmentsReport(data);
                    break;
                case 'automezzi-manutenzioni':
                    data = await API.reports.getVehiclesMaintenanceReport(filters);
                    this.currentReportData = data;
                    this.renderVehiclesMaintenanceReport(data);
                    break;
                case 'automezzi-rifornimenti':
                    data = await API.reports.getVehiclesRefuelingReport(filters);
                    this.currentReportData = data;
                    this.renderVehiclesRefuelingReport(data);
                    break;
            }
            
            // Mostra pulsante export
            document.getElementById('btnExportCSV').style.display = 'inline-block';
        } catch (error) {
            document.getElementById('reportContent').innerHTML = `
                <div class="p-3 error">
                    Errore generazione report: ${error.message}
                </div>
            `;
        } finally {
            UI.hideLoading();
        }
    },
    
    exportCSV() {
        if (!this.currentReportData) {
            UI.showToast('Genera prima un report', 'warning');
            return;
        }
        
        // Implementazione export CSV
        UI.showToast('Funzione export CSV in sviluppo', 'info');
    },
    
    // ===================================
    // RENDER REPORT MATERIALI
    // ===================================
    
    renderMaterialsReport(materials) {
        if (materials.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessun materiale trovato</div>';
            return;
        }
        
        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Codice</th>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th>Stato</th>
                            <th>Posizione</th>
                            <th>Data Acquisto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(m => `
                            <tr>
                                <td><code>${m.codice_barre}</code></td>
                                <td>${m.nome}</td>
                                <td>${m.categoria || '-'}</td>
                                <td><span class="badge badge-${m.stato}">${m.stato}</span></td>
                                <td>${m.posizione_magazzino || '-'}</td>
                                <td>${UI.formatDate(m.data_acquisto)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3 text-center">
                <strong>Totale: ${materials.length} materiali</strong>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    renderAssignmentsReport(assignments) {
        if (assignments.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessuna assegnazione trovata</div>';
            return;
        }
        
        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Evento</th>
                            <th>Materiale</th>
                            <th>Volontario</th>
                            <th>Data Uscita</th>
                            <th>Data Rientro</th>
                            <th>Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assignments.map(a => `
                            <tr>
                                <td><strong>${a.evento}</strong></td>
                                <td>${a.material_nome}</td>
                                <td>${a.volunteer_nome} ${a.volunteer_cognome}</td>
                                <td>${UI.formatDateTime(a.data_uscita)}</td>
                                <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : 'In corso'}</td>
                                <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3 text-center">
                <strong>Totale: ${assignments.length} assegnazioni</strong>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    renderActivityReport(activities) {
        if (activities.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessuna attività trovata</div>';
            return;
        }
        
        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data/Ora</th>
                            <th>Utente</th>
                            <th>Azione</th>
                            <th>Tabella</th>
                            <th>Dettagli</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(a => `
                            <tr>
                                <td>${UI.formatDateTime(a.created_at)}</td>
                                <td>${a.user_nome || '-'} ${a.user_cognome || ''}</td>
                                <td><span class="badge">${a.azione}</span></td>
                                <td>${a.tabella || '-'}</td>
                                <td>${a.dettagli || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3 text-center">
                <strong>Totale: ${activities.length} attività registrate</strong>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    // ===================================
    // RENDER REPORT AUTOMEZZI
    // ===================================
    
    renderVehiclesUsageReport(data) {
        if (data.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessun dato disponibile</div>';
            return;
        }
        
        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Targa</th>
                            <th>Tipo</th>
                            <th>Modello</th>
                            <th>Assegnazioni</th>
                            <th>Km Totali</th>
                            <th>Km Medi</th>
                            <th>Prima Assegnazione</th>
                            <th>Ultima Assegnazione</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(v => `
                            <tr>
                                <td><code style="font-weight: bold;">${v.targa}</code></td>
                                <td>${v.tipo}</td>
                                <td>${v.modello}</td>
                                <td style="text-align: center;"><strong>${v.num_assegnazioni || 0}</strong></td>
                                <td style="text-align: right;"><strong>${parseInt(v.km_totali || 0).toLocaleString()} km</strong></td>
                                <td style="text-align: right;">${parseInt(v.km_medi || 0).toLocaleString()} km</td>
                                <td>${v.prima_assegnazione ? UI.formatDate(v.prima_assegnazione) : '-'}</td>
                                <td>${v.ultima_assegnazione ? UI.formatDate(v.ultima_assegnazione) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3">
                <strong>Totale veicoli: ${data.length}</strong><br>
                <strong>Km totali percorsi: ${data.reduce((sum, v) => sum + parseInt(v.km_totali || 0), 0).toLocaleString()} km</strong>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    renderVehiclesAssignmentsReport(data) {
        if (data.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessuna assegnazione trovata</div>';
            return;
        }
        
        const html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Targa</th>
                            <th>Tipo</th>
                            <th>Volontario</th>
                            <th>Motivo</th>
                            <th>Data Uscita</th>
                            <th>Data Rientro</th>
                            <th>Km Percorsi</th>
                            <th>Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(a => `
                            <tr>
                                <td><code style="font-weight: bold;">${a.targa}</code></td>
                                <td>${a.vehicle_tipo}</td>
                                <td>${a.volunteer_nome} ${a.volunteer_cognome}</td>
                                <td>${a.motivo}</td>
                                <td>${UI.formatDateTime(a.data_uscita)}</td>
                                <td>${a.data_rientro ? UI.formatDateTime(a.data_rientro) : '<span class="badge badge-warning">In corso</span>'}</td>
                                <td style="text-align: right;">${a.km_percorsi ? `<strong>${a.km_percorsi.toLocaleString()} km</strong>` : '-'}</td>
                                <td><span class="badge badge-${a.stato}">${a.stato}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="p-3">
                <strong>Totale assegnazioni: ${data.length}</strong><br>
                <strong>Km totali: ${data.reduce((sum, a) => sum + (a.km_percorsi || 0), 0).toLocaleString()} km</strong>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    renderVehiclesMaintenanceReport(result) {
        const data = result.maintenance || [];
        const stats = result.stats || {};
        
        if (data.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessuna manutenzione trovata</div>';
            return;
        }
        
        const html = `
            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-icon blue">🔧</div>
                    <div class="stat-details">
                        <h3>${stats.totale_manutenzioni || 0}</h3>
                        <p>Manutenzioni Totali</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">💰</div>
                    <div class="stat-details">
                        <h3>€ ${(stats.costo_totale || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</h3>
                        <p>Costo Totale</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">💵</div>
                    <div class="stat-details">
                        <h3>€ ${(stats.costo_medio || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</h3>
                        <p>Costo Medio</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Targa</th>
                            <th>Tipo</th>
                            <th>Descrizione</th>
                            <th>Data Programmata</th>
                            <th>Data Completamento</th>
                            <th>Costo</th>
                            <th>Stato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(m => `
                            <tr>
                                <td><code style="font-weight: bold;">${m.targa}</code></td>
                                <td>${m.tipo}</td>
                                <td>${m.descrizione}</td>
                                <td>${UI.formatDate(m.data_programmata)}</td>
                                <td>${m.data_completamento ? UI.formatDate(m.data_completamento) : '-'}</td>
                                <td style="text-align: right;">${m.costo ? `€ ${parseFloat(m.costo).toLocaleString('it-IT', {minimumFractionDigits: 2})}` : '-'}</td>
                                <td><span class="badge badge-${m.stato}">${m.stato}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    },
    
    renderVehiclesRefuelingReport(result) {
        const data = result.refueling || [];
        const stats = result.stats || {};
        
        if (data.length === 0) {
            document.getElementById('reportContent').innerHTML = '<div class="p-3 text-center">Nessun rifornimento trovato</div>';
            return;
        }
        
        const html = `
            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-icon green">⛽</div>
                    <div class="stat-details">
                        <h3>${stats.totale_rifornimenti || 0}</h3>
                        <p>Rifornimenti Totali</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">📊</div>
                    <div class="stat-details">
                        <h3>${(stats.litri_totali || 0).toLocaleString('it-IT', {minimumFractionDigits: 1})} L</h3>
                        <p>Litri Totali</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red">💰</div>
                    <div class="stat-details">
                        <h3>€ ${(stats.spesa_totale || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</h3>
                        <p>Spesa Totale</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow">💵</div>
                    <div class="stat-details">
                        <h3>€ ${(stats.prezzo_medio_litro || 0).toLocaleString('it-IT', {minimumFractionDigits: 3})}/L</h3>
                        <p>Prezzo Medio Litro</p>
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data/Ora</th>
                            <th>Targa</th>
                            <th>Tipo</th>
                            <th>Km</th>
                            <th>Litri</th>
                            <th>Importo</th>
                            <th>€/L</th>
                            <th>Operatore</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(r => {
                            const prezzoLitro = r.importo && r.litri ? (r.importo / r.litri) : 0;
                            return `
                            <tr>
                                <td>${UI.formatDateTime(r.data_rifornimento)}</td>
                                <td><code style="font-weight: bold;">${r.targa}</code></td>
                                <td>${r.vehicle_tipo}</td>
                                <td style="text-align: right;">${r.km_rifornimento.toLocaleString()} km</td>
                                <td style="text-align: right;"><strong>${parseFloat(r.litri).toLocaleString('it-IT', {minimumFractionDigits: 2})} L</strong></td>
                                <td style="text-align: right;">${r.importo ? `€ ${parseFloat(r.importo).toLocaleString('it-IT', {minimumFractionDigits: 2})}` : '-'}</td>
                                <td style="text-align: right;">${prezzoLitro ? `€ ${prezzoLitro.toLocaleString('it-IT', {minimumFractionDigits: 3})}` : '-'}</td>
                                <td>${r.user_nome || '-'}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('reportContent').innerHTML = html;
    }
};
