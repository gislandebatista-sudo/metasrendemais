
-- Create is_colaborador function
CREATE OR REPLACE FUNCTION public.is_colaborador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'colaborador')
$$;

-- Create get_employee_id_for_user function
CREATE OR REPLACE FUNCTION public.get_employee_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- Update employees SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees based on role" ON public.employees;
CREATE POLICY "Users can view employees based on role"
ON public.employees FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    NOT public.is_colaborador() OR
    user_id = auth.uid()
  )
);

-- Update goals SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view goals based on role" ON public.goals;
CREATE POLICY "Users can view goals based on role"
ON public.goals FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    NOT public.is_colaborador() OR
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

-- Update goal_monthly_progress SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view goal progress" ON public.goal_monthly_progress;
DROP POLICY IF EXISTS "Users can view goal progress based on role" ON public.goal_monthly_progress;
CREATE POLICY "Users can view goal progress based on role"
ON public.goal_monthly_progress FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    NOT public.is_colaborador() OR
    goal_id IN (
      SELECT g.id FROM public.goals g
      JOIN public.employees e ON g.employee_id = e.id
      WHERE e.user_id = auth.uid()
    )
  )
);

-- Update employee_monthly_bonus SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view bonuses" ON public.employee_monthly_bonus;
DROP POLICY IF EXISTS "Users can view bonuses based on role" ON public.employee_monthly_bonus;
CREATE POLICY "Users can view bonuses based on role"
ON public.employee_monthly_bonus FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    NOT public.is_colaborador() OR
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);
