# 📦 Warehouse SOR Campania

Sistema di Gestione Magazzino Emergenze per la Croce Rossa Italiana - Sala Operativa Regionale Campania

## 🚀 Caratteristiche Principali

- ✅ **Gestione Materiali**: Censimento, acquisti, dismissioni con codici a barre univoci
- ✅ **Assegnazioni**: Uscita materiali a volontari per eventi e tracciamento rientri
- ✅ **Manutenzioni**: Gestione rotture, riparazioni e reintegro materiali
- ✅ **Volontari**: Anagrafica completa volontari CRI
- ✅ **Etichette**: Stampa etichette con codice a barre per ogni materiale
- ✅ **Report**: Dashboard e statistiche in tempo reale
- ✅ **Controllo Accessi**: Due livelli (Admin e Operatore)
- ✅ **Log Attività**: Tracciamento completo di tutte le operazioni

## 🛠️ Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Netlify Serverless Functions
- **Database**: Neon PostgreSQL (Serverless)
- **Autenticazione**: JWT (JSON Web Tokens)
- **Password**: bcryptjs per hashing sicuro
- **Codici a Barre**: JsBarcode

## 📋 Prerequisiti

- Account Netlify (gratuito)
- Account Neon (gratuito)
- Node.js 18+ (per sviluppo locale)
- Git

## 🔧 Setup Progetto

### 1. Database Neon

