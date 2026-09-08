import fs from 'node:fs';
import path from 'node:path';

import { Client, LocalAuth } from 'whatsapp-web.js';

// Real desktop Chrome user-agent so WhatsApp does not see an inconsistent
// browser fingerprint (Puppeteer's default is a common automation signal).
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function resolveChromePath() {
    if (!process.pkg) return undefined;

    const bundledPath = path.join(path.dirname(process.execPath), 'chrome-win64', 'chrome.exe');
    return fs.existsSync(bundledPath) ? bundledPath : undefined;
}

function createWhatsAppClient() {
    return new Client({
        authStrategy: new LocalAuth(),
        userAgent: USER_AGENT,
        puppeteer: {
            headless: true,
            executablePath: resolveChromePath(),
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });
}

module.exports = createWhatsAppClient;
