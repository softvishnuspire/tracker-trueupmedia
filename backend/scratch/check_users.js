const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log('Checking employees in users table...');
  const { data, error } = await supabase
    .from('users')
    .select('user_id, name, role, role_identifier');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users:', data);
  }
}

checkEmployees();
