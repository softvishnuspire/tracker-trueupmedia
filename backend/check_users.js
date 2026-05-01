const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../frontend/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('Checking all users in the "users" table...');
    const { data, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('Total users found:', data.length);
    data.forEach(user => {
        console.log(`User ID: ${user.user_id || user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Identifier: ${user.role_identifier}`);
    });
}

checkUsers();
