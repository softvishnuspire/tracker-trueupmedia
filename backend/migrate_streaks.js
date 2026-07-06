require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Running streaks migration with exec_sql...');
  
  const query1 = `
    CREATE TABLE IF NOT EXISTS public.user_streaks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
      streak_date DATE NOT NULL,
      streak_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      UNIQUE (user_id, streak_date, streak_type)
    );
  `;
  
  const query2 = `
    CREATE INDEX IF NOT EXISTS idx_user_streaks_user_month ON public.user_streaks(user_id, streak_date);
  `;

  console.log('Creating user_streaks table...');
  const res1 = await supabase.rpc('exec_sql', { sql: query1 });
  if (res1.error) {
    console.error('Table creation failed:', res1.error.message);
    process.exit(1);
  }

  console.log('Creating index...');
  const res2 = await supabase.rpc('exec_sql', { sql: query2 });
  if (res2.error) {
    console.error('Index creation failed:', res2.error.message);
    process.exit(1);
  }

  console.log('user_streaks table is ready.');
}

run();
