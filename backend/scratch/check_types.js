const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumnTypes() {
  console.log('Checking column types for content_items...');
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    const row = data[0];
    for (const key in row) {
      console.log(`${key}: ${typeof row[key]} (${row[key]})`);
    }
  } else {
    console.log('No data');
  }
}

checkColumnTypes();
