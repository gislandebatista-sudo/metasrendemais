-- Fix storage policy - remove overly permissive SELECT and ensure only admins can view
DROP POLICY IF EXISTS "Authenticated users can view goal attachments" ON storage.objects;

-- Recreate the admin-only read policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Admins can read goal attachments'
  ) THEN
    CREATE POLICY "Admins can read goal attachments"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'goal-attachments' 
      AND public.is_admin()
    );
  END IF;
END $$;