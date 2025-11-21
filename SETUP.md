# 🚀 Guida Rapida Setup - Warehouse SOR Campania

## ✅ Checklist Setup

### 1. Preparazione Database Neon

1. Vai su https://neon.tech e crea un account
2. Crea un nuovo progetto chiamato "warehouse-sor-campania"
3. Copia la connection string (formato: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. Apri la SQL Editor in Neon
5. Copia e incolla tutto il contenuto del file `init-db.sql`
6. Esegui lo script SQL
7. Verifica che le tabelle siano state create correttamente

### 2. Setup Locale

```bash
# Clona/Scarica il progetto
cd warehouse-sor-campania

# Installa dipendenze
npm install

# Crea file .env
cp .env.example .env

# Modifica .env con i tuoi dati
# DATABASE_URL=postgresql://...
# JWT_SECRET=genera-una-stringa-casuale-sicura
```

### 3. Test Locale

```bash
# Avvia server di sviluppo
npm run dev

# Apri browser su http://localhost:3000
# Login con: admin / admin123
```

### 4. Deploy su Vercel

```bash
# Installa Vercel CLI (se non già installato)
npm install -g vercel

# Login su Vercel
vercel login

# Deploy (prima volta)
vercel

# Configura variabili d'ambiente
vercel env add DATABASE_URL
# Incolla la connection string di Neon

vercel env add JWT_SECRET
# Incolla una stringa segreta casuale

# Deploy in produzione
vercel --prod
```

### 5. Post-Deploy

1. Apri l'URL fornito da Vercel
2. Login con credenziali di default
3. **IMPORTANTE**: Cambia subito le password!
4. Crea nuovi utenti Admin e Operatore
5. Testa tutte le funzionalità

## 🔧 Funzionalità Principali

### Per Iniziare

1. **Crea Volontari**: Vai su "Volontari" → "Nuovo Volontario"
2. **Aggiungi Materiali**: Vai su "Materiali" → "Nuovo Materiale"
3. **Stampa Etichette**: Clicca "Stampa Etichetta" su ogni materiale
4. **Applica Etichette**: Attacca le etichette fisicamente sui materiali

### Workflow Tipico

#### Assegnazione per Evento
1. Vai su "Assegnazioni" → "Nuova Assegnazione"
2. Seleziona materiale disponibile
3. Seleziona volontario attivo
4. Inserisci nome evento e date
5. Conferma → Materiale diventa "Assegnato"

#### Rientro Materiale
1. Vai su "Assegnazioni"
2. Trova assegnazione attiva
3. Clicca "Rientro"
4. Inserisci data rientro
5. Se danneggiato, spunta checkbox e descrivi il danno
6. Conferma → Materiale torna disponibile (o fuori servizio se danneggiato)

#### Gestione Danno
1. Se materiale rientrato danneggiato, viene automaticamente creato record manutenzione
2. Vai su "Manutenzioni"
3. Trova il materiale
4. Clicca "Modifica" per aggiornare l'intervento
5. Seleziona esito:
   - **Riparato**: materiale torna disponibile
   - **Da dismettere**: materiale resta fuori servizio
   - **In attesa**: materiale resta fuori servizio temporaneamente

#### Dismissione Definitiva (Solo Admin)
1. Vai su "Materiali"
2. Trova il materiale da dismettere
3. Clicca "Modifica"
4. Cambia stato in "Dismesso"
5. Aggiungi note sulla motivazione
6. Conferma

## 👥 Differenze Ruoli

### Admin può:
- ✅ Tutte le operazioni Operatore
- ✅ Gestire utenti (creare, modificare, eliminare)
- ✅ Eliminare materiali e volontari
- ✅ Dismettere materiali

### Operatore può:
- ✅ Visualizzare tutti i dati
- ✅ Creare e modificare materiali (eccetto dismissione)
- ✅ Creare e modificare volontari
- ✅ Gestire assegnazioni e rientri
- ✅ Gestire manutenzioni
- ✅ Stampare etichette
- ❌ Non può gestire utenti
- ❌ Non può eliminare materiali/volontari
- ❌ Non può dismettere materiali

## 🔐 Sicurezza

### Password Predefinite da Cambiare
```
admin / admin123
operatore / operatore123
```

### Generare JWT_SECRET Sicuro
```bash
# Su Linux/Mac
openssl rand -base64 32

# Su Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Best Practices
- Cambia immediatamente le password di default
- Usa password complesse (min 12 caratteri)
- Genera JWT_SECRET casuale per produzione
- Backup regolare del database Neon
- Monitora il log delle attività

## 🐛 Risoluzione Problemi Comuni

### Errore: "DATABASE_URL non configurata"
- Verifica che .env contenga DATABASE_URL
- Su Vercel, verifica le variabili d'ambiente nel dashboard

### Errore: "Credenziali non valide"
- Verifica username e password
- Le password sono case-sensitive
- Prova a resettare la password nel database

### Etichetta non si stampa
- Verifica che il browser permetta popup
- Prova con un altro browser
- Controlla la console JavaScript per errori

### Materiale non può essere eliminato
- Verifica che non ci siano assegnazioni attive
- Solo admin può eliminare
- Prima chiudi tutte le assegnazioni

### Token scaduto
- Il token JWT scade dopo 8 ore
- Effettua nuovo login
- Considera di aumentare la durata in lib/auth.js

## 📊 Backup e Manutenzione

### Backup Database
1. Vai nel dashboard Neon
2. Sezione "Backups"
3. Crea backup manuale prima di modifiche importanti
4. Neon mantiene backup automatici

### Pulizia Dati
- Elimina periodicamente materiali dismessi vecchi
- Archivia assegnazioni vecchie se necessario
- Mantieni log attività per audit

## 📞 Supporto

Per assistenza:
1. Controlla README.md per documentazione completa
2. Leggi API.md per dettagli API
3. Consulta i log in Vercel dashboard
4. Verifica log attività nel database

## 🎯 Prossimi Passi

Dopo il setup iniziale:
1. ✅ Importa volontari esistenti
2. ✅ Censisci materiali esistenti
3. ✅ Stampa ed applica tutte le etichette
4. ✅ Forma gli operatori sull'uso del sistema
5. ✅ Testa il workflow completo con un evento di prova
6. ✅ Configura backup automatici
7. ✅ Pianifica revisione mensile dati

## 📈 Statistiche Utili

Il sistema tiene traccia di:
- Numero totale materiali per categoria
- Materiali disponibili vs assegnati
- Storico assegnazioni per volontario
- Costi manutenzioni
- Log completo attività utenti

Utilizza i filtri per generare report personalizzati!

---

**Buon lavoro con Warehouse SOR Campania! 🏛️**
