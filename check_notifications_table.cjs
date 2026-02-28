
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    try {
        const { data, error } = await supabase.from('notifications').select('*').limit(1);
        if (error) {
            console.log('Error or table missing:', error.message);
        } else {
            console.log('Table exists, data:', data);
        }
    } catch (e) {
        console.log('Exception check table:', e.message);
    }
}

checkTable();
