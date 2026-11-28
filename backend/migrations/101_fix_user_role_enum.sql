-- Add the role names the application actually writes to public.users.role.
-- The reconstructed enum was missing several values, which made
-- "Add Team Member" fail with: invalid input value for enum user_role.
-- Values come from the role selector in admin/coo Team pages and backend inserts.
-- Additive and idempotent.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'GM';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'GENERAL MANAGER';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'TEAM LEAD';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'POSTING TEAM';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'POSTING_TEAM';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'PRODUCTION HEAD';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'CONTENT HEAD';
