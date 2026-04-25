const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('Creating notification tables...');
    
    const query = `
    CREATE TABLE IF NOT EXISTS notifications (
        notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
        title varchar NOT NULL,
        message text NOT NULL,
        type varchar NOT NULL CHECK (type IN ('INFO', 'WARNING', 'URGENT')),
        sender_id uuid REFERENCES public.users(user_id),
        created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
    );

    CREATE TABLE IF NOT EXISTS notification_recipients (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        notification_id uuid REFERENCES public.notifications(notification_id) ON DELETE CASCADE,
        user_id uuid REFERENCES public.users(user_id) ON DELETE CASCADE,
        is_read boolean DEFAULT false,
        read_at timestamp with time zone,
        CONSTRAINT notification_recipients_pkey PRIMARY KEY (id)
    );
    `;

    try {
        const { error } = await supabase.rpc('run_sql', { sql: query });
        if (error) {
            console.error('run_sql error:', error.message);
            const { error: execError } = await supabase.rpc('exec_sql', { sql: query });
            if (execError) {
                console.error('exec_sql error:', execError.message);
            } else {
                console.log('Tables created using exec_sql.');
            }
        } else {
            console.log('Tables created using run_sql.');
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
migrate();
