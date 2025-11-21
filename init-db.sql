-- Schema Database Warehouse SOR Campania

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operatore')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Materiali
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'disponibile' CHECK (status IN ('disponibile', 'assegnato', 'fuori_servizio', 'dismesso')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Volontari
CREATE TABLE IF NOT EXISTS volunteers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Assegnazioni
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    volunteer_id INTEGER NOT NULL REFERENCES volunteers(id),
    event_name VARCHAR(200) NOT NULL,
    assignment_date TIMESTAMP NOT NULL,
    expected_return_date DATE,
    actual_return_date TIMESTAMP,
    return_notes TEXT,
    assigned_by INTEGER REFERENCES users(id),
    returned_by INTEGER REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'assegnato' CHECK (status IN ('assegnato', 'rientrato', 'danneggiato')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Storico Manutenzioni
CREATE TABLE IF NOT EXISTS maintenance_history (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('riparazione', 'manutenzione', 'controllo')),
    description TEXT NOT NULL,
    cost DECIMAL(10, 2),
    maintenance_date DATE NOT NULL,
    performed_by VARCHAR(200),
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('riparato', 'da_dismettere', 'in_attesa')),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Log Attività
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per migliorare le performance
CREATE INDEX idx_materials_barcode ON materials(barcode);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_assignments_material ON assignments(material_id);
CREATE INDEX idx_assignments_volunteer ON assignments(volunteer_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_maintenance_material ON maintenance_history(material_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- Inserimento utente admin predefinito (password: admin123)
INSERT INTO users (username, password, full_name, role) 
VALUES ('admin', '$2a$10$rZ8jXQzN5K5X9Y.8yB9z6OMvN7dVJ8KqYj5pGJH5qJ6LxQzNzN5K5', 'Amministratore Sistema', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Inserimento utente operatore di test (password: operatore123)
INSERT INTO users (username, password, full_name, role) 
VALUES ('operatore', '$2a$10$X5Y7Z9A1B3C5D7E9F1G3H5IJKLMNOPQRSTUVWXYZabcdefghijk', 'Operatore Test', 'operatore')
ON CONFLICT (username) DO NOTHING;
