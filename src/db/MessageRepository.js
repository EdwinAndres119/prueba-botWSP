import fs from "node:fs";
import path from "node:path";

import getRuntimeDir from "../runtimeDir.js";

const logsDirectory = path.join(getRuntimeDir(), "logs");
fs.mkdirSync(logsDirectory, { recursive: true });

class MessageRepository {
	constructor(db) {
		this.db = db;
		this.knownIds = null;
		this.skipped = 0;
	}

	/**
	 * Carga en memoria los ids ya guardados, para poder re-correr la extraccion
	 * sin duplicar filas. Ademas cubre los duplicados *dentro* de una misma
	 * corrida: el on-demand history sync entrega bloques que se solapan.
	 *
	 * Una sola query al arrancar; las inserciones ya son secuenciales (PQueue
	 * con concurrencia 1 en MessagePipeline), asi que el Set es autoritativo.
	 */
	async loadKnownIds() {
		if (this.knownIds) return this.knownIds;

		this.knownIds = new Set();

		try {
			const result = await this.db.run("SELECT id FROM whatsapp.mensajes");
			const rows = await result.getRowObjects();
			for (const row of rows) {
				if (row.id) this.knownIds.add(String(row.id));
			}
		} catch (err) {
			// Primera corrida: la tabla puede no tener datos todavia.
			console.warn("No se pudieron precargar los ids existentes:", err.message);
		}

		if (this.knownIds.size) {
			console.log(`${this.knownIds.size} mensajes ya guardados previamente.`);
		}

		return this.knownIds;
	}

	async save(row) {
		const known = await this.loadKnownIds();

		if (known.has(row.id)) {
			this.skipped++;
			return false;
		}
		known.add(row.id);

		await this.db.run(
			`
                INSERT INTO whatsapp.mensajes (
                    id,
                    chat_id,
                    chat_name,
                    is_group,
                    remitente_numero,
                    remitente_nombre,
                    esta_registrado,
                    body,
                    message_type,
                    from_me,
                    has_media,
                    media_mimetype,
                    media_filename,
                    media_path,
                    timestamp
                )
                VALUES (
                    $id,
                    $chat_id,
                    $chat_name,
                    $is_group,
                    $remitente_numero,
                    $remitente_nombre,
                    $esta_registrado,
                    $body,
                    $message_type,
                    $from_me,
                    $has_media,
                    $media_mimetype,
                    $media_filename,
                    $media_path,
                    $timestamp
                )
                `,
			{
				id: row.id,
				chat_id: row.chat_id,
				chat_name: row.chat_name,
				is_group: row.is_group,
				remitente_numero: row.remitente_numero,
				remitente_nombre: row.remitente_nombre,
				esta_registrado: row.esta_registrado,
				body: row.body,
				message_type: row.message_type,
				from_me: row.from_me,
				has_media: row.has_media,
				media_mimetype: row.media_mimetype,
				media_filename: row.media_filename,
				media_path: row.media_path,
				timestamp: row.timestamp,
			},
		);

		return true;
	}
}

export default MessageRepository;
