const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dayStart = '2026-05-11T00:00:00Z';
const dayEnd = '2026-05-11T23:59:59Z';
const panduId = '115465ca-0ef7-4354-a328-baa108b0d326';

Promise.all([
    supabase.from('content_items').select('id').gte('scheduled_datetime', dayStart).lte('scheduled_datetime', dayEnd).eq('assigned_to', panduId),
    supabase.from('content_items').select('id').not('status', 'in', '("POSTED","APPROVED")').eq('assigned_to', panduId),
    supabase.from('content_items').select('id').gte('assigned_at', dayStart).lte('assigned_at', dayEnd).eq('assigned_to', panduId),
    supabase.from('content_items').select('id').gte('updated_at', dayStart).lte('updated_at', dayEnd).eq('assigned_to', panduId)
]).then(results => {
    const ids = new Set();
    results.forEach((r, idx) => {
        if (r.error) console.error(`Query ${idx} error:`, r.error);
        r.data?.forEach(t => ids.add(t.id));
    });
    console.log('Unique tasks found for Pandu:', ids.size);
});
