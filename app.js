const { Client, LocalAuth, Message } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

// Leer el archivo HTML de versión de WhatsApp Web localmente
const waVersionPath = path.join(__dirname, '2.3000.1031490220-alpha.html');

// Configuración para extracción histórica
const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '50', 10);

// Crear cliente (usa la versión más reciente de WhatsApp Web por defecto)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// Evento: Mostrar código QR en la terminal
client.on('qr', (qr) => {
    console.log('Escanea el código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Función para guardar un mensaje en Supabase (compartida entre histórico y en vivo)
async function guardarMensaje(msg, chat) {
    if (!msg.id || !msg.id.id) {
        return; // Notificación interna de WhatsApp sin id de mensaje real; se omite
    }

    // En esta versión de whatsapp-web.js, msg.id._serialized no siempre está
    // disponible; se arma el mismo formato a mano a partir de sus partes.
    const idSerializado = msg.id._serialized ||
        `${msg.id.fromMe}_${msg.id.remote}_${msg.id.id}${msg.id.participant ? '_' + msg.id.participant : ''}`;

    let chatInfo = chat;
    if (!chatInfo) {
        try {
            chatInfo = await msg.getChat();
        } catch (err) {
            // Bug conocido de whatsapp-web.js: getChat() puede fallar con la versión
            // actual de WhatsApp Web. Se guarda el mensaje igual, sin nombre de chat.
            chatInfo = {};
        }
    }

    const fila = {
        id: idSerializado,
        chat_id: msg.from,
        chat_name: chatInfo.name || null,
        is_group: chatInfo.isGroup || false,
        from_number: msg.from,
        author: msg.author || null,
        body: msg.body,
        message_type: msg.type,
        from_me: msg.fromMe,
        timestamp: new Date(msg.timestamp * 1000).toISOString(),
    };

    const { error } = await supabase.from('mensajes').upsert(fila, { onConflict: 'id' });

    if (error) {
        console.error('❌ Error al guardar mensaje en Supabase:', error.message);
    }
}

// Corta una promesa si tarda más de "ms" (para que un chat colgado no trabe todo el resto)
function conTimeout(promesa, ms) {
    return Promise.race([
        promesa,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

// Trae los mensajes de un chat sin pasar por getChatById()/getChatModel()
// (que es lo que truena). Replica la lógica interna de Chat.fetchMessages()
// pero usando el chat "crudo" (getAsModel: false), que sí funciona bien.
async function obtenerMensajesDeChat(chatId, limit) {
    const mensajesCrudos = await client.pupPage.evaluate(async (chatId, limit) => {
        const msgFilter = (m) => !m.isNotification;

        const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
        let msgs = chat.msgs.getModelsArray().filter(msgFilter);

        if (limit > 0) {
            while (msgs.length < limit) {
                const loadedMessages = await window
                    .require('WAWebChatLoadMessages')
                    .loadEarlierMsgs({ chat });
                if (!loadedMessages || !loadedMessages.length) break;
                msgs = [...loadedMessages.filter(msgFilter), ...msgs];
            }
            if (msgs.length > limit) {
                msgs.sort((a, b) => (a.t > b.t ? 1 : -1));
                msgs = msgs.splice(msgs.length - limit);
            }
        }

        return msgs.map((m) => window.WWebJS.getMessageModel(m));
    }, chatId, limit);

    return mensajesCrudos.map((m) => new Message(client, m));
}

// Función para extraer mensajes históricos de todos los chats
async function extraerHistorico() {
    console.log(`📥 Iniciando extracción histórica (últimos ${HISTORY_LIMIT} mensajes por chat)...`);

    // Enumerar los chats de forma liviana (sin armar el modelo completo, que es
    // lo que truena con ciertos grupos por el sistema de IDs "@lid" de WhatsApp)
    let chatIds;
    try {
        chatIds = await client.pupPage.evaluate(() => {
            const chats = window.require('WAWebCollections').Chat.getModelsArray();
            return chats.map((c) => ({
                id: c.id._serialized,
                name: c.formattedTitle || c.name || null,
            }));
        });
    } catch (err) {
        console.error('⚠️ No se pudo enumerar los chats:', err.message);
        return;
    }

    console.log(`📋 ${chatIds.length} chats encontrados. Extrayendo mensajes de cada uno...`);

    let totalGuardados = 0;
    let chatsConError = 0;
    let chatsProcesados = 0;

    for (const chatBasico of chatIds) {
        try {
            const chatInfo = { name: chatBasico.name, isGroup: chatBasico.id.endsWith('@g.us') };
            const mensajes = await conTimeout(
                obtenerMensajesDeChat(chatBasico.id, HISTORY_LIMIT),
                15000,
            );
            for (const msg of mensajes) {
                await guardarMensaje(msg, chatInfo);
                totalGuardados++;
            }
        } catch (err) {
            chatsConError++;
            console.error(`❌ Error al extraer mensajes de "${chatBasico.name || chatBasico.id}":`, err.message);
        }

        chatsProcesados++;
        if (chatsProcesados % 10 === 0) {
            console.log(`   ...progreso: ${chatsProcesados}/${chatIds.length} chats revisados, ${totalGuardados} mensajes guardados hasta ahora.`);
        }
    }

    console.log(`✅ Extracción histórica completa: ${totalGuardados} mensajes procesados (${chatsConError} chats con error, omitidos).`);
}

// Evento: Cliente listo
client.on('ready', async () => {
    console.log('✅ Cliente de WhatsApp conectado!');

    // Esperar unos segundos para que WhatsApp Web termine de inicializar
    // sus módulos internos antes de llamar a getChats() (evita crash de timing)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await extraerHistorico();
});

// Evento: Autenticación exitosa
client.on('authenticated', () => {
    console.log('🔐 Autenticación exitosa');
});

// Evento: Fallo de autenticación
client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
});

// Evento: Desconexión
client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
});

// Evento: Mensaje recibido
client.on('message', async (msg) => {
    console.log(`📩 Mensaje de ${msg.from}: ${msg.body}`);

    // Guardar el mensaje en Supabase
    await guardarMensaje(msg);

    // Responder a comandos básicos
    if (msg.body === '!ping') {
        await msg.reply('pong 🏓');
    }

    if (msg.body === '!hola') {
        await msg.reply('¡Hola! 👋 Soy un bot de WhatsApp');
    }

    if (msg.body === '!info') {
        const chat = await msg.getChat();
        await msg.reply(`📊 Info del chat:\n- Nombre: ${chat.name}\n- Es grupo: ${chat.isGroup}`);
    }
});

// Inicializar el cliente
console.log('🚀 Iniciando cliente de WhatsApp...');
client.initialize();