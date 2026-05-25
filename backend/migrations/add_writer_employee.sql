-- Migration to add writer_employee_id column to public.clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS writer_employee_id uuid REFERENCES public.users(user_id);
