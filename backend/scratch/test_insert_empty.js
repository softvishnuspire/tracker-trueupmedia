const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsertEmpty() {
    console.log('Testing insert empty array...');
    const { data, error } = await supabase.from('notification_recipients').insert([]);
    if (error) {
        console.error('Insert empty array failed:', error.message);
    } else {
        console.log('Insert empty array succeeded:', data);
    }
}

testInsertEmpty();
