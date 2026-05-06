const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error } = await supabase
        .from('content_items')
        .select('*, clients(company_name, team_lead_id)')
        .eq('is_emergency', true)
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Sample Emergency Task:', JSON.stringify(data[0], null, 2));
}

checkData();
