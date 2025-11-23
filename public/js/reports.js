// ===================================
// REPORTS PAGE
// Report e statistiche avanzate
// ===================================

const ReportsPage = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header mb-3">
                <h2>📈 Report e Statistiche</h2>
                <p>Analisi dati magazzino</p>
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
                                <option value="materiali">Materiali</option>
                                <option value="assegnazioni">Assegnazioni</option>
                                <option value="attivita">Log Attività</option>
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
                        <div class="stat-icon green">✓</div>
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
                </div>
            `;
            
            document.getElementById('statsContainer').innerHTML = statsHTML;
        } catch (error) {
            console.error('Errore caricamento statistiche:', error);
        }
    },
    
    async generateReport() {
        const reportType = document.getElementById('reportType').value;
        const dataFrom = document.getElementById('dataFrom').value;
        const dataTo = document.getElementById('dataTo').value;
        
        UI.showLoading();
        
        try {
            let data;
            const filters = {};
            if (dataFrom) filters.data_da = dataFrom;
            if (dataTo) filters.data_a = dataTo;
            
            switch(reportType) {
                case 'materiali':
                    data = await API.reports.getMaterialsReport(filters);
                    this.renderMaterialsReport(data);
                    break;
                case 'assegnazioni':
                    data = await API.reports.getAssignmentsReport(filters);
                    this.renderAssignmentsReport(data);
                    break;
                case 'attivita':
                    data = await API.reports.getActivityLog(filters);
                    this.renderActivityReport(data);
                    break;
            }
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
    }
};
