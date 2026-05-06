const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = '4d353f35-b5fd-4ddb-b7d7-c0af4d2dc68c';
    const { data, error } = await supabase
        .from('content_items')
        .select('id, title, scheduled_datetime, assigned_to, employee_task_status')
        .eq('assigned_to', userId);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${data.length} tasks assigned to ${userId}:`);
    console.log(JSON.stringify(data, null, 2));
}

check();
