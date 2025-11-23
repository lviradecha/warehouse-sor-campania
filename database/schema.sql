-- Schema Database Warehouse SOR Campania
-- Sistema di Gestione Magazzino Emergenze

-- Tabella Utenti (Admin e Operatori)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operatore')),
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Tabella Materiali
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    codice_barre VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    descrizione TEXT,
    categoria VARCHAR(100),
    quantita INTEGER DEFAULT 1,
    stato VARCHAR(50) DEFAULT 'disponibile' CHECK (stato IN ('disponibile', 'assegnato', 'in_manutenzione', 'fuori_servizio', 'dismesso')),
    data_acquisto DATE,
    fornitore VARCHAR(200),
    costo DECIMAL(10,2),
    posizione_magazzino VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Volontari
CREATE TABLE IF NOT EXISTS volunteers (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    codice_fiscale VARCHAR(16) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    gruppo VARCHAR(100),
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Assegnazioni
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    volunteer_id INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
    evento VARCHAR(200) NOT NULL,
    data_uscita TIMESTAMP NOT NULL,
    data_rientro TIMESTAMP,
    stato VARCHAR(50) DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'rientrato', 'danneggiato')),
    note_uscita TEXT,
    note_rientro TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Storico Manutenzioni
CREATE TABLE IF NOT EXISTS maintenance_history (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    tipo VARCHAR(50) CHECK (tipo IN ('rottura', 'manutenzione', 'riparazione', 'dismissione')),
    descrizione TEXT NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE,
    costo DECIMAL(10,2),
    fornitore_riparazione VARCHAR(200),
    esito VARCHAR(50) CHECK (esito IN ('in_corso', 'riparato', 'non_riparabile', 'dismesso')),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Log Attività
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    azione VARCHAR(100) NOT NULL,
    tabella VARCHAR(50),
    record_id INTEGER,
    dettagli TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per migliorare le performance
CREATE INDEX idx_materials_codice_barre ON materials(codice_barre);
CREATE INDEX idx_materials_stato ON materials(stato);
CREATE INDEX idx_assignments_material ON assignments(material_id);
CREATE INDEX idx_assignments_volunteer ON assignments(volunteer_id);
CREATE INDEX idx_assignments_stato ON assignments(stato);
CREATE INDEX idx_maintenance_material ON maintenance_history(material_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per aggiornare updated_at su materials
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserimento utente admin di default (password: Admin2024!)
-- IMPORTANTE: Cambiare la password dopo il primo accesso
INSERT INTO users (username, password_hash, role, nome, cognome, email, attivo) 
VALUES ('admin', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yktLoeUEKa', 'admin', 'Amministratore', 'Sistema', 'admin@cri-campania.it', true)
ON CONFLICT (username) DO NOTHING;

-- Dati di esempio per testing
INSERT INTO volunteers (nome, cognome, codice_fiscale, telefono, email, gruppo) VALUES
('Mario', 'Rossi', 'RSSMRA80A01F839X', '3331234567', 'mario.rossi@email.it', 'Napoli 1'),
('Laura', 'Bianchi', 'BNCLRA85M45F839Y', '3337654321', 'laura.bianchi@email.it', 'Napoli 2'),
('Giuseppe', 'Verdi', 'VRDGPP90R15F839Z', '3339876543', 'giuseppe.verdi@email.it', 'Salerno 1')
ON CONFLICT (codice_fiscale) DO NOTHING;
