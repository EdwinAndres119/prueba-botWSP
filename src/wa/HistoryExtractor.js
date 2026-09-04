const { Message } = require('whatsapp-web.js');

const CHAT_TIMEOUT_MS = 15000;
const MIN_DELAY_MS = 1500;
const DELAY_JITTER_MS = 1500;
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
    async fetchMessages(chatId) {
        const limit = this.historyLimit;
        const rawMessages = await this.client.pupPage.evaluate(async (chatId, limit) => {
            const isRealMessage = (m) => !m.isNotification;

            const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
            let msgs = chat.msgs.getModelsArray().filter(isRealMessage);

            if (limit > 0) {
                while (msgs.length < limit) {
                    const loaded = await window
                        .require('WAWebChatLoadMessages')
                        .loadEarlierMsgs({ chat });
                    if (!loaded || !loaded.length) break;
                    msgs = [...loaded.filter(isRealMessage), ...msgs];
                }
                if (msgs.length > limit) {
                    msgs.sort((a, b) => (a.t > b.t ? 1 : -1));
                    msgs = msgs.splice(msgs.length - limit);
                }
            }

            return msgs.map((m) => window.WWebJS.getMessageModel(m));
        }, chatId, limit);

        return rawMessages.map((m) => new Message(this.client, m));
    }

    async run(onMessage) {
        const chats = await this.listChats();
        console.log(`${chats.length} chats encontrados.`);

        let processed = 0;
        let failed = 0;
        let saved = 0;

        for (const chat of chats) {
            try {
                const chatInfo = { name: chat.name, isGroup: chat.id.endsWith('@g.us') };
                const messages = await withTimeout(this.fetchMessages(chat.id), CHAT_TIMEOUT_MS);

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
