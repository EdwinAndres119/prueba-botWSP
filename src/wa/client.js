const { Client, LocalAuth } = require('whatsapp-web.js');

// Real desktop Chrome user-agent so WhatsApp does not see an inconsistent
// browser fingerprint (Puppeteer's default is a common automation signal).
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function createWhatsAppClient() {
    return new Client({
        authStrategy: new LocalAuth(),
        userAgent: USER_AGENT,
        puppeteer: {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });
}

module.exports = createWhatsAppClient;
