const path = require('path');
require('dotenv').config();

const HISTORY_LIMIT = parseInt(process.env.HISTORY_LIMIT || '50', 10);
const MEDIA_DIR = path.join(__dirname, '..', 'media');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

module.exports = {
    HISTORY_LIMIT,
    MEDIA_DIR,
    SUPABASE_URL,
    SUPABASE_KEY,
};
