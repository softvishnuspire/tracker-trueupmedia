const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRecentTasks() {
    console.log('Checking for recent freelancer tasks...');
    const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .is('client_id', null)
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Recent Freelancer Tasks:', data);
    }
}

checkRecentTasks();
