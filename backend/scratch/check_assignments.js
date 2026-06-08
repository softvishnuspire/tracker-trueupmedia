const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
    try {
        const { data: clients, error } = await supabase.from('clients').select('id, company_name, employee_id, reel_employee_id, post_employee_id, writer_employee_id');
        if (error) {
            console.error('❌ Query failed:', error.message);
        } else {
            console.log('✅ Active clients and their assignments:');
            clients.forEach(c => {
                console.log(`Client: ${c.company_name}`);
                console.log(`  - Employee: ${c.employee_id}`);
                console.log(`  - Reel Employee: ${c.reel_employee_id}`);
                console.log(`  - Post Employee: ${c.post_employee_id}`);
                console.log(`  - Writer Employee: ${c.writer_employee_id}`);
            });
        }
    } catch (e) {
        console.error('❌ Exception:', e.message);
    }
}

check();
