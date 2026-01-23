-- Insert policy for profiles to allow profile creation during signup
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant viewer role to new users by default via a trigger
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Policy for users to insert their own role (for first user/admin setup)
CREATE POLICY "First user can be admin"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);