# Warehouse SOR Campania - API (English Endpoints)

## 🎯 IMPORTANTE: Struttura Database

Questi endpoint API utilizzano **nomi di tabelle in INGLESE** per matchare le chiamate del frontend:

### Tabelle Database (INGLESE):
- `materials` (non "materiali")
- `volunteers` (non "volontari") 
- `assignments` (non "assegnazioni")
- `maintenance` (non "manutenzioni")
- `users` (non "utenti")

### Colonne Database (ITALIANO):
Le colonne rimangono in italiano come da schema originale:
- `codice`, `nome`, `categoria`, `stato`
- `data_acquisto`, `prezzo`, `note`
- ecc.

## 📁 Struttura File API

```
warehouse-sor-campania/
├── api/
│   ├── auth.js              ← Login
│   ├── materials.js         ← CRUD materiali (GET/POST/PUT/DELETE)
│   ├── volunteers.js        ← CRUD volontari
│   ├── assignments.js       ← CRUD assegnazioni
│   ├── maintenance.js       ← CRUD manutenzioni
│   ├── users.js             ← CRUD utenti (admin)
│   ├── generate-label.js    ← Genera etichette con barcode
│   └── generate-hash.js     ← Utility hash password
├── public/
│   ├── index.html
│   ├── app.js               ← Frontend JavaScript
│   └── ... (altri file)
├── package.json
└── vercel.json
```

## 🚀 INSTALLAZIONE

### 1. Sostituisci file API nel progetto

Con GitHub Desktop:

1. Apri progetto `warehouse-sor-campania`
2. **ELIMINA** la cartella `/api` esistente
3. **CREA** nuova cartella `/api` vuota
4. **COPIA** tutti i file `.js` da questo ZIP dentro `/api`:
   - auth.js
   - materials.js
   - volunteers.js
   - assignments.js
   - maintenance.js
   - users.js
   - generate-label.js
   - generate-hash.js

5. **COPIA** `package.json` e `vercel.json` nella **root** del progetto

### 2. VERIFICA DATABASE

**CRITICO**: Il database deve avere le tabelle con nomi in INGLESE.

Se le tue tabelle sono in italiano, devi rinominarle:

```sql
-- Rinomina tabelle da italiano a inglese
ALTER TABLE materiali RENAME TO materials;
ALTER TABLE volontari RENAME TO volunteers;
ALTER TABLE assegnazioni RENAME TO assignments;
ALTER TABLE manutenzioni RENAME TO maintenance;
ALTER TABLE utenti RENAME TO users;
```

### 3. Commit e Push

```
Commit message: "Fix: API endpoints with English table names"
```

### 4. Vercel Deploy Automatico

Aspetta 1-2 minuti.

### 5. Verifica Environment Variables

Su Vercel Dashboard:
- **DATABASE_URL** = Connection string Neon PostgreSQL

## 🧪 TEST RAPIDO

```bash
# Test che il frontend ora chiama
curl https://tuo-dominio.vercel.app/api/materials
curl https://tuo-dominio.vercel.app/api/volunteers
curl https://tuo-dominio.vercel.app/api/assignments
curl https://tuo-dominio.vercel.app/api/maintenance
curl https://tuo-dominio.vercel.app/api/users
```

Devono rispondere con `[]` (array vuoto) o con dati, NON con 404.

## 📋 ENDPOINT DISPONIBILI

```
POST   /api/auth              → Login
GET    /api/materials         → Lista materiali
POST   /api/materials         → Crea materiale
PUT    /api/materials         → Aggiorna materiale
DELETE /api/materials?id=X    → Elimina materiale

GET    /api/volunteers        → Lista volontari
POST   /api/volunteers        → Crea volontario
PUT    /api/volunteers        → Aggiorna volontario
DELETE /api/volunteers?id=X   → Elimina volontario

GET    /api/assignments       → Lista assegnazioni
POST   /api/assignments       → Crea assegnazione
PUT    /api/assignments       → Gestisci rientro

GET    /api/maintenance       → Lista manutenzioni
POST   /api/maintenance       → Crea manutenzione
PUT    /api/maintenance       → Completa manutenzione

GET    /api/users             → Lista utenti
POST   /api/users             → Crea utente
PUT    /api/users             → Aggiorna utente
DELETE /api/users?id=X        → Elimina utente

POST   /api/generate-label    → Genera etichetta stampabile
POST   /api/generate-hash     → Genera hash password
```

## ⚠️ TROUBLESHOOTING

### Errore 404 ancora presente?

1. Verifica che i file siano nella cartella `/api` (non sottocartelle)
2. Controlla logs su Vercel Dashboard
3. Verifica che `package.json` sia nella root

### Errore "relation does not exist"?

Le tabelle del database hanno ancora nomi in italiano. Rinominale come indicato sopra.

### Dati non visualizzati?

1. Verifica che ci siano dati nel database
2. Controlla console browser per errori
3. Testa endpoint con curl

## 📝 NOTE

- **CORS**: Abilitato su tutti gli endpoint
- **Autenticazione**: Gestita dal frontend (localStorage)
- **Database**: Neon PostgreSQL serverless
- **Deploy**: Automatico ad ogni push su GitHub

## ✅ CHECKLIST FINALE

- [ ] File API copiati in `/api`
- [ ] `package.json` nella root
- [ ] `vercel.json` nella root
- [ ] Tabelle database rinominate in inglese
- [ ] DATABASE_URL configurata su Vercel
- [ ] Commit e push effettuati
- [ ] Deploy completato
- [ ] Test endpoint con curl OK
- [ ] Login funzionante
- [ ] Liste materiali/volontari visibili

Tutto OK? Sei pronto! 🚀
