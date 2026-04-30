const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEnum() {
    console.log('Checking content_type column info...');
    
    // We can't directly check enum types via supabase-js easily without raw SQL
    // But we can try to find if there's an exec_sql RPC or just try to alter the type
    const query = `
        SELECT enum_range(NULL::content_type);
    `;
    
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
            console.error('Error fetching enum:', error.message);
        } else {
            console.log('Current Enum Values:', data);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkEnum();
