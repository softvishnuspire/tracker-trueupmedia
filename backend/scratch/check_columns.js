const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log('--- CONTENT_ITEMS COLUMNS ---');
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'content_items' });
    if (colError) {
        // Fallback: try to just select one item
        const { data: item, error: itemError } = await supabase.from('content_items').select('*').limit(1);
        if (itemError) {
            console.error('Error fetching content_items:', itemError.message);
        } else if (item && item.length > 0) {
            console.log('Columns found in existing item:', Object.keys(item[0]));
        } else {
            console.log('No items in content_items yet.');
        }
    } else {
        console.log(cols);
    }
}

checkSchema();
