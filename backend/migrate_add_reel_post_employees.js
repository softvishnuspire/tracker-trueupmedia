const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Starting migration to add reel_employee_id and post_employee_id columns...');

    const queries = [
        `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS reel_employee_id uuid REFERENCES public.users(user_id);`,
        `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS post_employee_id uuid REFERENCES public.users(user_id);`,
        `UPDATE public.clients SET reel_employee_id = employee_id, post_employee_id = employee_id WHERE employee_id IS NOT NULL;`
    ];

    try {
        for (const query of queries) {
            console.log(`Executing: ${query}`);
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
                console.error(`Error executing query: ${error.message}`);
            } else {
                console.log('Query executed successfully.');
            }
        }
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration crashed:', err.message);
    }
}

migrate();
