const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = '4d353f35-b5fd-4ddb-b7d7-c0af4d2dc68c';
    const todayStr = new Date().toISOString().split('T')[0]; // "2026-05-06"
    console.log(`Today: ${todayStr}`);

    const { data, error } = await supabase
        .from('content_items')
        .select(`
            *,
            clients (
                company_name
            )
        `)
        .eq('assigned_to', userId)
        .or(`scheduled_datetime.ilike.${todayStr}%,and(scheduled_datetime.lt.${todayStr},employee_task_status.eq.PENDING)`)
        .order('scheduled_datetime', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} tasks:`);
    console.log(JSON.stringify(data, null, 2));
}

check();
