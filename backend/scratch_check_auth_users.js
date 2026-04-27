const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hjikmcyzqowdiammndrs.supabase.co', 'sb_secret_ONXr9E7ywzHjOw98g0VVoQ_7jLSMBek');

async function checkAuthUsers() {
    try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
            console.error('Error listing auth users:', error.message);
            return;
        }
        console.log('Auth Users:');
        for (const u of data.users) {
            console.log('- Email:', u.email, 'ID:', u.id, 'Role:', u.user_metadata?.role);
        }
    } catch (e) {
        console.error('Crash:', e.message);
    }
}

checkAuthUsers();
