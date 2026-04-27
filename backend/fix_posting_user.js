const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://hjikmcyzqowdiammndrs.supabase.co', 'sb_secret_ONXr9E7ywzHjOw98g0VVoQ_7jLSMBek');

async function fixPostingUser() {
    console.log('--- Fixing Posting Team User ---');
    
    const userId = 'a89b4ca7-1b13-457a-9de4-207bc55469cf';
    const targetEmail = 'sarahpost@trueupmedia.com';
    const targetPassword = 'sarah@67';
    const targetRole = 'POSTING_TEAM';
    const targetName = 'Sarah Team Lead';

    try {
        // 1. Update Auth User
        console.log(`Updating Auth User ${userId}...`);
        const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(userId, {
            email: targetEmail,
            password: targetPassword,
            email_confirm: true,
            user_metadata: { 
                role: targetRole,
                name: targetName,
                role_identifier: 'POSTING'
            }
        });

        if (authError) {
            console.error('Auth Update Error:', authError.message);
        } else {
            console.log('Successfully updated Auth User.');
        }

        // 2. Ensure DB User matches
        console.log(`Updating DB User ${userId}...`);
        const { data: dbData, error: dbError } = await supabase
            .from('users')
            .update({
                email: targetEmail,
                password_hash: targetPassword,
                role: targetRole,
                role_identifier: 'POSTING'
            })
            .eq('user_id', userId);

        if (dbError) {
            console.error('DB Update Error:', dbError.message);
        } else {
            console.log('Successfully updated DB User.');
        }

        console.log('\n--- Done ---');
        console.log('User should now be able to log in with:');
        console.log('Email:', targetEmail);
        console.log('Password:', targetPassword);
    } catch (e) {
        console.error('Crash:', e.message);
    }
}

fixPostingUser();
