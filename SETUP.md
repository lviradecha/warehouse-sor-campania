# 🚀 Setup Rapido - Warehouse SOR Campania

## Deploy su Netlify in 5 minuti

### 1. Prepara il Database Neon

```bash
# Vai su https://neon.tech e crea un account gratuito
# Crea un nuovo progetto: "warehouse-sor-campania"
# Copia la connection string (simile a):
# postgresql://user:pass@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require

# Esegui lo schema SQL:
# - Apri SQL Editor su Neon
# - Copia e incolla il contenuto di database/schema.sql
# - Esegui la query
```

### 2. Deploy su Netlify

#### Opzione A: Deploy da GitHub (Consigliato)

```bash
# Pusha il codice su GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tuousername/warehouse-sor-campania.git
git push -u origin main

# Vai su netlify.com
# - "Add new site" → "Import an existing project"
# - Connetti GitHub
# - Seleziona il repository
# - Conferma le impostazioni (dovrebbero essere auto-rilevate)
```

#### Opzione B: Deploy Manuale

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify init
netlify deploy --prod
```

### 3. Configura Variabili d'Ambiente

Su Netlify Dashboard:
1. Vai in "Site settings" → "Environment variables"
2. Aggiungi:
   ```
   DATABASE_URL = postgresql://...tua_connection_string...
   JWT_SECRET = genera_una_chiave_segreta_casuale
   ```

Per generare JWT_SECRET:
```bash
# Su Mac/Linux:
openssl rand -base64 32

# Su Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Oppure usa un generatore online: https://randomkeygen.com/
```

### 4. Primo Accesso

```
URL: https://tuosito.netlify.app
Username: admin
Password: Admin2024!

⚠️ CAMBIA SUBITO LA PASSWORD dopo il primo accesso!
```

### 5. Aggiungi il Logo CRI

Carica il logo della Croce Rossa in `/public/assets/logo-cri.png`

---

## ✅ Checklist Post-Deploy

- [ ] Database Neon creato e schema caricato
- [ ] Variabili d'ambiente configurate su Netlify
- [ ] Sito deployato e accessibile
- [ ] Login effettuato con successo
- [ ] Password admin cambiata
- [ ] Logo CRI caricato
- [ ] Testato inserimento materiale
- [ ] Testato inserimento volontario
- [ ] Testata assegnazione

---

## 🔧 Risoluzione Problemi Comuni

### Errore "Database connection failed"
- Verifica che `DATABASE_URL` sia corretta nelle variabili d'ambiente
- Controlla che contenga `?sslmode=require` alla fine

### Errore "Token not valid"
- Verifica che `JWT_SECRET` sia configurato
- Prova a fare logout e re-login

### Pagina bianca dopo login
- Apri la Console del browser (F12)
- Controlla gli errori JavaScript
- Verifica che tutte le API siano raggiungibili

---

## 📞 Supporto

Per problemi tecnici:
- Controlla i log su Netlify Dashboard → Functions
- Verifica lo stato del database su Neon Dashboard
- Consulta il README.md completo per la documentazione

Buon lavoro! 🎉
