const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testMasterCalendarQuery() {
    const month = '2026-05';
    const [year, mon] = month.split('-');
    const startDate = `${year}-${mon}-01T00:00:00`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    console.log(`Querying for ${month}...`);

    let query = supabase
        .from('content_items')
        .select(`*, clients (company_name)`)
        .gte('scheduled_datetime', startDate)
        .lte('scheduled_datetime', endDate);

    // Test with client_id = 'freelancer'
    const freelancerQuery = query.is('client_id', null);
    const { data: freelancerData, error: freelancerError } = await freelancerQuery.order('scheduled_datetime');

    if (freelancerError) {
        console.error('Freelancer Query Error:', freelancerError.message);
    } else {
        console.log(`Found ${freelancerData.length} freelancer tasks.`);
        if (freelancerData.length > 0) {
            console.log('First freelancer task:', freelancerData[0].title);
        }
    }
}

testMasterCalendarQuery();
