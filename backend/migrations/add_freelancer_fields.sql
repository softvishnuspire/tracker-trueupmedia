-- Freelancer Task Feature Migration
-- Adds freelancer details support to content_items table

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS freelancer_name TEXT,
ADD COLUMN IF NOT EXISTS freelancer_phone TEXT,
ADD COLUMN IF NOT EXISTS freelancer_email TEXT;
