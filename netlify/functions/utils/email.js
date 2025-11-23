// ===================================
// EMAIL UTILITY - SendGrid
// Gestione invio email notifiche
// ===================================

const sgMail = require('@sendgrid/mail');

// Inizializza SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sor-campania.it';
const FROM_NAME = process.env.FROM_NAME || 'CRI SOR Campania - Sistema Magazzino';

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Invia email generica
 */
async function sendEmail(to, subject, htmlContent, textContent) {
    if (!SENDGRID_API_KEY) {
        console.warn('SendGrid non configurato, email non inviata:', to);
        return { success: false, message: 'SendGrid non configurato' };
    }

    try {
        const msg = {
            to,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME
            },
            subject,
            text: textContent,
            html: htmlContent
        };

        await sgMail.send(msg);
        console.log('Email inviata a:', to);
        return { success: true };
    } catch (error) {
        console.error('Errore invio email:', error);
        return { success: false, message: error.message };
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
                .button:hover { background: #b71c1c; }
                .warning { 
                    background: #fff3cd; 
                    padding: 15px; 
                    border-left: 4px solid #ffc107; 
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .warning strong { color: #856404; }
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
                    <h1>🏥 Croce Rossa Italiana</h1>
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
- Non condividere le credenziali

Croce Rossa Italiana - SOR Campania
    `;
    
    return sendEmail(email, subject, htmlContent, textContent);
}

/**
 * Email notifica assegnazione materiale a volontario
 */
async function sendAssignmentNotification(volunteerEmail, volunteerName, materialName, codice, evento, dataUscita, note) {
    const subject = '📦 Assegnazione Materiale - CRI SOR Campania';
    
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
                .assignment-box { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-left: 4px solid #d32f2f;
                    border-radius: 4px;
                }
                .assignment-box h3 { margin-top: 0; color: #d32f2f; }
                .barcode { 
                    text-align: center; 
                    font-size: 28px; 
                    font-weight: bold; 
                    color: #d32f2f; 
                    margin: 15px 0; 
                    letter-spacing: 3px;
                    background: white;
                    padding: 15px;
                    border: 2px dashed #d32f2f;
                    border-radius: 5px;
                }
                .warning { 
                    background: #fff3cd; 
                    padding: 15px; 
                    border-left: 4px solid #ffc107; 
                    margin: 15px 0;
                    border-radius: 4px;
                }
                .warning strong { color: #856404; }
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
                    <h1>🏥 Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                    <p style="font-size: 16px; margin-top: 10px;">Sistema Gestione Magazzino</p>
                </div>
                <div class="content">
                    <h2 style="color: #d32f2f;">Ciao ${volunteerName}! 👋</h2>
                    <p>Ti è stato assegnato del materiale per l'evento <strong style="color: #d32f2f;">"${evento}"</strong>.</p>
                    
                    <div class="assignment-box">
                        <h3>📦 Dettagli Materiale:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <div class="barcode">${codice}</div>
                        <p style="text-align: center; color: #666; font-size: 12px; margin-top: -5px;">Codice a Barre</p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Uscita:</strong> ${new Date(dataUscita).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ RESPONSABILITÀ:</strong></p>
                        <ul style="margin: 10px 0;">
                            <li>Sei responsabile del materiale assegnato</li>
                            <li>Controlla lo stato del materiale prima dell'uso</li>
                            <li>Segnala immediatamente eventuali danni</li>
                            <li>Riconsegna il materiale al termine dell'evento</li>
                        </ul>
                    </div>
                    
                    <p>Per qualsiasi problema o domanda, contatta la Sala Operativa Regionale.</p>
                    
                    <p style="color: #d32f2f; font-weight: bold; text-align: center; margin-top: 20px;">
                        Grazie per il tuo servizio volontario! 🙏
                    </p>
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
Ciao ${volunteerName}!

Ti è stato assegnato del materiale per l'evento "${evento}".

DETTAGLI MATERIALE:
Materiale: ${materialName}
Codice: ${codice}
Evento: ${evento}
Data Uscita: ${new Date(dataUscita).toLocaleString('it-IT')}
${note ? `Note: ${note}` : ''}

RESPONSABILITÀ:
- Sei responsabile del materiale assegnato
- Controlla lo stato prima dell'uso
- Segnala immediatamente eventuali danni
- Riconsegna al termine dell'evento

Grazie per il tuo servizio volontario!

Croce Rossa Italiana - SOR Campania
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

/**
 * Email notifica rientro materiale
 */
async function sendReturnNotification(volunteerEmail, volunteerName, materialName, codice, evento, dataRientro, stato) {
    const subject = '✅ Conferma Rientro Materiale - CRI SOR Campania';
    
    const statoIcon = stato === 'rientrato' ? '✅' : '⚠️';
    const statoText = stato === 'rientrato' ? 'in buone condizioni' : 'DANNEGGIATO';
    const statoColor = stato === 'rientrato' ? '#28a745' : '#ffc107';
    
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
                .return-box { 
                    background: #f9f9f9; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-left: 4px solid ${statoColor};
                    border-radius: 4px;
                }
                .return-box h3 { margin-top: 0; color: ${statoColor}; }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background: ${statoColor};
                    color: white;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 16px;
                }
                .thank-you {
                    background: #e8f5e9;
                    padding: 20px;
                    border-radius: 5px;
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
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-circle">
                        <img src="https://warehouse-sor-campania.netlify.app/assets/logo-sor.png" alt="SOR Logo" onerror="this.style.display='none'">
                    </div>
                    <h1>🏥 Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                    <p style="font-size: 16px; margin-top: 10px;">Sistema Gestione Magazzino</p>
                </div>
                <div class="content">
                    <h2 style="color: #d32f2f;">Rientro Materiale ${statoIcon}</h2>
                    <p>Ciao <strong>${volunteerName}</strong>, confermiamo il rientro del materiale.</p>
                    
                    <div class="return-box">
                        <h3>📦 Dettagli Rientro:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <p><strong>Codice:</strong> <code style="background: white; padding: 5px 10px; border-radius: 3px;">${codice}</code></p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Rientro:</strong> ${new Date(dataRientro).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        <p><strong>Stato:</strong> <span class="status-badge">${statoIcon} ${statoText}</span></p>
                    </div>
                    
                    ${stato === 'danneggiato' ? `
                        <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px;">
                            <p><strong>⚠️ Il materiale è stato segnalato come danneggiato.</strong><br>
                            Verrà avviata una procedura di manutenzione/riparazione.</p>
                        </div>
                    ` : `
                        <div class="thank-you">
                            <h3 style="color: #2e7d32; margin-top: 0;">✅ Grazie per la cura del materiale!</h3>
                            <p style="margin: 0;">Il materiale è rientrato in perfette condizioni.</p>
                        </div>
                    `}
                    
                    <p style="color: #d32f2f; font-weight: bold; text-align: center; margin-top: 30px; font-size: 18px;">
                        Grazie per il tuo servizio volontario! 🙏
                    </p>
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
Rientro Materiale ${statoIcon}

Ciao ${volunteerName}, confermiamo il rientro del materiale.

DETTAGLI RIENTRO:
Materiale: ${materialName}
Codice: ${codice}
Evento: ${evento}
Data Rientro: ${new Date(dataRientro).toLocaleString('it-IT')}
Stato: ${statoText}

${stato === 'danneggiato' ? 'Il materiale è stato segnalato come danneggiato. Verrà avviata una procedura di manutenzione.' : 'Grazie per la cura del materiale!'}

Grazie per il tuo servizio volontario!

Croce Rossa Italiana - SOR Campania
    `;
    
    return sendEmail(volunteerEmail, subject, htmlContent, textContent);
}

module.exports = {
    sendEmail,
    sendNewUserCredentials,
    sendAssignmentNotification,
    sendReturnNotification
};
