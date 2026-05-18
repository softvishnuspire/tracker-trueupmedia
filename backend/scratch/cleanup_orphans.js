const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Fetching all content items that have assigned employees...');
    const { data: tasks, error } = await supabase
        .from('content_items')
        .select('id, title, client_id, assigned_to, clients(company_name, employee_id)')
        .not('assigned_to', 'is', null);

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    // Filter tasks where the client has no assigned employee (employee_id is null)
    const orphanedTasks = tasks.filter(t => t.clients && t.clients.employee_id === null);

    console.log(`Found ${orphanedTasks.length} orphaned task assignments to clean up.`);

    if (orphanedTasks.length === 0) {
        console.log('Database is already clean!');
        return;
    }

    const taskIds = orphanedTasks.map(t => t.id);
    console.log(`Cleaning up task IDs:`, taskIds);

    const { data: updated, error: updateError } = await supabase
        .from('content_items')
        .update({
            assigned_to: null,
            assigned_at: null,
            employee_task_status: null
        })
        .in('id', taskIds)
        .select('id, title');

    if (updateError) {
        console.error('Error cleaning up tasks:', updateError);
        return;
    }

    console.log(`Successfully cleaned up ${updated.length} task assignments!`);
}

run();
