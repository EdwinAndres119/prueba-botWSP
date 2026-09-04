const qrcode = require('qrcode-terminal');

const config = require('./src/config');
const DuckLake = require('./src/db/DuckLake');
const MessageRepository = require('./src/db/MessageRepository');
const ContactResolver = require('./src/wa/ContactResolver');
const MediaStorage = require('./src/wa/MediaStorage');
const MessagePipeline = require('./src/wa/MessagePipeline');
const HistoryExtractor = require('./src/wa/HistoryExtractor');
const createWhatsAppClient = require('./src/wa/client');
const { handleCommand } = require('./src/wa/commands');

const READY_DELAY_MS = 5000;

const client = createWhatsAppClient();
const ducklakeConection = new DuckLake();

const messageRepository = new MessageRepository(ducklakeConection);
const contactResolver = new ContactResolver(client);
const mediaStorage = new MediaStorage(config.MEDIA_DIR);
const messagePipeline = new MessagePipeline({ contactResolver, mediaStorage, messageRepository });
const historyExtractor = new HistoryExtractor(client, config.HISTORY_LIMIT);



client.on('qr', (qr) => {
    console.log('Escanea el codigo QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('Autenticacion exitosa');
});

client.on('auth_failure', (msg) => {
    console.error('Error de autenticacion:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

client.on('ready', async () => {
    console.log('Cliente de WhatsApp conectado');

    // Da tiempo a que WhatsApp Web termine de inicializar sus modulos
    // internos antes de leer el historial de chats.
    await new Promise((resolve) => setTimeout(resolve, READY_DELAY_MS));

    await historyExtractor.run((msg, chatInfo) => messagePipeline.process(msg, chatInfo));
    await ducklakeConection.checkpoint();
});

client.on('message', async (msg) => {
    console.log(`Mensaje de ${msg.from}: ${msg.body}`);

    await messagePipeline.process(msg);
    await handleCommand(msg);
});

console.log('Iniciando cliente de WhatsApp...');
client.initialize();
