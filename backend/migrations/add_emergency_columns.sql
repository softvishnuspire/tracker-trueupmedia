-- Emergency Tasks Feature Migration
-- Adds emergency flag support to content_items table

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE;

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS emergency_marked_by UUID REFERENCES auth.users(id);

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS emergency_marked_at TIMESTAMPTZ;
