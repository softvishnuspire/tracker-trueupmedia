const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking content_items schema with data...');
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching content_items:', error);
  } else if (data && data.length > 0) {
    console.log('Sample row:', data[0]);
  } else {
    console.log('No data found in content_items');
  }
}

checkSchema();
