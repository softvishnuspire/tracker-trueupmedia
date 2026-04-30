-- Migration: Add batch_type column to clients table
-- batch_type can be '1-1' (monthly) or '15-15' (bi-monthly cycle)
-- Default is '1-1' for backward compatibility

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS batch_type text NOT NULL DEFAULT '1-1' 
CHECK (batch_type IN ('1-1', '15-15'));

-- Comment for documentation
COMMENT ON COLUMN public.clients.batch_type IS 'Calendar batch type: 1-1 = full monthly, 15-15 = bi-monthly (1-15 and 16-end)';
