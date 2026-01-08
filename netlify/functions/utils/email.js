// ===================================
<<<<<<< Updated upstream
// EMAIL UTILITY - Gmail API
// Gestione invio email notifiche tramite Google Cloud
// ===================================

const { google } = require('googleapis');

// Configurazione Gmail API
const GOOGLE_SERVICE_ACCOUNT_BASE64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
const GMAIL_USER = process.env.GMAIL_USER;
const FROM_NAME = process.env.FROM_NAME || 'CRI SOR Campania - Sistema Magazzino';

let gmail = null;

// Inizializza Gmail API con Service Account
async function initializeGmailAPI() {
    if (!GOOGLE_SERVICE_ACCOUNT_BASE64) {
        console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_BASE64 non configurata');
        return null;
    }

    if (!GMAIL_USER) {
        console.warn('⚠️ GMAIL_USER non configurata');
        return null;
    }

    try {
        // Decodifica service account JSON da base64
        const serviceAccountJSON = Buffer.from(GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
        const serviceAccount = JSON.parse(serviceAccountJSON);

        // Crea JWT client
        const auth = new google.auth.JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/gmail.send'],
            subject: GMAIL_USER // Impersona questo utente
        });

        // Inizializza Gmail API client
        gmail = google.gmail({ version: 'v1', auth });
        
        console.log('✅ Gmail API inizializzata per:', GMAIL_USER);
        return gmail;
    } catch (error) {
        console.error('❌ Errore inizializzazione Gmail API:', error.message);
        return null;
    }
}

