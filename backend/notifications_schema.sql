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
