const { Message } = require('whatsapp-web.js');
const config = require('../config');

const MIN_DELAY_MS = 1500;
const DELAY_JITTER_MS = 1500;
const PAGE_DELAY_MS = 600;
const PROGRESS_INTERVAL = 10;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

function randomDelay() {
    return new Promise((resolve) => {
        setTimeout(resolve, MIN_DELAY_MS + Math.random() * DELAY_JITTER_MS);
    });
}

class HistoryExtractor {
    constructor(client, historyLimit) {
        this.client = client;
        this.historyLimit = historyLimit;
    }

    // Chat.getModelsArray() is used directly instead of client.getChats(),
    // which fails to serialize most chats under the current WhatsApp Web
    // build (see docs/arquitectura.md).
    async listChats() {
        return this.client.pupPage.evaluate(() => {
            const chats = window.require('WAWebCollections').Chat.getModelsArray();
            return chats.map((c) => ({
                id: c.id._serialized,
                name: c.formattedTitle || c.name || null,
            }));
        });
    }

    // Mirrors Chat.fetchMessages() internally, but fetches the chat with
    // getAsModel: false to avoid the same serialization failure as listChats().
    // limit <= 0 means no cap: keep paging into history until WhatsApp
    // reports there are no earlier messages left to load.
    async fetchMessages(chatId) {
        const limit = this.historyLimit;
        const rawMessages = await this.client.pupPage.evaluate(async (chatId, limit, pageDelayMs) => {
            const isRealMessage = (m) => !m.isNotification;
            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
            let msgs = chat.msgs.getModelsArray().filter(isRealMessage);

            while (limit <= 0 || msgs.length < limit) {
                const loaded = await window
                    .require('WAWebChatLoadMessages')
                    .loadEarlierMsgs({ chat });
                if (!loaded?.length) break;
                msgs = [...loaded.filter(isRealMessage), ...msgs];
                await sleep(pageDelayMs);
            }

            if (limit > 0 && msgs.length > limit) {
                msgs.sort((a, b) => (a.t > b.t ? 1 : -1));
                msgs = msgs.splice(msgs.length - limit);
            }

            return msgs.map((m) => window.WWebJS.getMessageModel(m));
        }, chatId, limit, PAGE_DELAY_MS);

        return rawMessages.map((m) => new Message(this.client, m));
    }

    async run(onMessage) {
        const chats = await this.listChats();
        console.log(`${chats.length} chats encontrados.`);

        let processed = 0;
        let failed = 0;
        let saved = 0;

        for (const chat of chats) {
            if (!this.client.pupPage || this.client.pupPage.isClosed()) {
                console.log('Sesion desconectada, se detiene la extraccion historica.');
                break;
            }

            try {
                const chatInfo = { name: chat.name, isGroup: chat.id.endsWith('@g.us') };
                const messages = await withTimeout(this.fetchMessages(chat.id), config.CHAT_TIMEOUT_MS);

                for (const msg of messages) {
                    await onMessage(msg, chatInfo);
                    saved++;
                }
            } catch (err) {
                failed++;
                console.error(`Error al extraer "${chat.name || chat.id}":`, err.message);
            }

            await randomDelay();

            processed++;
            if (processed % PROGRESS_INTERVAL === 0) {
                console.log(`Progreso: ${processed}/${chats.length} chats, ${saved} mensajes guardados.`);
            }
        }

        console.log(`Extraccion historica completa: ${saved} mensajes (${failed} chats con error).`);
    }
}

module.exports = HistoryExtractor;
