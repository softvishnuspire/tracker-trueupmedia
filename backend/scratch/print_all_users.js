const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function printAllUsers() {
    const { data: users, error } = await supabase.from('users').select('user_id, name, email, role, role_identifier');
    if (error) {
        console.error(error);
        return;
    }

    console.log("=== ALL 37 USERS IN DATABASE ===");
    users.forEach((u, i) => {
        console.log(`${i + 1}. Name: ${u.name} | Email: ${u.email} | Role: "${u.role}" | Identifier: "${u.role_identifier}"`);
    });
}

printAllUsers();
