const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Starting role migration...');

    try {
        // 1. Add 'TEAM LEAD' to user_role enum
        // Note: ALTER TYPE cannot be run inside a transaction in some Postgres versions, 
        // but adding a value is usually okay.
        const { error: enumError } = await supabase.rpc('exec_sql', { 
            sql: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TEAM LEAD';" 
        });
        if (enumError) {
            console.warn('Enum update might have failed (it might already exist or RPC failed):', enumError.message);
        } else {
            console.log("Added 'TEAM LEAD' to user_role enum.");
        }

        // 2. Add role_identifier column to users
        const { error: colError } = await supabase.rpc('exec_sql', { 
            sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_identifier TEXT;" 
        });
        if (colError) {
            console.error('Error adding role_identifier column:', colError.message);
        } else {
            console.log("Added role_identifier column to users table.");
        }

        // 3. Migrate existing TL1 and TL2 users
        // First, get all users
        const { data: users, error: fetchError } = await supabase
            .from('users')
            .select('user_id, role')
            .in('role', ['TL1', 'TL2']);

        if (fetchError) {
            console.error('Error fetching users:', fetchError.message);
            return;
        }

        console.log(`Found ${users.length} users to migrate.`);

        for (const user of users) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    role: 'TEAM LEAD', 
                    role_identifier: user.role // Keep 'TL1' or 'TL2' as identifier
                })
                .eq('user_id', user.user_id);

            if (updateError) {
                console.error(`Error migrating user ${user.user_id}:`, updateError.message);
            } else {
                console.log(`Migrated user ${user.user_id} (${user.role} -> TEAM LEAD)`);
            }
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
