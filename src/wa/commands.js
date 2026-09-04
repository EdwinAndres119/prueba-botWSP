async function handleCommand(msg) {
    switch (msg.body) {
        case '!ping':
            await msg.reply('pong');
            return true;

        case '!hola':
            await msg.reply('Hola, soy un bot de WhatsApp');
            return true;

        case '!info': {
            const chat = await msg.getChat();
            await msg.reply(`Chat: ${chat.name}\nEs grupo: ${chat.isGroup}`);
            return true;
        }

        default:
            return false;
    }
}

module.exports = { handleCommand };
