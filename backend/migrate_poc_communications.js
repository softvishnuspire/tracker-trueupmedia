require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    create table if not exists public.poc_communications (
      id uuid primary key default gen_random_uuid(),
      team_lead_id uuid not null references public.users(user_id),
      note_date date not null,
      note_text text not null,
      created_at timestamptz default now()
    );
  `;

  const { error } = await supabase.rpc('run_sql', { sql });
  if (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  console.log('poc_communications table is ready.');
}

run();
