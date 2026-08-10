const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTlUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total users in DB: ${data.length}`);
    const tls = data.filter(u => {
        const r = (u.role || '').toLowerCase();
        const ri = (u.role_identifier || '').toLowerCase();
        return r.includes('tl') || r.includes('lead') || ri.includes('tl') || ri.includes('lead');
    });

    console.log("=== TEAM LEAD USERS ===");
    tls.forEach(u => {
        console.log(`User: ${u.email} | Name: ${u.name} | Role: "${u.role}" | Identifier: "${u.role_identifier}" | ID: ${u.user_id}`);
    });
}

checkTlUsers();


