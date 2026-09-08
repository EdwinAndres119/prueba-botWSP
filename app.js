import qrcode from "qrcode-terminal";

import config from "./src/config.js";
import DuckLake from "./src/db/DuckLake.js";
import MessageRepository from "./src/db/MessageRepository.js";
import ContactResolver from "./src/wa/ContactResolver.js";
import createWhatsAppClient from "./src/wa/client.js";
import { handleCommand } from "./src/wa/commands.js";
import HistoryExtractor from "./src/wa/HistoryExtractor.js";
import MediaStorage from "./src/wa/MediaStorage.js";
import MessagePipeline from "./src/wa/MessagePipeline.js";

const READY_DELAY_MS = 5000;
const INIT_MAX_ATTEMPTS = 3;
const INIT_RETRY_DELAY_MS = 3000;

const client = createWhatsAppClient();
const ducklakeConection = new DuckLake();

const messageRepository = new MessageRepository(ducklakeConection);
const contactResolver = new ContactResolver(client);
const mediaStorage = new MediaStorage(config.MEDIA_DIR);
const messagePipeline = new MessagePipeline({
	contactResolver,
	mediaStorage,
	messageRepository,
});
const historyExtractor = new HistoryExtractor(client, config.HISTORY_LIMIT);

client.on("qr", (qr) => {
	console.log("Escanea el codigo QR con tu WhatsApp:");
	qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
	console.log("Autenticacion exitosa");
});

client.on("auth_failure", (msg) => {
	console.error("Error de autenticacion:", msg);
});

client.on("disconnected", (reason) => {
	console.log("Cliente desconectado:", reason);
});

let readyFired = false;
let historyStarted = false;

client.on("ready", async () => {
	readyFired = true;
	if (historyStarted) return;
	historyStarted = true;

	console.log("Cliente de WhatsApp conectado");

	// Da tiempo a que WhatsApp Web termine de inicializar sus modulos
	// internos antes de leer el historial de chats.
	await new Promise((resolve) => setTimeout(resolve, READY_DELAY_MS));

	await historyExtractor.run((msg, chatInfo) =>
		messagePipeline.process(msg, chatInfo),
	);
	console.log("Consolidando cambios en DuckLake...");
	await ducklakeConection.checkpoint();
	console.log("Checkpoint de DuckLake completado.");
});

client.on("message", async (msg) => {
	console.log(`Mensaje de ${msg.from}: ${msg.body}`);

	await messagePipeline.process(msg);
	await handleCommand(msg);
});

async function initializeWithRetry() {
	for (let attempt = 1; attempt <= INIT_MAX_ATTEMPTS; attempt++) {
		try {
			await client.initialize();
			return;
		} catch (err) {
			if (readyFired) {
				console.log(
					"El cliente ya habia quedado listo antes de este error; no se reintenta.",
				);
				return;
			}
			const isContextRace = err.message?.includes(
				"Execution context was destroyed",
			);
			if (!isContextRace || attempt === INIT_MAX_ATTEMPTS) throw err;
			console.log(
				`Fallo al inicializar (intento ${attempt}/${INIT_MAX_ATTEMPTS}), reintentando...`,
			);
			try {
				await client.destroy();
			} catch (destroyErr) {
				console.error(
					"No se pudo cerrar el navegador tras el fallo:",
					destroyErr.message,
				);
			}
			await new Promise((resolve) => setTimeout(resolve, INIT_RETRY_DELAY_MS));
		}
	}
}

console.log("Iniciando cliente de WhatsApp...");
initializeWithRetry().catch((err) => {
	console.error("No se pudo inicializar el cliente de WhatsApp:", err.message);
	process.exit(1);
});
