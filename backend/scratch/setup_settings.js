const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSettings() {
    console.log('🚀 Setting up system_settings table...');

    // 1. Create the table if it doesn't exist
    // Note: We'll use RPC or just check if it exists by trying to select from it
    const { error: selectError } = await supabase.from('system_settings').select('key').limit(1);

    if (selectError && selectError.code === '42P01') {
        console.log('📦 Table system_settings does not exist. Please create it manually in Supabase SQL Editor:');
        console.log(`
            CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            INSERT INTO system_settings (key, value)
            VALUES ('show_company_calendar', 'true'::jsonb)
            ON CONFLICT (key) DO NOTHING;
        `);
        
        // Since I cannot run raw SQL directly through the client easily if it's not enabled, 
        // I will attempt to insert and see if it works. If not, I'll rely on the backend to handle it or use a default.
    } else {
        console.log('✅ Table system_settings exists.');
        
        // Ensure the default setting exists
        const { error: insertError } = await supabase
            .from('system_settings')
            .upsert([{ key: 'show_company_calendar', value: true }], { onConflict: 'key' });

        if (insertError) {
            console.error('❌ Error inserting default setting:', insertError.message);
        } else {
            console.log('✅ Default setting "show_company_calendar" initialized to true.');
        }
    }
}

setupSettings();
