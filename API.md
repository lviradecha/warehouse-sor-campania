# Documentazione API - Warehouse SOR Campania

## Base URL
```
https://your-domain.vercel.app/api
```

## Autenticazione

Tutte le API (eccetto `/auth/login`) richiedono un token JWT nell'header:
```
Authorization: Bearer <token>
```

## Endpoints

### Autenticazione

#### POST /auth/login
Login utente

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Amministratore Sistema",
    "role": "admin"
  }
}
```

---

### Materiali

#### GET /materials
Ottieni lista materiali con filtri opzionali

**Query Parameters:**
- `status` (optional): disponibile, assegnato, fuori_servizio, dismesso
- `category` (optional): categoria del materiale
- `search` (optional): ricerca per nome/barcode/descrizione

**Response:**
```json
[
  {
    "id": 1,
    "barcode": "MAT001",
    "name": "Tenda 4x4",
    "category": "Tende",
    "description": "Tenda da campo 4x4 metri",
    "purchase_date": "2024-01-15",
    "purchase_price": 450.00,
    "status": "disponibile",
    "notes": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /materials
Crea nuovo materiale

**Permissions:** Admin, Operatore

**Request Body:**
```json
{
  "barcode": "MAT002",
  "name": "Generatore 5kW",
  "category": "Generatori",
  "description": "Generatore diesel 5kW",
  "purchase_date": "2024-02-01",
  "purchase_price": 1200.00
}
```

#### PUT /materials
Aggiorna materiale esistente

**Permissions:** Admin (per status=dismesso), Operatore (altri campi)

**Request Body:**
```json
{
  "id": 1,
  "name": "Tenda 4x4 Rinforzata",
  "category": "Tende",
  "description": "Tenda da campo rinforzata",
  "purchase_date": "2024-01-15",
  "purchase_price": 500.00,
  "status": "disponibile",
  "notes": "Rinforzata dopo manutenzione"
}
```

#### DELETE /materials?id={id}
Elimina materiale

**Permissions:** Solo Admin

---

### Volontari

#### GET /volunteers
Ottieni lista volontari

**Query Parameters:**
- `active` (optional): true, false
- `search` (optional): ricerca per nome/codice/email

**Response:**
```json
[
  {
    "id": 1,
    "full_name": "Mario Rossi",
    "code": "VOL001",
    "phone": "3331234567",
    "email": "mario.rossi@example.com",
    "active": true,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-10T09:00:00Z"
  }
]
```

#### POST /volunteers
Crea nuovo volontario

**Request Body:**
```json
{
  "full_name": "Luigi Verdi",
  "code": "VOL002",
  "phone": "3339876543",
  "email": "luigi.verdi@example.com"
}
```

#### PUT /volunteers
Aggiorna volontario

**Request Body:**
```json
{
  "id": 1,
  "full_name": "Mario Rossi",
  "code": "VOL001",
  "phone": "3331234567",
  "email": "mario.rossi@example.com",
  "active": true
}
```

#### DELETE /volunteers?id={id}
Elimina volontario

**Permissions:** Solo Admin

---

### Assegnazioni

#### GET /assignments
Ottieni lista assegnazioni

**Query Parameters:**
- `status` (optional): assegnato, rientrato, danneggiato
- `volunteer_id` (optional): filtra per volontario
- `material_id` (optional): filtra per materiale

**Response:**
```json
[
  {
    "id": 1,
    "material_id": 1,
    "volunteer_id": 1,
    "event_name": "Esercitazione Protezione Civile",
    "assignment_date": "2024-03-01T08:00:00Z",
    "expected_return_date": "2024-03-03",
    "actual_return_date": null,
    "return_notes": null,
    "assigned_by": 1,
    "returned_by": null,
    "status": "assegnato",
    "material_name": "Tenda 4x4",
    "material_barcode": "MAT001",
    "material_category": "Tende",
    "volunteer_name": "Mario Rossi",
    "volunteer_code": "VOL001",
    "assigned_by_name": "Admin Sistema",
    "returned_by_name": null,
    "created_at": "2024-03-01T08:00:00Z",
    "updated_at": "2024-03-01T08:00:00Z"
  }
]
```

#### POST /assignments
Crea nuova assegnazione

**Request Body:**
```json
{
  "material_id": 1,
  "volunteer_id": 1,
  "event_name": "Esercitazione Protezione Civile",
  "assignment_date": "2024-03-01T08:00:00Z",
  "expected_return_date": "2024-03-03"
}
```

#### PUT /assignments
Registra rientro materiale

**Request Body:**
```json
{
  "id": 1,
  "actual_return_date": "2024-03-03T18:00:00Z",
  "return_notes": "Materiale rientrato in buone condizioni",
  "damaged": false
}
```

Se `damaged: true`, il materiale viene messo fuori servizio e viene creato automaticamente un record di manutenzione.

---

### Manutenzioni

#### GET /maintenance
Ottieni storico manutenzioni

**Query Parameters:**
- `material_id` (optional): filtra per materiale
- `outcome` (optional): riparato, da_dismettere, in_attesa

**Response:**
```json
[
  {
    "id": 1,
    "material_id": 1,
    "maintenance_type": "riparazione",
    "description": "Sostituzione palo tenda danneggiato",
    "cost": 45.00,
    "maintenance_date": "2024-03-05",
    "performed_by": "Officina SOR",
    "outcome": "riparato",
    "notes": "Palo sostituito, tenda testata",
    "created_by": 1,
    "material_name": "Tenda 4x4",
    "material_barcode": "MAT001",
    "created_by_name": "Admin Sistema",
    "created_at": "2024-03-05T10:00:00Z"
  }
]
```

#### POST /maintenance
Crea record manutenzione

**Request Body:**
```json
{
  "material_id": 1,
  "maintenance_type": "riparazione",
  "description": "Sostituzione palo danneggiato",
  "cost": 45.00,
  "maintenance_date": "2024-03-05",
  "performed_by": "Officina SOR",
  "outcome": "riparato",
  "notes": "Palo sostituito"
}
```

**Outcome values:**
- `riparato`: Il materiale torna disponibile
- `da_dismettere`: Il materiale resta fuori servizio
- `in_attesa`: Il materiale resta fuori servizio

#### PUT /maintenance
Aggiorna record manutenzione

**Request Body:**
```json
{
  "id": 1,
  "maintenance_type": "riparazione",
  "description": "Sostituzione palo tenda e rinforzo struttura",
  "cost": 55.00,
  "maintenance_date": "2024-03-05",
  "performed_by": "Officina SOR",
  "outcome": "riparato",
  "notes": "Riparazione completata con successo"
}
```

---

### Etichette

#### POST /labels/generate
Genera HTML per stampa etichetta con codice a barre

**Request Body:**
```json
{
  "material_id": 1
}
```

**Response:**
HTML completo con codice a barre JsBarcode, pronto per essere aperto in una nuova finestra e stampato.

---

### Utenti (Solo Admin)

#### GET /users
Ottieni lista utenti

**Permissions:** Solo Admin

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "full_name": "Amministratore Sistema",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /users
Crea nuovo utente

**Permissions:** Solo Admin

**Request Body:**
```json
{
  "username": "operatore2",
  "password": "password123",
  "full_name": "Nuovo Operatore",
  "role": "operatore"
}
```

#### PUT /users
Aggiorna utente

**Permissions:** Solo Admin

**Request Body:**
```json
{
  "id": 2,
  "full_name": "Operatore Aggiornato",
  "role": "operatore",
  "password": "nuovapassword"  // opzionale
}
```

**Note:** Non puoi modificare il tuo stesso account tramite questa API.

#### DELETE /users?id={id}
Elimina utente

**Permissions:** Solo Admin

**Note:** 
- Non puoi eliminare te stesso
- Non puoi eliminare l'ultimo admin del sistema

---

## Codici di Stato HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (token mancante o non valido)
- `403` - Forbidden (permessi insufficienti)
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Errori

Formato errore standard:
```json
{
  "error": "Messaggio di errore descrittivo"
}
```

## Rate Limiting

Attualmente non implementato, ma raccomandato per produzione.

## CORS

Le API supportano CORS per permettere l'accesso da domini diversi.
