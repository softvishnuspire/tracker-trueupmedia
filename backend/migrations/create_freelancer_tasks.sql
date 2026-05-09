-- Migration: Create freelancer_tasks table

CREATE TABLE IF NOT EXISTS public.freelancer_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    freelancer_name VARCHAR NOT NULL,
    freelancer_phone VARCHAR,
    freelancer_email VARCHAR,
    content_type VARCHAR NOT NULL,
    scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'PENDING',
    created_by UUID REFERENCES public.users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_rescheduled BOOLEAN DEFAULT FALSE,
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_marked_by UUID REFERENCES public.users(user_id),
    emergency_marked_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.users(user_id),
    employee_task_status VARCHAR DEFAULT 'PENDING',
    assigned_at TIMESTAMP WITH TIME ZONE
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_freelancer_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_freelancer_tasks_timestamp ON public.freelancer_tasks;

CREATE TRIGGER update_freelancer_tasks_timestamp
BEFORE UPDATE ON public.freelancer_tasks
FOR EACH ROW
EXECUTE FUNCTION update_freelancer_tasks_updated_at();

-- Add RLS policies (optional, depending on your setup)
ALTER TABLE public.freelancer_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to freelancer_tasks"
ON public.freelancer_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure service role has full access
CREATE POLICY "Allow service role full access to freelancer_tasks"
ON public.freelancer_tasks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
