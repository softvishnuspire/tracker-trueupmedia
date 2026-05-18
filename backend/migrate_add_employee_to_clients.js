const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Adding employee_id to clients table...');

    const query = `
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.users(user_id);
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
            console.error('Migration failed:', error.message);
            console.log('Please run the following SQL in your Supabase SQL Editor:');
            console.log(query);
        } else {
            console.log('Migration successful!');
        }
    } catch (err) {
        console.error('Exception during migration:', err);
    }
}

migrate();
