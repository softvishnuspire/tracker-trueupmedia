const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase environment variables!');
    process.exit(1);
}

const supabase = createClient(url, key);

async function migrate() {
    console.log('Starting migration to add writer_employee_id column...');

    const query = `ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS writer_employee_id uuid REFERENCES public.users(user_id);`;

    const variations = [
        { name: 'run_sql', params: { sql: query } },
        { name: 'run_sql', params: { sql_query: query } },
        { name: 'exec_sql', params: { sql: query } },
        { name: 'exec_sql', params: { sql_query: query } }
    ];

    for (const v of variations) {
        try {
            const { error } = await supabase.rpc(v.name, v.params);
            if (!error) {
                console.log(`✅ Successfully executed query using RPC '${v.name}' with params ${JSON.stringify(v.params)}.`);
                return;
            }
            console.warn(`⚠️  RPC '${v.name}' with params ${JSON.stringify(v.params)} failed: ${error.message}`);
        } catch (e) {
            console.warn(`❌ RPC '${v.name}' caught error:`, e.message);
        }
    }

    console.log('\nIMPORTANT: Please run the following SQL in your Supabase SQL Editor:');
    console.log(query);
}

migrate();
