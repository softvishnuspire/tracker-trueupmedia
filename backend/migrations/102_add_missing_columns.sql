-- Columns the backend reads/writes that were missing from the reconstructed
-- schema. Found by browser-testing forms and diffing backend/index.js against
-- information_schema:
--   * Rescheduling a task (PUT /api/{admin,gm,coo}/content/:id) writes
--     reschedule_history (+ original_scheduled_datetime) to content_items OR
--     freelancer_tasks -> failed with "Could not find the 'reschedule_history'
--     column of 'content_items'".
--   * Editing a POC note (PUT /api/tl/poc-notes/:id) writes history,
--     updated_at, updated_by on poc_communications.
-- Additive and idempotent.

BEGIN;

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS reschedule_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.freelancer_tasks
  ADD COLUMN IF NOT EXISTS original_scheduled_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.poc_communications
  ADD COLUMN IF NOT EXISTS history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL;

COMMIT;

-- Make PostgREST pick up the new columns immediately.
NOTIFY pgrst, 'reload schema';
