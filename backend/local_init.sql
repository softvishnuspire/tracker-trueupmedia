-- Local bootstrap schema, reconstructed from backend/schema.sql + migrations/*.
-- schema.sql is a non-runnable reference export (enums shown as USER-DEFINED,
-- forward-referencing FKs). This file is the runnable equivalent for local dev.
-- Safe to re-run: guarded with IF NOT EXISTS / idempotent blocks.

BEGIN;

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums (values are a superset gathered from the backend code) --------------
DO $$ BEGIN
  CREATE TYPE public.content_type AS ENUM
    ('Post','Reel','YouTube','Special Poster','Special Day Poster');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM
    ('ADMIN','COO','MANAGER','TL','EMPLOYEE','WRITER','CLIENT','CONTENT_HEAD',
     'GM','GENERAL MANAGER','TEAM LEAD','POSTING TEAM','POSTING_TEAM',
     'PRODUCTION HEAD','CONTENT HEAD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employee_task_status AS ENUM
    ('PENDING','IN_PROGRESS','COMPLETED','APPROVED','EDITED','POSTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text,
  role public.user_role NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  role_identifier text,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

-- clients ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name text NOT NULL UNIQUE,
  phone text,
  email text,
  address text,
  created_by uuid REFERENCES public.users(user_id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  is_deleted boolean DEFAULT false,
  team_lead_id uuid REFERENCES public.users(user_id),
  employee_id uuid REFERENCES public.users(user_id),
  post_employee_id uuid REFERENCES public.users(user_id),
  reel_employee_id uuid REFERENCES public.users(user_id),
  writer_employee_id uuid REFERENCES public.users(user_id),
  posts_per_month integer DEFAULT 0,
  reels_per_month integer DEFAULT 0,
  youtube_per_month integer DEFAULT 0,
  batch_type text NOT NULL DEFAULT '1-1' CHECK (batch_type IN ('1-1','15-15')),
  password_hash text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- content_items ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  content_type public.content_type NOT NULL,
  scheduled_datetime timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'CONTENT APPROVED',
  created_by uuid REFERENCES public.users(user_id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  title text NOT NULL DEFAULT 'Untitled Content',
  description text,
  creative_url text,
  is_deleted boolean DEFAULT false,
  is_rescheduled boolean DEFAULT false,
  is_emergency boolean DEFAULT false,
  emergency_marked_by uuid REFERENCES auth.users(id),
  emergency_marked_at timestamptz,
  assigned_to uuid REFERENCES public.users(user_id),
  employee_task_status public.employee_task_status DEFAULT 'PENDING',
  assigned_at timestamptz DEFAULT now(),
  original_scheduled_datetime timestamptz,
  reschedule_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  freelancer_name text,
  freelancer_phone text,
  freelancer_email text,
  CONSTRAINT content_items_pkey PRIMARY KEY (id)
);

-- notifications ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  message text NOT NULL,
  type varchar NOT NULL CHECK (type IN ('INFO','WARNING','URGENT')),
  sender_id uuid REFERENCES public.users(user_id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
);

CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(notification_id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(user_id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  CONSTRAINT notification_recipients_pkey PRIMARY KEY (id)
);

-- poc_communications -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poc_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_lead_id uuid REFERENCES public.users(user_id),
  client_id uuid REFERENCES public.clients(id),
  note_date date NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  CONSTRAINT poc_communications_pkey PRIMARY KEY (id)
);

-- status_logs --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.status_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.content_items(id),
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES public.users(user_id),
  changed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  note text,
  CONSTRAINT status_logs_pkey PRIMARY KEY (log_id)
);

-- freelancer_tasks ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelancer_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  freelancer_name varchar NOT NULL,
  freelancer_phone varchar,
  freelancer_email varchar,
  content_type varchar NOT NULL,
  scheduled_datetime timestamptz NOT NULL,
  title varchar NOT NULL,
  description text,
  status varchar DEFAULT 'PENDING',
  created_by uuid REFERENCES public.users(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_rescheduled boolean DEFAULT false,
  is_emergency boolean DEFAULT false,
  emergency_marked_by uuid REFERENCES public.users(user_id),
  emergency_marked_at timestamptz,
  assigned_to uuid REFERENCES public.users(user_id),
  employee_task_status varchar DEFAULT 'PENDING',
  assigned_at timestamptz,
  original_scheduled_datetime timestamptz,
  reschedule_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT freelancer_tasks_pkey PRIMARY KEY (id)
);

-- onboarding_requests ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone_number text,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT onboarding_requests_pkey PRIMARY KEY (id)
);

-- system_settings ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

-- Indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_content_items_client_sched ON public.content_items (client_id, scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_content_items_assigned_status ON public.content_items (assigned_to, employee_task_status);
CREATE INDEX IF NOT EXISTS idx_content_items_sched_status ON public.content_items (scheduled_datetime, status);
CREATE INDEX IF NOT EXISTS idx_status_logs_item_changed ON public.status_logs (item_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_lead_active ON public.clients (team_lead_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_clients_employee ON public.clients (employee_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_clients_post_employee ON public.clients (post_employee_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_clients_reel_employee ON public.clients (reel_employee_id, is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_read ON public.notification_recipients (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_poc_comms_client_date ON public.poc_communications (client_id, note_date DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_identifier ON public.users (role_identifier);

-- NOTE: no exec_sql/run_sql helper functions are created. Schema changes are
-- applied via versioned files in backend/migrations, not arbitrary runtime SQL.

COMMIT;

-- user_streaks (referenced by StreakSync; not present in the reference schema) --
BEGIN;
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(user_id) ON DELETE CASCADE,
  streak_date date NOT NULL,
  streak_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_streaks_pkey PRIMARY KEY (id),
  CONSTRAINT user_streaks_unique UNIQUE (user_id, streak_date, streak_type)
);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_date ON public.user_streaks (user_id, streak_date);
COMMIT;
