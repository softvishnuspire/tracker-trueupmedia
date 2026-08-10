const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const canonicalizeRole = (role) => {
  const normalized = (role || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');

  if (['admin', 'administrator'].includes(normalized)) return 'admin';
  if (['coo'].includes(normalized)) return 'coo';
  if (['gm', 'general manager'].includes(normalized)) return 'gm';
  if (normalized === 'tl' || normalized.startsWith('tl') || normalized.startsWith('team lead')) return 'tl';
  if (['posting', 'posting team'].includes(normalized)) return 'posting';
  if (['ph', 'production head'].includes(normalized)) return 'ph';
  if (['client'].includes(normalized)) return 'client';
  if (['employee'].includes(normalized)) return 'employee';
  if (['content_head', 'content-head', 'content head'].includes(normalized)) return 'content-head';
  if (['manager'].includes(normalized)) return 'manager';

  return normalized || null;
};

async function checkAllUsers() {
    console.log("=== CHECKING ALL USERS IN DATABASE & AUTH ===");
    
    const { data: dbUsers, error: dbErr } = await supabase.from('users').select('*');
    if (dbErr) {
        console.error('DB Error:', dbErr);
        return;
    }

    const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
        console.error('Auth Error:', authErr);
    }

    console.log(`Found ${dbUsers.length} DB Users and ${authUsers ? authUsers.length : 0} Auth Users.\n`);

    for (const dbUser of dbUsers) {
        const authUser = authUsers ? authUsers.find(a => a.id === dbUser.user_id || a.email === dbUser.email) : null;
        const roleInDb = dbUser.role;
        const roleIdInDb = dbUser.role_identifier;
        const roleInAuthMeta = authUser?.user_metadata?.role;
        const roleIdInAuthMeta = authUser?.user_metadata?.role_identifier;

        const effectiveRole = roleIdInDb || roleInDb || roleIdInAuthMeta || roleInAuthMeta;
        const canonicalRole = canonicalizeRole(effectiveRole);

        const isTL = (roleInDb || '').toLowerCase().includes('tl') || 
                     (roleInDb || '').toLowerCase().includes('lead') || 
                     (roleIdInDb || '').toLowerCase().includes('tl') ||
                     (roleInAuthMeta || '').toLowerCase().includes('tl') ||
                     (roleIdInAuthMeta || '').toLowerCase().includes('tl');

        if (isTL) {
            console.log(`[TL USER] ${dbUser.name} (${dbUser.email})`);
            console.log(`  - DB role: "${roleInDb}"`);
            console.log(`  - DB role_identifier: "${roleIdInDb}"`);
            console.log(`  - Auth meta role: "${roleInAuthMeta}"`);
            console.log(`  - Auth meta role_identifier: "${roleIdInAuthMeta}"`);
            console.log(`  - Effective Role: "${effectiveRole}"`);
            console.log(`  - Canonical Role: "${canonicalRole}"`);
            console.log(`  - Login Check for 'tl' role dropdown: ${canonicalRole === 'tl' ? 'PASS ✅' : 'FAIL ❌'}`);
            console.log(`  - Login Check for 'team lead' role dropdown: ${canonicalRole === canonicalizeRole('team lead') ? 'PASS ✅' : 'FAIL ❌'}\n`);
        }
    }
}

checkAllUsers();
