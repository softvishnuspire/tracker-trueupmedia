const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runPerformanceMigration() {
    console.log('🚀 Starting performance migration...');

    const indexes = [
        // Content Items: Index for calendar queries (client_id + datetime)
        `CREATE INDEX IF NOT EXISTS idx_content_items_client_date ON public.content_items (client_id, scheduled_datetime);`,
        
        // Content Items: Index for master calendar (datetime)
        `CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_datetime ON public.content_items (scheduled_datetime);`,
        
        // Clients: Index for active/deleted filtering
        `CREATE INDEX IF NOT EXISTS idx_clients_filtering ON public.clients (is_active, is_deleted);`,
        
        // Status Logs: Index for history retrieval
        `CREATE INDEX IF NOT EXISTS idx_status_logs_item_id ON public.status_logs (item_id, changed_at DESC);`,
        
        // Users: Index for role filtering
        `CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);`
    ];

    console.log('Note: If this fails, please run the following SQL in your Supabase SQL Editor:');
    console.log(indexes.join('\n'));

    for (const sql of indexes) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) {
                console.warn(`⚠️  Failed to run query via RPC: ${sql}`);
                console.warn(`Error: ${error.message}`);
            } else {
                console.log(`✅ Success: ${sql}`);
            }
        } catch (err) {
            console.error(`❌ Error executing: ${sql}`, err.message);
        }
    }
    
    console.log('🏁 Migration attempt complete.');
}

runPerformanceMigration();
