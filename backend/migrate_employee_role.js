const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Ensuring all roles exist in user_role enum...');

    const roles = [
        'ADMIN',
        'GM',
        'COO',
        'PRODUCTION HEAD',
        'TEAM LEAD',
        'POSTING TEAM',
        'CLIENT',
        'EMPLOYEE'
    ];

    try {
        for (const role of roles) {
            console.log(`Checking role: ${role}`);
            const { error } = await supabase.rpc('exec_sql', { 
                sql: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}';` 
            });
            
            if (error) {
                console.warn(`Note for role ${role}: ${error.message}`);
            } else {
                console.log(`Role ${role} ensured in enum.`);
            }
        }
        console.log('All roles ensured.');
    } catch (err) {
        console.error('Migration crash:', err.message);
    }
}

migrate();
