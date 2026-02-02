-- Fix remaining overly permissive policies

-- Drop the overly permissive policy on goal_attachments (already dropped but checking again)
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.goal_attachments;

-- Ensure policy exists for admins only on goal_attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goal_attachments' AND schemaname = 'public'
    AND policyname = 'Admins can view all attachments'
  ) THEN
    CREATE POLICY "Admins can view all attachments"
    ON public.goal_attachments
    FOR SELECT
    USING (is_admin());
  END IF;
END $$;