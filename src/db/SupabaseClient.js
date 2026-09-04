const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_KEY en el archivo .env');
    process.exit(1);
}

module.exports = createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