1. Crea un account su [Neon](https://neon.tech)
2. Crea un nuovo progetto chiamato `warehouse-sor-campania`
3. Copia la stringa di connessione (Database URL)
4. Esegui lo schema SQL:
   ```bash
   # Connettiti al database e esegui il file
   psql [DATABASE_URL] < database/schema.sql
   ```

### 2. Configurazione Locale

1. Clona il repository:
   ```bash
   git clone https://github.com/tuousername/warehouse-sor-campania.git
   cd warehouse-sor-campania
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Crea il file `.env`:
   ```bash
   cp .env.example .env
   ```

4. Configura le variabili d'ambiente nel file `.env`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/warehouse_db?sslmode=require
   JWT_SECRET=genera-una-chiave-segreta-casuale-lunga
   NODE_ENV=development
   ```

5. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

6. Apri il browser su `http://localhost:8888`

### 3. Deploy su Netlify

#### Opzione A: Deploy tramite Git (Consigliato)

1. Pusha il codice su GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Vai su [Netlify](https://netlify.com) e fai login

3. Clicca "Add new site" → "Import an existing project"

4. Connetti il repository GitHub

5. Configura le build settings:
   - **Build command**: `npm install`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

6. Aggiungi le variabili d'ambiente:
   - Vai in "Site settings" → "Environment variables"
   - Aggiungi:
     - `DATABASE_URL`: La tua connection string di Neon
     - `JWT_SECRET`: Una chiave segreta casuale (puoi generarla con `openssl rand -base64 32`)

7. Clicca "Deploy site"

#### Opzione B: Deploy manuale

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login a Netlify
netlify login

# Deploy
netlify deploy --prod
```

## 🔐 Credenziali di Default

**Username**: `admin`  
**Password**: `Admin2024!`

⚠️ **IMPORTANTE**: Cambia immediatamente la password dopo il primo accesso!

## 👥 Ruoli e Permessi

### Admin
- ✅ Tutte le operazioni
- ✅ Gestione utenti
- ✅ Accesso completo ai report
- ✅ Eliminazione record

### Operatore
- ✅ Gestione materiali
- ✅ Gestione volontari
- ✅ Assegnazioni e rientri
- ✅ Manutenzioni
- ✅ Visualizzazione report
- ❌ Gestione utenti
- ❌ Eliminazione dati critici

## 📊 Struttura Database

### Tabelle Principali

- **users**: Utenti del sistema (admin/operatori)
- **materials**: Inventario materiali
- **volunteers**: Anagrafica volontari
- **assignments**: Assegnazioni materiali a volontari
- **maintenance_history**: Storico manutenzioni e riparazioni
- **activity_log**: Log di tutte le attività

## 🏷️ Gestione Codici a Barre

I codici a barre sono generati automaticamente in formato CODE128 e possono essere:
- Stampati direttamente dal sistema
- Esportati come PDF
- Stampati su etichette adesive standard

## 📱 Responsive Design

Il sistema è completamente responsive e utilizzabile da:
- 💻 Desktop
- 📱 Tablet
- 📱 Smartphone

## 🔄 Workflow Tipico

### Nuovo Materiale
1. Aggiungi materiale con codice a barre univoco
2. Stampa etichetta con codice a barre
3. Applica etichetta al materiale
4. Posiziona in magazzino

### Assegnazione per Evento
1. Seleziona materiale disponibile
2. Assegna a volontario specifico
3. Inserisci dettagli evento
4. Materiale passa in stato "assegnato"

### Rientro Materiale
1. Scansiona/cerca materiale
2. Registra rientro
3. Verifica condizioni
4. Se danneggiato → Metti in manutenzione
5. Se OK → Torna disponibile

### Manutenzione
1. Materiale fuori servizio
2. Crea ticket manutenzione
3. Registra riparazione
4. Se riparato → Reintegra
5. Se non riparabile → Dismetti

## 🐛 Troubleshooting

### Errore di connessione al database
- Verifica che la stringa `DATABASE_URL` sia corretta
- Controlla che il database Neon sia attivo
- Verifica la presenza di `?sslmode=require` nell'URL

### Token non valido o scaduto
- Fai logout e login nuovamente
- Verifica che `JWT_SECRET` sia configurato

### Codice a barre non si stampa
- Verifica che JsBarcode sia caricato correttamente
- Controlla la console del browser per errori

## 📝 API Endpoints

### Autenticazione
- `POST /api/login` - Login utente

### Materiali
- `GET /api/materiali` - Lista materiali
- `GET /api/materiali/:id` - Dettaglio materiale
- `POST /api/materiali` - Crea materiale
- `PUT /api/materiali/:id` - Aggiorna materiale
- `PATCH /api/materiali/:id/stato` - Cambia stato
- `DELETE /api/materiali/:id` - Elimina materiale
- `GET /api/materiali/:id/barcode` - Genera barcode

### Volontari
- `GET /api/volontari` - Lista volontari
- `GET /api/volontari/:id` - Dettaglio volontario
- `POST /api/volontari` - Crea volontario
- `PUT /api/volontari/:id` - Aggiorna volontario
- `DELETE /api/volontari/:id` - Elimina volontario

### Assegnazioni
- `GET /api/assegnazioni` - Lista assegnazioni
- `GET /api/assegnazioni/:id` - Dettaglio assegnazione
- `POST /api/assegnazioni` - Crea assegnazione
- `PATCH /api/assegnazioni/:id/rientro` - Registra rientro
- `DELETE /api/assegnazioni/:id` - Elimina assegnazione

### Manutenzioni
- `GET /api/manutenzioni` - Lista manutenzioni
- `POST /api/manutenzioni` - Crea manutenzione
- `PATCH /api/manutenzioni/:id/completa` - Completa manutenzione

### Utenti (Solo Admin)
- `GET /api/utenti` - Lista utenti
- `POST /api/utenti` - Crea utente
- `PUT /api/utenti/:id` - Aggiorna utente
- `DELETE /api/utenti/:id` - Elimina utente
- `PATCH /api/utenti/:id/password` - Cambia password

### Report
- `GET /api/report/dashboard` - Statistiche dashboard
- `GET /api/report/materiali` - Report materiali
- `GET /api/report/assegnazioni` - Report assegnazioni
- `GET /api/report/attivita` - Log attività

## 🔒 Sicurezza

- Password hashate con bcrypt (salt rounds: 10)
- JWT con scadenza 24h
- SQL injection prevention con prepared statements
- CORS configurato
- Headers di sicurezza HTTP
- Validazione input su tutti gli endpoint

## 📞 Supporto

Per problemi o domande:
- Email: supporto@cri-campania.it
- Telefono: +39 XXX XXXXXXX

## 📄 Licenza

© 2024 Croce Rossa Italiana - Comitato Regionale Campania  
Tutti i diritti riservati.

---

**Sviluppato con ❤️ per la Croce Rossa Italiana**
