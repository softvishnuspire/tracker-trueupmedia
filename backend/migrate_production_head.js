const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Adding PRODUCTION HEAD to user_role enum...');

    try {
        const { error } = await supabase.rpc('exec_sql', { 
            sql: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PRODUCTION HEAD';" 
        });
        
        if (error) {
            console.error('Migration failed:', error.message);
        } else {
            console.log("Successfully added 'PRODUCTION HEAD' to user_role enum.");
        }
    } catch (err) {
        console.error('Migration error:', err.message);
    }
}

migrate();
