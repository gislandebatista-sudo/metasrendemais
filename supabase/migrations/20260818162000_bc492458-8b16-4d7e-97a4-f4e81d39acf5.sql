
CREATE OR REPLACE FUNCTION public.can_view_all_data()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer')
$$;

DROP POLICY IF EXISTS "Users can view employees based on role" ON public.employees;
CREATE POLICY "Users can view employees based on role"
ON public.employees FOR SELECT TO authenticated
USING (
  public.can_view_all_data()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can view goals based on role" ON public.goals;
CREATE POLICY "Users can view goals based on role"
ON public.goals FOR SELECT TO authenticated
USING (
  public.can_view_all_data()
  OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view goal progress based on role" ON public.goal_monthly_progress;
CREATE POLICY "Users can view goal progress based on role"
ON public.goal_monthly_progress FOR SELECT TO authenticated
USING (
  public.can_view_all_data()
  OR (
    public.is_month_published(month)
    AND goal_id IN (
      SELECT g.id FROM public.goals g
      JOIN public.employees e ON e.id = g.employee_id
      WHERE e.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can view bonuses based on role" ON public.employee_monthly_bonus;
CREATE POLICY "Users can view bonuses based on role"
ON public.employee_monthly_bonus FOR SELECT TO authenticated
USING (
  public.can_view_all_data()
  OR (
    public.is_month_published(month)
    AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Authenticated users can view evaluation months" ON public.evaluation_months;
CREATE POLICY "Authenticated users can view evaluation months"
ON public.evaluation_months FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);
