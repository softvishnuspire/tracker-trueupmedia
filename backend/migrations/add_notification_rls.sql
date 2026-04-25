-- Disable RLS on notification tables
-- Backend handles authentication via middleware, so RLS is not needed
-- and was blocking the service role queries

-- Disable RLS completely - backend auth middleware handles access control
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients DISABLE ROW LEVEL SECURITY;
