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

async function testTls() {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('DB error:', error);
        return;
    }

    const tlUsers = users.filter(u => 
        (u.role || '').toLowerCase().includes('tl') || 
        (u.role || '').toLowerCase().includes('lead') || 
        (u.role_identifier || '').toLowerCase().includes('tl')
    );

    console.log("=== TL USERS CANONICALIZATION TEST ===");
    for (const u of tlUsers) {
        const metadataRole = u.role_identifier || u.role;
        const canonical = canonicalizeRole(metadataRole);
        const selectedRoleCanonical = canonicalizeRole('tl');
        const canLogin = canonical === selectedRoleCanonical;

        console.log(`Email: ${u.email}`);
        console.log(`  Role in DB: "${u.role}"`);
        console.log(`  Role Identifier: "${u.role_identifier}"`);
        console.log(`  Canonicalized Role: "${canonical}"`);
        console.log(`  Selected Role Canonical: "${selectedRoleCanonical}"`);
        console.log(`  Login Check Passed: ${canLogin ? 'YES ✅' : 'NO ❌'}\n`);
    }
}

testTls();
