-- Production hardening migration.
-- 1. Remove plaintext passwords from public.users (login uses Supabase Auth /
--    auth.users; this column was a redundant plaintext copy and is never read
--    for verification). Backend now stores a bcrypt hash if it writes at all.
-- 2. Enable Row Level Security on every table: anonymous (pre-login) access is
--    blocked; authenticated users get the access the app already relies on;
--    the backend uses the service_role key which bypasses RLS.
-- 3. Drop the exec_sql / run_sql arbitrary-SQL helper functions.
--
-- Safe to re-run (idempotent).

BEGIN;

-- 1. Scrub plaintext passwords -------------------------------------------------
-- password_hash is no longer required (auth lives in auth.users); make it
-- nullable and clear any stored plaintext.
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
UPDATE public.users SET password_hash = NULL WHERE password_hash IS NOT NULL;

-- 2. Row Level Security --------------------------------------------------------
-- users: an authenticated user may read ONLY their own profile row.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Operational tables: authenticated users get full access (the frontend and
-- mobile app read/write these directly with the user's session); anonymous is
-- blocked because no policy grants it. The backend (service_role) bypasses RLS.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','content_items','freelancer_tasks','notifications',
    'notification_recipients','poc_communications','status_logs',
    'system_settings','onboarding_requests','user_streaks'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t||'_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t||'_authenticated_all', t);
  END LOOP;
END $$;

-- 3. Drop arbitrary-SQL helper functions --------------------------------------
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.run_sql(text);

COMMIT;
