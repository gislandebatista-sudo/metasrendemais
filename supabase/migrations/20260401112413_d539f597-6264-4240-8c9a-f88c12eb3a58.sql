
-- Add restrict_to_month column to goals table
ALTER TABLE public.goals ADD COLUMN restrict_to_month varchar NULL;

-- Update initialize_month to skip goals restricted to other months
CREATE OR REPLACE FUNCTION public.initialize_month(target_month character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.evaluation_months (month, status)
  VALUES (target_month, 'active')
  ON CONFLICT (month) DO NOTHING;

  INSERT INTO public.goal_monthly_progress (
    goal_id, month, achieved, delivery_date, observations,
    goal_name, goal_description, goal_weight, goal_deadline, goal_type, is_deleted
  )
  SELECT
    g.id, target_month, 0, NULL, NULL,
    g.name, g.description, g.weight, g.deadline, g.goal_type, false
  FROM public.goals g
  JOIN public.employees e ON g.employee_id = e.id
  WHERE e.status = 'active'
    AND (g.restrict_to_month IS NULL OR g.restrict_to_month = target_month)
  ON CONFLICT (goal_id, month) DO NOTHING;

  INSERT INTO public.employee_monthly_bonus (employee_id, month, performance_bonus, bonus_description)
  SELECT id, target_month, 0, NULL
  FROM public.employees
  WHERE status = 'active'
  ON CONFLICT (employee_id, month) DO NOTHING;
END;
$function$;
