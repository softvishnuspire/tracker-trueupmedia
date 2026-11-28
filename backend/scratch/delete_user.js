// Delete a user from Supabase Auth AND public.users by email.
// Usage: node scratch/delete_user.js <email>
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node scratch/delete_user.js <email>'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  // find the auth user
  const list = await supabase.auth.admin.listUsers();
  if (list.error) { console.error('listUsers failed:', list.error.message); process.exit(1); }
  const user = list.data.users.find(u => u.email === EMAIL);

  if (user) {
    const del = await supabase.auth.admin.deleteUser(user.id);
    if (del.error) { console.error('auth delete failed:', del.error.message); process.exit(1); }
    console.log('Deleted auth user:', user.id);
  } else {
    console.log('No auth user found for', EMAIL);
  }

  const { error: dbErr, count } = await supabase
    .from('users').delete({ count: 'exact' }).eq('email', EMAIL);
  if (dbErr) { console.error('profile delete failed:', dbErr.message); process.exit(1); }
  console.log(`Deleted ${count ?? 0} public.users row(s) for ${EMAIL}`);
  console.log('Done.');
})();