// Crea messaggio email in formato RFC 2822
function createRFC2822Message(to, subject, htmlContent, textContent) {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const message = [
        `From: "${FROM_NAME}" <${GMAIL_USER}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        textContent,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        htmlContent,
        '',
        `--${boundary}--`
    ].join('\r\n');

    // Converti in base64url (Gmail API richiede questo formato)
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return encodedMessage;
=======
// EMAIL UTILITY - Resend
// Gestione invio email notifiche
// ===================================

const { Resend } = require('resend');

// Inizializza Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sor-campania.it';
const FROM_NAME = process.env.FROM_NAME || 'CRI SOR Campania - Sistema Magazzino';

let resend = null;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
>>>>>>> Stashed changes
}

/**
 * Invia email generica
 */
async function sendEmail(to, subject, htmlContent, textContent) {
<<<<<<< Updated upstream
    // Inizializza Gmail API se non già fatto
    if (!gmail) {
        gmail = await initializeGmailAPI();
    }

    if (!gmail) {
        console.warn('Gmail API non configurata, email non inviata:', to);
        return { success: false, message: 'Gmail API non configurata' };
    }

    try {
        // Crea messaggio RFC 2822
        const raw = createRFC2822Message(to, subject, htmlContent, textContent);

        // Invia tramite Gmail API
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: raw
            }
        });

        console.log('✅ Email inviata tramite Gmail API a:', to);
        console.log('   Message ID:', response.data.id);
        
        return { 
            success: true, 
            messageId: response.data.id,
            threadId: response.data.threadId 
        };
    } catch (error) {
        console.error('❌ Errore invio email Gmail API:', error.message);
        
        // Log dettagliato errori comuni
        if (error.code === 400) {
            console.error('⚠️ BAD REQUEST - Verifica formato email e parametri');
        } else if (error.code === 401) {
            console.error('⚠️ UNAUTHORIZED - Verifica service account e scope');
        } else if (error.code === 403) {
            console.error('⚠️ FORBIDDEN - Verifica Gmail API sia abilitata');
        } else if (error.code === 429) {
            console.error('⚠️ QUOTA EXCEEDED - Limite Gmail API raggiunto (molto raro)');
        }
        
        return { 
            success: false, 
            message: error.message, 
            code: error.code 
        };
=======
    if (!RESEND_API_KEY || !resend) {
        console.warn('Resend non configurato, email non inviata:', to);
        return { success: false, message: 'Resend non configurato' };
    }

    try {
        const result = await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [to],
            subject,
            html: htmlContent,
            text: textContent
        });

        console.log('✅ Email inviata a:', to);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('❌ Errore invio email:', error);
        return { success: false, message: error.message };
>>>>>>> Stashed changes
    }
}

/**
 * Email credenziali nuovo utente
 */
async function sendNewUserCredentials(email, nome, cognome, username, tempPassword) {
    const subject = '🔑 Credenziali Accesso Sistema Magazzino CRI';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .header { 
                    background: #d32f2f; 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 5px 5px 0 0; 
                }
                .logo-circle {
                    width: 80px;
                    height: 80px;
                    background: white;
                    border-radius: 50%;
                    margin: 0 auto 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .logo-circle img {
                    width: 60px;
                    height: 60px;
                }
                .header h1 { margin: 10px 0 5px; font-size: 24px; }
                .header p { margin: 0; font-size: 14px; opacity: 0.9; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; }
                .credentials { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-left: 4px solid #d32f2f; 
                    border-radius: 4px;
                }
                .credentials p { margin: 10px 0; }
                .credentials code { 
                    background: white; 
                    padding: 5px 10px; 
                    border-radius: 3px; 
                    font-size: 16px;
                    color: #d32f2f;
                    font-weight: bold;
                }
                .button { 
                    display: inline-block; 
                    background: #d32f2f; 
                    color: white !important; 
                    padding: 15px 40px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin-top: 20px;
                    font-weight: bold;
                }
                .warning { 
                    background: #fff3cd; 
                    padding: 15px; 
                    border-left: 4px solid #ffc107; 
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px; 
                    color: #666; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-circle">
                        <img src="https://warehouse-sor-campania.netlify.app/assets/logo-sor.png" alt="SOR Logo" onerror="this.style.display='none'">
                    </div>
                    <h1>Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                    <p style="font-size: 16px; margin-top: 10px;">Sistema Gestione Magazzino</p>
                </div>
                <div class="content">
                    <h2 style="color: #d32f2f;">Benvenuto ${nome} ${cognome}!</h2>
                    <p>È stato creato un account per te nel Sistema di Gestione Magazzino della CRI SOR Campania.</p>
                    
                    <div class="credentials">
                        <h3 style="margin-top: 0; color: #d32f2f;">📋 Le tue credenziali di accesso:</h3>
                        <p><strong>Username:</strong> <code>${username}</code></p>
                        <p><strong>Password temporanea:</strong> <code>${tempPassword}</code></p>
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ IMPORTANTE:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li>Al primo accesso ti verrà richiesto di cambiare la password</li>
                            <li>Conserva questa email in modo sicuro</li>
                            <li>Non condividere le tue credenziali con altri</li>
                        </ul>
                    </div>
                    
                    <p>Se hai domande o problemi di accesso, contatta l'amministratore del sistema.</p>
                    
                    <div style="text-align: center;">
                        <a href="${process.env.URL || 'https://warehouse-sor-campania.netlify.app'}" class="button">
                            🔐 Accedi al Sistema
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p><strong>© ${new Date().getFullYear()} Croce Rossa Italiana - SOR Campania</strong></p>
                    <p>Questa è una email automatica, non rispondere.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const textContent = `
Benvenuto ${nome} ${cognome}!

È stato creato un account per te nel Sistema di Gestione Magazzino CRI SOR Campania.

CREDENZIALI DI ACCESSO:
Username: ${username}
Password temporanea: ${tempPassword}
URL: ${process.env.URL || 'https://warehouse-sor-campania.netlify.app'}

IMPORTANTE:
- Al primo accesso dovrai cambiare la password
- Conserva questa email in modo sicuro
- Non condividere le tue credenziali

Grazie per il tuo servizio volontario! 🙏

Croce Rossa Italiana - SOR Campania
    `;
    
    return sendEmail(email, subject, htmlContent, textContent);
}

/**
 * Email assegnazione materiale singolo
 */
async function sendAssignmentNotification(volunteerEmail, volunteerName, materialName, materialCode, quantity, evento, dataUscita, note, dataRientroPrevista = null) {
    const subject = '📦 Assegnazione Materiale - CRI SOR Campania';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .header { background: #d32f2f; color: white; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 10px 0; font-size: 24px; }
                .content { background: white; padding: 30px; }
                .assignment-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2 style="color: #d32f2f;">Ciao ${volunteerName}! 👋</h2>
                    <p>Ti è stato assegnato del materiale per l'evento <strong>"${evento}"</strong>.</p>
                    
                    <div class="assignment-box">
                        <h3 style="color: #d32f2f;">📦 Materiale Assegnato:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <p><strong>Quantità:</strong> ${quantity}</p>
                        <p><strong>Codice:</strong> ${materialCode}</p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Uscita:</strong> ${new Date(dataUscita).toLocaleString('it-IT')}</p>
                        ${dataRientroPrevista ? `<p><strong>Rientro Previsto:</strong> ${new Date(dataRientroPrevista).toLocaleString('it-IT')}</p>` : ''}
                        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <p style="color: #d32f2f; font-weight: bold; text-align: center; margin-top: 20px;">
                        Grazie per il tuo servizio volontario! 🙏
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textContent = `
Croce Rossa Italiana - SOR Campania

ASSEGNAZIONE MATERIALE

Ciao ${volunteerName}!

Ti è stato assegnato materiale per "${evento}".

Materiale: ${materialName}
Quantità: ${quantity}
Codice: ${materialCode}
Data Uscita: ${new Date(dataUscita).toLocaleString('it-IT')}
${dataRientroPrevista ? `Rientro Previsto: ${new Date(dataRientroPrevista).toLocaleString('it-IT')}` : ''}
${note ? `Note: ${note}` : ''}

Grazie per il tuo servizio! 🙏
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

/**
 * Email restituzione materiale
 */
async function sendReturnNotification(volunteerEmail, volunteerName, materialName, materialCode, quantity, evento, dataRientro, noteRientro) {
    const subject = '✅ Restituzione Materiale Confermata - CRI SOR Campania';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .header { background: #2e7d32; color: white; padding: 30px 20px; text-align: center; }
                .content { background: white; padding: 30px; }
                .return-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #2e7d32; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2 style="color: #2e7d32;">Restituzione Confermata ✅</h2>
                    <p>Ciao ${volunteerName}, confermiamo la restituzione del materiale.</p>
                    
                    <div class="return-box">
                        <h3>📦 Materiale Restituito:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <p><strong>Quantità:</strong> ${quantity}</p>
                        <p><strong>Codice:</strong> ${materialCode}</p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Rientro:</strong> ${new Date(dataRientro).toLocaleString('it-IT')}</p>
                        ${noteRientro ? `<p><strong>Note:</strong> ${noteRientro}</p>` : ''}
                    </div>
                    
                    <p style="color: #2e7d32; font-weight: bold; text-align: center;">
                        Grazie per il tuo servizio! 🙏
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textContent = `
Restituzione Materiale Confermata ✅

Ciao ${volunteerName}, confermiamo la restituzione del materiale.

Materiale: ${materialName}
Quantità: ${quantity}
Codice: ${materialCode}
Evento: ${evento}
Data Rientro: ${new Date(dataRientro).toLocaleString('it-IT')}
${noteRientro ? `Note: ${noteRientro}` : ''}

Grazie per il tuo servizio! 🙏
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

/**
 * Email assegnazione automezzo
 */
async function sendVehicleAssignmentNotification(volunteerEmail, volunteerName, vehicleData, evento, dataUscita, note, dataRientroPrevista = null) {
    const subject = '🚗 Assegnazione Automezzo - CRI SOR Campania';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
<<<<<<< Updated upstream
                .header { background: #1565c0; color: white; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; }
                .vehicle-box { background: #e3f2fd; padding: 20px; margin: 20px 0; border-left: 4px solid #1565c0; }
=======
                .header { 
                    background: #1565c0; 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 5px 5px 0 0;
                }
                .header h1 { margin: 10px 0 5px; font-size: 24px; }
                .header p { margin: 0; font-size: 14px; opacity: 0.9; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; }
                .vehicle-box { 
                    background: #e3f2fd; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-left: 4px solid #1565c0; 
                    border-radius: 4px;
                }
                .vehicle-box h3 { margin-top: 0; color: #1565c0; }
                .vehicle-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 15px; 
                    margin: 15px 0;
                }
                .info-item { 
                    background: white; 
                    padding: 12px; 
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .info-item strong { color: #1565c0; display: block; margin-bottom: 5px; }
                .warning { 
                    background: #fff3cd; 
                    padding: 15px; 
                    border-left: 4px solid #ffc107; 
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px; 
                    color: #666; 
                }
>>>>>>> Stashed changes
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 Assegnazione Automezzo</h1>
                    <p>Croce Rossa Italiana - SOR Campania</p>
                </div>
                <div class="content">
                    <h2 style="color: #1565c0;">Ciao ${volunteerName}! 👋</h2>
                    <p>Ti è stato assegnato un automezzo per l'evento <strong>"${evento}"</strong>.</p>
<<<<<<< Updated upstream
                    
                    <div class="vehicle-box">
                        <h3 style="color: #1565c0;">🚗 Dettagli Automezzo:</h3>
                        <p><strong>Tipo:</strong> ${vehicleData.tipo}</p>
                        <p><strong>Targa:</strong> ${vehicleData.targa}</p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Uscita:</strong> ${new Date(dataUscita).toLocaleString('it-IT')}</p>
                        ${dataRientroPrevista ? `<p><strong>Rientro Previsto:</strong> ${new Date(dataRientroPrevista).toLocaleString('it-IT')}</p>` : ''}
                        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <p style="color: #1565c0; font-weight: bold; text-align: center;">
                        Buon viaggio e grazie per il tuo servizio! 🙏
                    </p>
=======
                    
                    <div class="vehicle-icon">🚙</div>
                    
                    <div class="vehicle-box">
                        <h3>🚗 Dettagli Automezzo:</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>Tipo</strong>
                                ${vehicleData.tipo}
                            </div>
                            <div class="info-item">
                                <strong>Targa</strong>
                                ${vehicleData.targa}
                            </div>
                            <div class="info-item">
                                <strong>Evento</strong>
                                ${evento}
                            </div>
                            <div class="info-item">
                                <strong>Data Uscita</strong>
                                ${new Date(dataUscita).toLocaleString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                            ${dataRientroPrevista ? `
                            <div class="info-item" style="grid-column: 1 / -1;">
                                <strong>Rientro Previsto</strong>
                                ${new Date(dataRientroPrevista).toLocaleString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                            ` : ''}
                        </div>
                        ${note ? `<p style="margin-top: 15px;"><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ RESPONSABILITÀ AUTOMEZZO:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li>Controlla lo stato del veicolo prima della partenza</li>
                            <li>Annota i chilometri di partenza</li>
                            <li>Rispetta il codice della strada e le norme CRI</li>
                            <li>Segnala immediatamente eventuali problemi</li>
                            <li>Riconsegna il veicolo pulito e in ordine</li>
                        </ul>
                    </div>
                    
                    <p style="color: #1565c0; font-weight: bold; text-align: center; margin-top: 30px; font-size: 18px;">
                        Buon viaggio e grazie per il tuo servizio! 🙏
                    </p>
                </div>
                <div class="footer">
                    <p><strong>© ${new Date().getFullYear()} Croce Rossa Italiana - SOR Campania</strong></p>
                    <p>Questa è una email automatica, non rispondere.</p>
>>>>>>> Stashed changes
                </div>
            </div>
        </body>
        </html>
    `;

    const textContent = `
Assegnazione Automezzo 🚗

Croce Rossa Italiana - SOR Campania

Ciao ${volunteerName}!

Ti è stato assegnato un automezzo per "${evento}".

DETTAGLI AUTOMEZZO:
Tipo: ${vehicleData.tipo}
Targa: ${vehicleData.targa}
Evento: ${evento}
Data Uscita: ${new Date(dataUscita).toLocaleString('it-IT')}
${dataRientroPrevista ? `Rientro Previsto: ${new Date(dataRientroPrevista).toLocaleString('it-IT')}` : ''}
${note ? `Note: ${note}` : ''}

<<<<<<< Updated upstream
Buon viaggio e grazie! 🙏
=======
RESPONSABILITÀ:
- Controlla lo stato del veicolo prima della partenza
- Annota i chilometri di partenza
- Rispetta il codice della strada
- Segnala problemi immediatamente
- Riconsegna il veicolo pulito e in ordine

Buon viaggio e grazie per il tuo servizio! 🙏

Croce Rossa Italiana - SOR Campania
>>>>>>> Stashed changes
    `;

    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

/**
 * Email restituzione automezzo
 */
async function sendVehicleReturnNotification(volunteerEmail, volunteerName, vehicleData, returnData) {
    const subject = '✅ Restituzione Automezzo Confermata - CRI SOR Campania';
    
    const kmPercorsi = returnData.km_arrivo - returnData.km_partenza;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
<<<<<<< Updated upstream
                .header { background: #2e7d32; color: white; padding: 30px 20px; text-align: center; }
                .content { background: white; padding: 30px; }
                .return-box { background: #f1f8e9; padding: 20px; margin: 20px 0; border-left: 4px solid #2e7d32; }
=======
                .header { 
                    background: #2e7d32; 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                    border-radius: 5px 5px 0 0;
                }
                .header h1 { margin: 10px 0 5px; font-size: 24px; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; }
                .vehicle-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                .return-box { 
                    background: #f1f8e9; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-left: 4px solid #2e7d32; 
                    border-radius: 4px;
                }
                .return-box h3 { margin-top: 0; color: #2e7d32; }
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 15px; 
                    margin: 15px 0;
                }
                .info-item { 
                    background: white; 
                    padding: 12px; 
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .info-item strong { color: #2e7d32; display: block; margin-bottom: 5px; }
                .km-badge {
                    background: #2e7d32;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 25px;
                    font-size: 20px;
                    font-weight: bold;
                    display: inline-block;
                    margin: 20px 0;
                }
                .thank-you {
                    background: #e8f5e9;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    margin: 20px 0;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 20px; 
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px; 
                    color: #666; 
                }
>>>>>>> Stashed changes
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Restituzione Automezzo</h1>
                    <p>Croce Rossa Italiana - SOR Campania</p>
                </div>
                <div class="content">
                    <h2 style="color: #2e7d32;">Ciao ${volunteerName}! 👋</h2>
                    <p>Confermiamo la restituzione dell'automezzo.</p>
<<<<<<< Updated upstream
                    
                    <div class="return-box">
                        <h3 style="color: #2e7d32;">🚗 Dettagli Veicolo:</h3>
                        <p><strong>Tipo:</strong> ${vehicleData.tipo}</p>
                        <p><strong>Targa:</strong> ${vehicleData.targa}</p>
                        <p><strong>Km Percorsi:</strong> ${kmPercorsi.toLocaleString()} km</p>
                        <p><strong>Data Rientro:</strong> ${new Date(returnData.data_rientro).toLocaleString('it-IT')}</p>
                        ${returnData.note_rientro ? `<p><strong>Note:</strong> ${returnData.note_rientro}</p>` : ''}
                    </div>
                    
                    <p style="color: #2e7d32; font-weight: bold; text-align: center;">
                        Grazie per la cura del veicolo! 🙏
=======
                    
                    <div class="vehicle-icon">🚙✅</div>
                    
                    <div class="return-box">
                        <h3>🚗 Dettagli Veicolo:</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>Tipo</strong>
                                ${vehicleData.tipo}
                            </div>
                            <div class="info-item">
                                <strong>Targa</strong>
                                ${vehicleData.targa}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <span class="km-badge">
                            📏 ${kmPercorsi.toLocaleString()} km percorsi
                        </span>
                    </div>
                    
                    <div class="return-box">
                        <h3>📋 Riepilogo Utilizzo:</h3>
                        <p><strong>Km Partenza:</strong> ${returnData.km_partenza.toLocaleString()} km</p>
                        <p><strong>Km Arrivo:</strong> ${returnData.km_arrivo.toLocaleString()} km</p>
                        <p><strong>Data Rientro:</strong> ${new Date(returnData.data_rientro).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        ${returnData.note_rientro ? `<p><strong>Note:</strong> ${returnData.note_rientro}</p>` : ''}
                    </div>
                    
                    <div class="thank-you">
                        <h3 style="color: #2e7d32; margin-top: 0;">✅ Grazie per la cura del veicolo!</h3>
                        <p style="margin: 0;">L'automezzo è stato riconsegnato ed è nuovamente disponibile.</p>
                    </div>
                    
                    <p style="color: #2e7d32; font-weight: bold; text-align: center; margin-top: 30px; font-size: 18px;">
                        Grazie per il tuo servizio volontario! 🙏
>>>>>>> Stashed changes
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const textContent = `
Restituzione Automezzo Confermata ✅

Ciao ${volunteerName}, confermiamo la restituzione dell'automezzo.

DETTAGLI VEICOLO:
Tipo: ${vehicleData.tipo}
Targa: ${vehicleData.targa}
Km Percorsi: ${kmPercorsi.toLocaleString()} km
Data Rientro: ${new Date(returnData.data_rientro).toLocaleString('it-IT')}
${returnData.note_rientro ? `Note: ${returnData.note_rientro}` : ''}

Grazie per la cura del veicolo! 🙏
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

/**
 * Email assegnazione MULTIPLA materiali (lista)
 */
async function sendBulkAssignmentNotification(volunteerEmail, volunteerName, materials, evento, dataUscita, note, dataRientroPrevista = null) {
    const subject = '📦 Assegnazione Materiali - CRI SOR Campania';
    
    const totalQuantity = materials.reduce((sum, m) => sum + m.quantita, 0);
    
    const materialsListHTML = materials.map(m => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>${m.nome}</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #d32f2f; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;">
                    ${m.quantita}
                </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-family: monospace; color: #d32f2f;">
                ${m.codice_barre}
            </td>
        </tr>
    `).join('');

    const materialsListText = materials.map(m => 
        `- ${m.quantita}x ${m.nome} (Codice: ${m.codice_barre})`
    ).join('\n');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                .header { background: #d32f2f; color: white; padding: 30px 20px; text-align: center; }
                .content { background: white; padding: 30px; }
                .assignment-box { background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f; }
                .materials-table { width: 100%; margin: 15px 0; border-collapse: collapse; }
                .materials-table th { background: #d32f2f; color: white; padding: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2 style="color: #d32f2f;">Ciao ${volunteerName}! 👋</h2>
                    <p>Ti sono stati assegnati <strong>${materials.length} materiali</strong> (${totalQuantity} unità totali) per <strong>"${evento}"</strong>.</p>
                    
                    <div class="assignment-box">
                        <h3 style="color: #d32f2f;">📦 Materiali Assegnati:</h3>
                        <table class="materials-table">
                            <thead>
                                <tr>
                                    <th>Materiale</th>
                                    <th>Quantità</th>
                                    <th>Codice</th>
                                </tr>
                            </thead>
                            <tbody>${materialsListHTML}</tbody>
                        </table>
                        <p><strong>Data Uscita:</strong> ${new Date(dataUscita).toLocaleString('it-IT')}</p>
                        ${dataRientroPrevista ? `<p><strong>Rientro Previsto:</strong> ${new Date(dataRientroPrevista).toLocaleString('it-IT')}</p>` : ''}
                        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <p style="color: #d32f2f; font-weight: bold; text-align: center;">
                        Grazie per il tuo servizio! 🙏
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textContent = `
Croce Rossa Italiana - SOR Campania

ASSEGNAZIONE MATERIALI

Ciao ${volunteerName}!

Ti sono stati assegnati ${materials.length} materiali (${totalQuantity} unità totali) per "${evento}".

MATERIALI:
${materialsListText}

Data Uscita: ${new Date(dataUscita).toLocaleString('it-IT')}
${dataRientroPrevista ? `Rientro Previsto: ${new Date(dataRientroPrevista).toLocaleString('it-IT')}` : ''}
${note ? `Note: ${note}` : ''}

Grazie per il tuo servizio! 🙏
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

module.exports = {
    sendEmail,
    sendNewUserCredentials,
    sendAssignmentNotification,
    sendReturnNotification,
    sendVehicleAssignmentNotification,
    sendVehicleReturnNotification,
    sendBulkAssignmentNotification
};
