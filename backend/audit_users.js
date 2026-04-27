const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hjikmcyzqowdiammndrs.supabase.co', 'sb_secret_ONXr9E7ywzHjOw98g0VVoQ_7jLSMBek');

async function auditUsers() {
    console.log('--- Auditing Users ---');
    
    try {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Auth Error:', authError.message);
            return;
        }
        const authUsers = authData.users;

        const { data: dbUsers, error: dbError } = await supabase.from('users').select('*');
        if (dbError) {
            console.error('DB Error:', dbError.message);
            return;
        }

        console.log('\n--- Mismatches ---');
        for (const dbU of dbUsers) {
            const authU = authUsers.find(function(au) { return au.id === dbU.user_id; });
            if (!authU) {
                console.log('[MISSING IN AUTH] DB User:', dbU.email, '(', dbU.user_id, ')');
            } else if (authU.email !== dbU.email) {
                console.log('[EMAIL MISMATCH] ID:', dbU.user_id);
                console.log('  Auth Email:', authU.email);
                console.log('  DB Email:  ', dbU.email);
            }
        }

        for (const au of authUsers) {
            const dbU = dbUsers.find(function(du) { return du.user_id === au.id; });
            if (!dbU) {
                console.log('[MISSING IN DB] Auth User:', au.email, '(', au.id, ')');
            }
        }

        console.log('\n--- Posting Team Users ---');
        for (const u of dbUsers) {
            if (u.role && u.role.includes('POSTING')) {
                console.log('-', u.name, '(', u.email, ') - Password Hash in DB:', u.password_hash);
            }
        }
    } catch (e) {
        console.error('Crash:', e.message);
    }
}

auditUsers();
