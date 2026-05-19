const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase environment variables!');
    process.exit(1);
}

const supabase = createClient(url, key);

async function addRescheduleHistoryColumns() {
    console.log('Adding reschedule history columns to content_items and freelancer_tasks...');

    const queries = [
        `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS original_scheduled_datetime timestamp with time zone;`,
        `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS reschedule_history jsonb DEFAULT '[]'::jsonb;`,
        `ALTER TABLE freelancer_tasks ADD COLUMN IF NOT EXISTS original_scheduled_datetime timestamp with time zone;`,
        `ALTER TABLE freelancer_tasks ADD COLUMN IF NOT EXISTS reschedule_history jsonb DEFAULT '[]'::jsonb;`
    ];

    const variations = ['run_sql', 'exec_sql'];

    for (const query of queries) {
        let success = false;
        for (const fn of variations) {
            try {
                // Try with sql and sql_query param names
                for (const paramName of ['sql', 'sql_query']) {
                    const { error } = await supabase.rpc(fn, { [paramName]: query });
                    if (!error) {
                        console.log(`✅ Successfully executed query: "${query}" using RPC '${fn}' with param '${paramName}'.`);
                        success = true;
                        break;
                    }
                }
                if (success) break;
            } catch (e) {
                // Keep trying variations
            }
        }
        if (!success) {
            console.log(`❌ Failed to execute: "${query}". Please run it manually in the Supabase SQL Editor.`);
        }
    }
}

addRescheduleHistoryColumns();
