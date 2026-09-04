require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('❌ Faltan SUPABASE_URL o SUPABASE_KEY en el archivo .env');
    process.exit(1);
}

module.exports = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
