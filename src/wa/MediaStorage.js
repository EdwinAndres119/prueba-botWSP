const fs = require('fs');
const path = require('path');
const { sanitizeFilename } = require('./identifiers');

const EMPTY_RESULT = { hasMedia: false, mimetype: null, filename: null, mediaPath: null };

class MediaStorage {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    async save(msg, messageId) {
        if (!msg.hasMedia) {
            return EMPTY_RESULT;
        }

        try {
            const media = await msg.downloadMedia();
            if (!media || !media.data) {
                return { ...EMPTY_RESULT, hasMedia: true };
            }

            const targetDir = path.join(this.baseDir, this._today());
            fs.mkdirSync(targetDir, { recursive: true });

            const extension = media.mimetype ? media.mimetype.split('/')[1].split(';')[0] : 'bin';
            const filename = `${sanitizeFilename(messageId)}.${extension}`;
            const fullPath = path.join(targetDir, filename);

            fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));

            return {
                hasMedia: true,
                mimetype: media.mimetype || null,
                filename: media.filename || filename,
                mediaPath: fullPath,
            };
        } catch (err) {
            console.error('No se pudo descargar el multimedia:', err.message);
            return { ...EMPTY_RESULT, hasMedia: true };
        }
    }

    _today() {
        return new Date().toISOString().slice(0, 10);
    }
}

module.exports = MediaStorage;
