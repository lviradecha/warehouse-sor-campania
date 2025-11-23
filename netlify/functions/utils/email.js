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
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .credentials { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                .button { display: inline-block; background: #d32f2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2>Benvenuto ${nome} ${cognome}!</h2>
                    <p>È stato creato un account per te nel Sistema di Gestione Magazzino della CRI SOR Campania.</p>
                    
                    <div class="credentials">
                        <h3>📋 Le tue credenziali di accesso:</h3>
                        <p><strong>Username:</strong> <code>${username}</code></p>
                        <p><strong>Password temporanea:</strong> <code>${tempPassword}</code></p>
                        <p><strong>URL Sistema:</strong> <a href="${process.env.URL || 'https://warehouse-sor-campania.netlify.app'}">${process.env.URL || 'https://warehouse-sor-campania.netlify.app'}</a></p>
                    </div>
                    
                    <p><strong>⚠️ IMPORTANTE:</strong></p>
                    <ul>
                        <li>Al primo accesso ti verrà richiesto di cambiare la password</li>
                        <li>Conserva questa email in modo sicuro</li>
                        <li>Non condividere le tue credenziali con altri</li>
                    </ul>
                    
                    <p>Se hai domande o problemi di accesso, contatta l'amministratore del sistema.</p>
                    
                    <a href="${process.env.URL || 'https://warehouse-sor-campania.netlify.app'}" class="button">Accedi al Sistema</a>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Croce Rossa Italiana - SOR Campania</p>
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
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .assignment-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f; }
                .barcode { text-align: center; font-size: 24px; font-weight: bold; color: #d32f2f; margin: 10px 0; letter-spacing: 2px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2>Ciao ${volunteerName}! 👋</h2>
                    <p>Ti è stato assegnato del materiale per l'evento <strong>"${evento}"</strong>.</p>
                    
                    <div class="assignment-box">
                        <h3>📦 Dettagli Materiale:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <div class="barcode">${codice}</div>
                        <p style="text-align: center; color: #666; font-size: 12px;">Codice a Barre</p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Uscita:</strong> ${new Date(dataUscita).toLocaleString('it-IT')}</p>
                        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ RESPONSABILITÀ:</strong></p>
                        <ul>
                            <li>Sei responsabile del materiale assegnato</li>
                            <li>Controlla lo stato del materiale prima dell'uso</li>
                            <li>Segnala immediatamente eventuali danni</li>
                            <li>Riconsegna il materiale al termine dell'evento</li>
                        </ul>
                    </div>
                    
                    <p>Per qualsiasi problema o domanda, contatta la Sala Operativa Regionale.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Croce Rossa Italiana - SOR Campania</p>
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
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .return-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid ${statoColor}; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 Croce Rossa Italiana</h1>
                    <p>Sala Operativa Regionale - Campania</p>
                </div>
                <div class="content">
                    <h2>Rientro Materiale ${statoIcon}</h2>
                    <p>Ciao ${volunteerName}, confermiamo il rientro del materiale.</p>
                    
                    <div class="return-box">
                        <h3>📦 Dettagli Rientro:</h3>
                        <p><strong>Materiale:</strong> ${materialName}</p>
                        <p><strong>Codice:</strong> <code>${codice}</code></p>
                        <p><strong>Evento:</strong> ${evento}</p>
                        <p><strong>Data Rientro:</strong> ${new Date(dataRientro).toLocaleString('it-IT')}</p>
                        <p><strong>Stato:</strong> <span style="color: ${statoColor}; font-weight: bold;">${statoText}</span></p>
                    </div>
                    
                    ${stato === 'danneggiato' ? `
                        <p><strong>⚠️ Il materiale è stato segnalato come danneggiato.</strong><br>
                        Verrà avviata una procedura di manutenzione/riparazione.</p>
                    ` : `
                        <p><strong>✅ Grazie per la cura del materiale!</strong></p>
                    `}
                    
                    <p>Grazie per il tuo servizio volontario! 🙏</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Croce Rossa Italiana - SOR Campania</p>
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
