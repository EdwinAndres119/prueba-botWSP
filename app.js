import config from "./src/config.js";
import DuckLakeClient from "./src/db/DuckLakeClient.js";
import MessageRepository from "./src/db/MessageRepository.js";
import ContactResolver from "./src/wa/ContactResolver.js";
import createWhatsAppClient from "./src/wa/client.js";
import { handleCommand } from "./src/wa/commands.js";
import HistoryExtractor from "./src/wa/HistoryExtractor.js";
import MediaStorage from "./src/wa/MediaStorage.js";
import MessagePipeline from "./src/wa/MessagePipeline.js";
import WhatsAppApp from "./src/wa/WhatsAppApp.js";

const READY_DELAY_MS = 5000;
const INIT_MAX_ATTEMPTS = 3;
const INIT_RETRY_DELAY_MS = 3000;

const client = createWhatsAppClient();
const ducklakeConection = new DuckLakeClient();

const messageRepository = new MessageRepository(ducklakeConection);
const contactResolver = new ContactResolver(client);
const mediaStorage = new MediaStorage(config.MEDIA_DIR);

const messagePipeline = new MessagePipeline({
	contactResolver,
	mediaStorage,
	messageRepository,
	commandHandler: handleCommand,
});

const historyExtractor = new HistoryExtractor(client, config.HISTORY_LIMIT);

const whatsappApp = new WhatsAppApp({
	client,
	ducklake: ducklakeConection,
	messagePipeline,
	historyExtractor,
	readyDelay: READY_DELAY_MS,
	initMaxAttempts: INIT_MAX_ATTEMPTS,
	initRetryDelay: INIT_RETRY_DELAY_MS,
});

whatsappApp.start();
