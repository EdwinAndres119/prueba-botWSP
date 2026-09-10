import fs from "node:fs";
import path from "node:path";

import whatsappWeb from "whatsapp-web.js";

const { Client, LocalAuth } = whatsappWeb;

// User-agent de un Chrome de escritorio real, para que WhatsApp no vea una
// huella de navegador inconsistente (la de Puppeteer por defecto es una senal
// comun de automatizacion).
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function resolveChromePath() {
	// process.sea existe cuando el proceso es un Node SEA (.exe)
	if (!process.sea) return undefined;

	const bundledPath = path.join(
		path.dirname(process.execPath),
		"chrome-win64",
		"chrome.exe",
	);
	return fs.existsSync(bundledPath) ? bundledPath : undefined;
}

function createWhatsAppClient() {
	return new Client({
		authStrategy: new LocalAuth(),
		userAgent: USER_AGENT,
		puppeteer: {
			headless: true,
			executablePath: resolveChromePath(),
			args: ["--no-sandbox", "--disable-setuid-sandbox"],
		},
	});
}

export default createWhatsAppClient;
