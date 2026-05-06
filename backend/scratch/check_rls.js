const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('Checking RLS policies for content_items...');
  const { data, error } = await supabase.rpc('run_sql', {
    sql: `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'content_items';
    `
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Policies:', data);
  }
}

checkRLS();
