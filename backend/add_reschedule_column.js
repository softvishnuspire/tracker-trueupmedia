const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addRescheduleColumn() {
    console.log('Adding is_rescheduled column to content_items...');

    const query = `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS is_rescheduled BOOLEAN DEFAULT FALSE;`;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
            console.warn(`Query failed: ${query}`, error.message);
            console.log('\nIMPORTANT: Please run the following SQL in your Supabase SQL Editor:');
            console.log(query);
        } else {
            console.log(`Successfully added is_rescheduled column.`);
        }
    } catch (err) {
        console.error(`Error executing query:`, err);
    }
}

addRescheduleColumn();
