const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCascade() {
    const clientId = 'fafd7049-8102-4136-8002-bb39441fd526'; // Dr Harika
    const employeeId = '47035cd3-e4fd-4582-aa62-b03d21a40106'; // Jeeva

    console.log('--- BEFORE ASSIGNMENT ---');
    let { data: beforeTasks } = await supabase.from('content_items').select('id, assigned_to').eq('client_id', clientId);
    console.log('Tasks assigned_to status before:', beforeTasks);

    // 1. Perform assignment
    console.log(`\n--- ASSIGNING CLIENT TO EMPLOYEE ${employeeId} ---`);
    await supabase.from('clients').update({ employee_id: employeeId }).eq('id', clientId);
    
    // Simulate backend cascade logic
    const assignPayload = {
        assigned_to: employeeId,
        assigned_at: new Date().toISOString(),
        employee_task_status: 'PENDING'
    };
    await supabase.from('content_items').update(assignPayload).eq('client_id', clientId);

    let { data: afterAssignTasks } = await supabase.from('content_items').select('id, assigned_to').eq('client_id', clientId);
    console.log('Tasks assigned_to status after assign:', afterAssignTasks);

    // 2. Perform unassignment
    console.log('\n--- UNASSIGNING CLIENT ---');
    await supabase.from('clients').update({ employee_id: null }).eq('id', clientId);

    // Simulate backend cascade logic for unassign
    const unassignPayload = {
        assigned_to: null,
        assigned_at: null,
        employee_task_status: null
    };
    await supabase.from('content_items').update(unassignPayload).eq('client_id', clientId);

    let { data: afterUnassignTasks } = await supabase.from('content_items').select('id, assigned_to').eq('client_id', clientId);
    console.log('Tasks assigned_to status after unassign:', afterUnassignTasks);
}

testCascade();
