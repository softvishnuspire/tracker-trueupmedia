const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateSchema() {
    console.log('Adding youtube_per_month to clients table...');
    const query = `ALTER TABLE clients ADD COLUMN IF NOT EXISTS youtube_per_month INTEGER DEFAULT 0;`;
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
            console.error('RPC Error:', error.message);
            console.log('You might need to run this manually in Supabase SQL Editor:');
            console.log(query);
        } else {
            console.log('Successfully added youtube_per_month column.');
        }
    } catch (err) {
        console.error('Error:', err.message);
        console.log('You might need to run this manually in Supabase SQL Editor:');
        console.log(query);
    }
}

updateSchema();
