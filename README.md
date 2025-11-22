# Warehouse SOR Campania - API Corrette

## Struttura File API

Tutti i file nella cartella `/api-corretta` devono essere spostati nella cartella `/api` del tuo progetto GitHub.

```
warehouse-sor-campania/
├── api/
│   ├── auth.js              ← Login
│   ├── materiali.js         ← CRUD materiali
│   ├── volontari.js         ← CRUD volontari
│   ├── assegnazioni.js      ← CRUD assegnazioni
│   ├── manutenzioni.js      ← CRUD manutenzioni
│   ├── utenti.js            ← CRUD utenti (admin)
│   ├── generate-label.js    ← Genera etichette con barcode
│   └── generate-hash.js     ← Utility hash password
├── public/
│   ├── index.html
│   ├── login.html
│   └── ... (altri file frontend)
├── package.json
└── vercel.json
```

## Procedura di Installazione

### 1. Copia i file API nel progetto

Tramite GitHub Desktop:

1. Apri la cartella del progetto `warehouse-sor-campania`
2. **ELIMINA** la cartella `/api` esistente (se presente)
3. **CREA** una nuova cartella `/api` vuota
4. **COPIA** tutti i file da `/api-corretta` dentro `/api`:
   - auth.js
   - materiali.js
   - volontari.js
   - assegnazioni.js
   - manutenzioni.js
   - utenti.js
   - generate-label.js
   - generate-hash.js

### 2. Aggiorna package.json

Se non hai già un `package.json` nella root del progetto, copia quello fornito.

Se ne hai già uno, assicurati contenga:

```json
{
  "type": "module",
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "bcryptjs": "^2.4.3"
  }
}
```

### 3. Aggiorna vercel.json

Copia il file `vercel.json` nella root del progetto (sostituisci quello esistente).

### 4. Commit e Push su GitHub

Con GitHub Desktop:

1. Vedrai tutti i file modificati
2. Scrivi un commit message: "Fix: Corretta struttura API per Vercel"
3. Click su "Commit to main"
4. Click su "Push origin"

### 5. Vercel farà il Deploy Automatico

Vercel rileverà le modifiche e farà un nuovo deployment automaticamente.

### 6. Verifica Environment Variables su Vercel

Assicurati che su Vercel sia configurata:

- **DATABASE_URL**: La connection string di Neon PostgreSQL

## Test degli Endpoint

Dopo il deployment, gli endpoint saranno disponibili a:

```
https://tuo-dominio.vercel.app/api/auth
https://tuo-dominio.vercel.app/api/materiali
https://tuo-dominio.vercel.app/api/volontari
https://tuo-dominio.vercel.app/api/assegnazioni
https://tuo-dominio.vercel.app/api/manutenzioni
https://tuo-dominio.vercel.app/api/utenti
https://tuo-dominio.vercel.app/api/generate-label
```

### Test con curl:

```bash
# Test login
curl -X POST https://tuo-dominio.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Campania2024!"}'

# Test lista materiali
curl https://tuo-dominio.vercel.app/api/materiali
```

## Differenze rispetto alla versione precedente

✅ **CORRETTE:**
- Rimossi import da `../../lib/db.js` e `../../lib/auth.js` (non esistenti)
- Ogni endpoint è standalone con connessione Neon diretta
- Struttura piatta `/api/*.js` invece di sottocartelle
- Uso di `@neondatabase/serverless` direttamente
- Compatibilità totale con Vercel serverless functions

❌ **RIMOSSE:**
- Middleware `requireAuth` (da implementare nel frontend)
- Cartelle separate (assignments/, auth/, labels/, ecc.)
- File di libreria condivisi

## Note Importanti

1. **Autenticazione**: Gli endpoint NON hanno più il middleware di autenticazione lato server. L'autenticazione deve essere gestita nel frontend (salvare dati utente in localStorage dopo login).

2. **CORS**: Tutti gli endpoint hanno CORS abilitato (`Access-Control-Allow-Origin: *`)

3. **Database**: Tutti gli endpoint usano direttamente `@neondatabase/serverless` con la variabile `DATABASE_URL`

4. **Hash Password**: L'endpoint `/api/generate-hash` è utile per generare hash da inserire manualmente nel database se necessario.

## Prossimi Passi

Dopo aver deployato con successo:

1. Verifica che tutti gli endpoint rispondano
2. Testa il login dalla pagina web
3. Verifica che la lista materiali si carichi
4. Se tutto funziona, puoi procedere con le altre funzionalità

## Supporto

Se riscontri errori 404:
- Verifica che i file siano nella cartella `/api` (non in sottocartelle)
- Controlla i logs su Vercel Dashboard
- Verifica che `package.json` sia nella root del progetto
