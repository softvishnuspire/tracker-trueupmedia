// Bootstrap a local admin: creates an auth user AND a matching public.users row.
// Usage: node scratch/create_admin.js [email] [password] [name]
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const EMAIL = process.argv[2] || 'admin@trueup.local';
const PASSWORD = process.argv[3] || 'Admin@12345';
const NAME = process.argv[4] || 'Local Admin';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  // 1. Create (or find) the auth user
  let authId;
  const created = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'ADMIN', role_identifier: 'ADMIN' },
  });
  if (created.error) {
    if (/already|exists|registered/i.test(created.error.message)) {
      const list = await supabase.auth.admin.listUsers();
      authId = list.data.users.find(u => u.email === EMAIL)?.id;
      console.log('Auth user already existed, reusing id:', authId);
    } else {
      console.error('createUser failed:', created.error.message);
      process.exit(1);
    }
  } else {
    authId = created.data.user.id;
    console.log('Created auth user:', authId);
  }

  // 2. Upsert the public.users profile with the SAME id (matched by user_id/email)
  const { error: upErr } = await supabase.from('users').upsert({
    user_id: authId,
    name: NAME,
    email: EMAIL,
    // Password lives in Supabase Auth (auth.users); do not store it here.
    password_hash: null,
    role: 'ADMIN',
    role_identifier: 'ADMIN',
  }, { onConflict: 'email' });
  if (upErr) { console.error('profile upsert failed:', upErr.message); process.exit(1); }

  console.log(`\n✅ Admin ready:\n   email:    ${EMAIL}\n   password: ${PASSWORD}`);
})();
