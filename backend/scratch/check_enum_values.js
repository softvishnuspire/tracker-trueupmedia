const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEnum() {
    // Since we don't have exec_sql easily, let's just try to select one item and see its content_type
    const { data, error } = await supabase.from('content_items').select('content_type').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else if (data && data.length > 0) {
        console.log('Sample content_type:', data[0].content_type);
    } else {
        console.log('No data to check enum values.');
    }
}

checkEnum();
