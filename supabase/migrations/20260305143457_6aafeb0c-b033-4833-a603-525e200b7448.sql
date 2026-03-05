
-- Just add the enum value - must be committed before use
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'colaborador';

-- Add user_id column
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
