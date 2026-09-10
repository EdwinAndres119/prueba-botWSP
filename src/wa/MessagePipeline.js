import PQueue from "p-queue";

import { buildMessageId, cleanNumber } from "./identifiers.js";

// "Estados" (WhatsApp Status/Stories) arrive as regular messages from
// status@broadcast. No son un chat real, asi que no se guardan.
const STATUS_BROADCAST_ID = "status@broadcast";

class MessagePipeline {
	constructor({
		contactResolver,
		mediaStorage,
		messageRepository,
		commandHandler,
	}) {
		this.contactResolver = contactResolver;
		this.mediaStorage = mediaStorage;
		this.messageRepository = messageRepository;
		this.commandHandler = commandHandler;

		this.queue = new PQueue({
			concurrency: 1,
		});
	}

	add(msg, chatInfo) {
		return this.queue.add(() => this.process(msg, chatInfo));
	}

	addMessage(msg) {
		return this.queue.add(async () => {
			await this.process(msg);
			await this.commandHandler(msg);
		});
	}

	onIdle() {
		return this.queue.onIdle();
	}

	async process(msg, chatInfo) {
		if (!msg.id?.id) {
			return; // internal WhatsApp notification without a real message id
		}

		if (msg.from === STATUS_BROADCAST_ID) {
			return; // Estado/Historia, no un chat real
		}

		const messageId = buildMessageId(msg.id);

		// downloadMedia() and other library internals rely on this.id._serialized.
		if (!msg.id._serialized) {
			msg.id._serialized = messageId;
		}

		const chat = await this._resolveChat(msg, chatInfo);
		const sender = await this.contactResolver.resolve(msg);
		const media = await this.mediaStorage.save(msg, messageId);

		await this.messageRepository.save({
			id: messageId,
			chat_id: cleanNumber(msg.from),
			chat_name: chat.name || null,
			is_group: chat.isGroup || false,
			remitente_numero: sender.number,
			remitente_nombre: sender.name,
			esta_registrado: sender.isRegistered,
			body: msg.body,
			message_type: msg.type,
			from_me: msg.fromMe,
			has_media: media.hasMedia,
			media_mimetype: media.mimetype,
			media_filename: media.filename,
			media_path: media.mediaPath,
			timestamp: new Date(msg.timestamp * 1000).toISOString(),
		});
	}

	async _resolveChat(msg, chatInfo) {
		if (chatInfo) return chatInfo;

		try {
			return await msg.getChat();
		} catch (_err) {
			return {};
		}
	}
}

export default MessagePipeline;
