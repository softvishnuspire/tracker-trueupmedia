const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Adding MANAGER to user_role enum...');

    try {
        const { error } = await supabase.rpc('exec_sql', { 
            sql: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER';" 
        });
        
        if (error) {
            console.warn(`Note: ${error.message}`);
        } else {
            console.log("MANAGER role successfully added/ensured in user_role enum.");
        }
    } catch (err) {
        console.error('Migration crash:', err.message);
    }
}

migrate();
