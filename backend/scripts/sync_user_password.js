require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPassword(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node sync_user_password.js <email> <newPassword>');
    process.exit(1);
  }

  console.log(`Attempting to sync password for: ${email}`);

  // Never store plaintext. The real password lives in Supabase Auth; this only
  // keeps a bcrypt hash in the reference column.
  const { error } = await supabase
    .from('users')
    .update({ password_hash: bcrypt.hashSync(String(newPassword), 10) })
    .eq('email', email);

  if (error) {
    console.error('Error updating:', error.message);
  } else {
    console.log(`Successfully synced password_hash for ${email} in the users table.`);
  }
}

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

syncPassword(emailArg, passwordArg);
