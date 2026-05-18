const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Find Jeeva's user_id first
    const { data: users } = await supabase.from('users').select('user_id, name').eq('name', 'Jeeva');
    if (!users || users.length === 0) {
        console.log('Jeeva not found');
        return;
    }
    const jeevaId = users[0].user_id;
    console.log(`Jeeva's ID: ${jeevaId}`);

    // Query tasks
    const { data: tasks } = await supabase
        .from('content_items')
        .select('id, title, client_id, assigned_to, clients(company_name)')
        .eq('assigned_to', jeevaId);

    console.log(`Jeeva has ${tasks?.length || 0} assigned tasks:`);
    tasks?.forEach(t => {
        console.log(`  - Task: "${t.title}" (Client: "${t.clients?.company_name}")`);
    });
}

run();
