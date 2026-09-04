const path = require('path');
require('dotenv').config();

const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '50', 10);
const MEDIA_DIR = path.join(__dirname, '..', 'media');

module.exports = {
    HISTORY_LIMIT,
    MEDIA_DIR
};
