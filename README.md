# Warehouse SOR Campania

Sistema di gestione magazzino per emergenze con gestione materiali, volontari, assegnazioni e manutenzioni.

## 🚀 Caratteristiche

- ✅ Autenticazione utenti (Admin e Operatore)
- 📦 Gestione completa materiali con codici a barre
- 👥 Gestione volontari
- 🔄 Assegnazione materiali per eventi
- ↩️ Registrazione rientri materiali
- 🔧 Storico manutenzioni e riparazioni
- 🖨️ Stampa etichette con codice a barre
- 📊 Filtri e ricerche avanzate

## 🛠️ Tecnologie

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Vercel Serverless Functions
- **Database**: Neon (PostgreSQL)
- **Autenticazione**: JWT
- **Codici a Barre**: JsBarcode

## 📋 Prerequisiti

- Node.js 18+
- Account Vercel
- Account Neon (PostgreSQL)

## 🔧 Installazione

### 1. Clona il repository

```bash
git clone <repository-url>
cd warehouse-sor-campania
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura il Database Neon

1. Crea un nuovo progetto su [Neon](https://neon.tech)
2. Copia la connection string
3. Esegui lo script SQL dal file `init-db.sql` nella console Neon

### 4. Configura le variabili d'ambiente

Crea un file `.env` nella root del progetto:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=your-super-secret-key-change-this-in-production
```

### 5. Sviluppo locale

```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

### 6. Deploy su Vercel

```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Configura le variabili d'ambiente su Vercel
vercel env add DATABASE_URL
vercel env add JWT_SECRET

# Deploy in produzione
vercel --prod
```

## 👤 Credenziali di Default

### Admin
- Username: `admin`
- Password: `admin123`

### Operatore
- Username: `operatore`
- Password: `operatore123`

**⚠️ IMPORTANTE**: Cambiare le password dopo il primo accesso!

## 🔐 Permessi per Ruolo

### Admin
- Tutte le operazioni
- Gestione utenti
- Eliminazione materiali e volontari
- Dismissione materiali

### Operatore
- Visualizzazione dati
- Creazione e modifica materiali
- Gestione assegnazioni
- Registrazione rientri
- Gestione manutenzioni
- Stampa etichette

## 📊 Database Schema

### Tabelle Principali

- **users** - Utenti del sistema
- **materials** - Materiali in magazzino
- **volunteers** - Volontari
- **assignments** - Assegnazioni materiali
- **maintenance_history** - Storico manutenzioni
- **activity_log** - Log attività

## 🎯 Flussi di Lavoro

### 1. Nuovo Materiale
1. Inserimento dati materiale
2. Generazione/inserimento codice a barre univoco
3. Stampa etichetta
4. Applicazione etichetta sul materiale

### 2. Assegnazione Materiale
1. Seleziona materiale disponibile
2. Seleziona volontario attivo
3. Specifica evento e date
4. Conferma assegnazione (materiale passa a stato "assegnato")

### 3. Rientro Materiale
1. Seleziona assegnazione attiva
2. Registra data rientro
3. Indica eventuale danneggiamento
4. Aggiungi note
5. Materiale torna "disponibile" o "fuori_servizio"

### 4. Manutenzione
1. Seleziona materiale fuori servizio
2. Inserisci dettagli riparazione
3. Indica esito (riparato/da dismettere/in attesa)
4. Materiale cambia stato in base all'esito

### 5. Dismissione
1. Solo Admin può dismettere
2. Materiale passa a stato "dismesso"
3. Non più utilizzabile per assegnazioni

## 🖨️ Stampa Etichette

Le etichette includono:
- Nome materiale
- Categoria
- Stato
- Data acquisto
- Codice a barre CODE128

## 📱 Interfaccia

- **Responsive Design**: Funziona su desktop, tablet e mobile
- **Navigazione Intuitiva**: Menu a tab per sezioni
- **Filtri Avanzati**: Ricerca per stato, categoria, nome
- **Modal Dialog**: Per inserimento/modifica dati

## 🔍 Ricerca e Filtri

### Materiali
- Per stato (disponibile, assegnato, fuori servizio, dismesso)
- Per categoria
- Per nome/codice a barre/descrizione

### Volontari
- Per stato (attivo/non attivo)
- Per nome/codice/email

### Assegnazioni
- Per stato (assegnato, rientrato, danneggiato)

### Manutenzioni
- Per esito (riparato, da dismettere, in attesa)

## 🛡️ Sicurezza

- Password hashate con bcrypt
- Autenticazione JWT
- Validazione input lato server
- Protezione contro SQL injection (parametrized queries)
- Log di tutte le operazioni

## 📝 Log Attività

Ogni operazione viene registrata con:
- Utente che ha effettuato l'azione
- Tipo di azione
- Entità coinvolta
- Timestamp
- Dettagli operazione

## 🐛 Troubleshooting

### Errore di connessione al database
- Verifica che DATABASE_URL sia configurato correttamente
- Controlla che il database Neon sia attivo
- Verifica la connection string includa `?sslmode=require`

### Token JWT non valido
- Verifica che JWT_SECRET sia configurato
- Il token scade dopo 8 ore, effettua nuovo login

### Etichetta non si stampa
- Verifica che il browser permetta popup
- Controlla la console per errori JavaScript

## 📞 Supporto

Per problemi o domande, contattare l'amministratore di sistema.

## 📄 Licenza

© 2024 SOR Campania - Tutti i diritti riservati
