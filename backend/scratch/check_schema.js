const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
    try {
        const { data, error } = await supabase.from('clients').select('*').limit(1);
        if (error) {
            console.error('❌ Query failed:', error.message);
        } else {
            console.log('✅ Columns in clients table:', Object.keys(data[0] || {}));
        }
    } catch (e) {
        console.error('❌ Exception:', e.message);
    }
}

check();
