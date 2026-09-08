import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import pino from 'pino';

const logsDirectory = path.join(__dirname, '../../logs');
fs.mkdirSync(logsDirectory, { recursive: true });

const logger = pino(
    { timestamp: pino.stdTimeFunctions.isoTime },
    pino.destination(path.join(logsDirectory, 'message-inserts.log'))
);

class MessageRepository {
    constructor(db) {
        this.db = db;
    }

    async save(row) {
        const startedAt = performance.now();

        try {
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

            const durationMs = performance.now() - startedAt;
            logger.info(
                {
                    event: 'message_inserted',
                    messageId: row.id,
                    body: row.body,
                    durationMs: Number(durationMs.toFixed(2)),
                    durationSeconds: Number((durationMs / 1000).toFixed(3)),
                },
                'Mensaje insertado en la base de datos'
            );
        } catch (error) {
            logger.error(
                {
                    event: 'message_insert_failed',
                    messageId: row.id,
                    body: row.body,
                    durationMs: Number((performance.now() - startedAt).toFixed(2)),
                    error: error.message,
                },
                'Error al insertar el mensaje en la base de datos'
            );
            throw error;
        }
    }
}

module.exports = MessageRepository;