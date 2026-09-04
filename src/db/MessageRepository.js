class MessageRepository {
    constructor(db) {
        this.db = db;
    }

    async save(row) {
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
            }
        );
    }
}

module.exports = MessageRepository;