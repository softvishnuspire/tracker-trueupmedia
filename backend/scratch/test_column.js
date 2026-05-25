const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function check() {
    try {
        const { data, error } = await supabase.from('clients').select('id, company_name, writer_employee_id').limit(1);
        if (error) {
            console.error('❌ Query failed:', error.message, error.code, error.details);
        } else {
            console.log('✅ Query succeeded! Column exists. Sample data:', data);
        }
    } catch (e) {
        console.error('❌ Exception:', e.message);
    }
}

check();
