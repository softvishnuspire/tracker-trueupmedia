const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Querying content items with assigned employees...');
    const { data: tasks, error } = await supabase
        .from('content_items')
        .select('id, title, client_id, assigned_to, clients(company_name, employee_id)')
        .not('assigned_to', 'is', null);
        
    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    const { data: users, error: userError } = await supabase
        .from('users')
        .select('user_id, name');

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    const userMap = {};
    users.forEach(u => {
        userMap[u.user_id] = u.name;
    });

    const mismatches = tasks.filter(t => !t.clients || t.clients.employee_id !== t.assigned_to);
    console.log(`\nFound ${mismatches.length} mismatched task assignments:`);
    mismatches.forEach(m => {
        const clientName = m.clients ? m.clients.company_name : 'No Client';
        const clientEmp = m.clients?.employee_id ? userMap[m.clients.employee_id] : 'None';
        const taskEmp = userMap[m.assigned_to] || m.assigned_to;
        console.log(`  - Task: "${m.title}" (Client: "${clientName}") -> Task Assigned to: [${taskEmp}], Client Assigned to: [${clientEmp}]`);
    });
}

run();
