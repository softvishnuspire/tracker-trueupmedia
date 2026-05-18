const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    try {
        // Get all users and clients first using service role key
        const { data: users, error: uErr } = await supabase.from('users').select('*');
        const { data: clients, error: cErr } = await supabase.from('clients').select('id, company_name').limit(1);

        if (uErr || cErr) {
            console.error('Queries failed:', { uErr, cErr });
            return;
        }

        const employees = users.filter(u => u.role === 'EMPLOYEE');
        if (!clients?.length || !employees?.length) {
            console.error('No clients or employees found', { clients: clients?.length, employees: employees?.length });
            return;
        }

        const client = clients[0];
        const employee = employees[0];

        console.log(`Ready. Client: "${client.company_name}" (${client.id}), Employee: "${employee.name}" (${employee.user_id})`);

        // Sign in as PH to get JWT token
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'ph@trueupmedia.com',
            password: 'ph@123'
        });

        if (authError) {
            console.error('Auth error:', authError);
            return;
        }

        const token = authData.session.access_token;
        console.log('Signed in successfully. Token:', token.substring(0, 15) + '...');

        console.log(`Attempting to assign client "${client.company_name}" (${client.id}) to employee "${employee.name}" (${employee.user_id})`);

        // Perform patch request using fetch
        try {
            const res = await fetch(`http://localhost:3001/api/ph/clients/${client.id}/assign-employee`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    employee_id: employee.user_id
                })
            });
            console.log('PATCH response status:', res.status);
            const data = await res.json();
            console.log('PATCH response data:', data);
        } catch (patchErr) {
            console.error('PATCH error:', patchErr);
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

test();
