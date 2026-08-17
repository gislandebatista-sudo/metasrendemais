CREATE OR REPLACE FUNCTION public.initialize_month(target_month character varying)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prev_month varchar;
BEGIN
  INSERT INTO public.evaluation_months (month, status)
  VALUES (target_month, 'active')
  ON CONFLICT (month) DO NOTHING;

  prev_month := to_char((to_date(target_month, 'YYYY-MM') - interval '1 month'), 'YYYY-MM');

  IF target_month >= '2026-08' THEN
    -- Metas setoriais: replicadas a partir do snapshot do mês anterior (colaboradores ativos)
    INSERT INTO public.goal_monthly_progress (
      goal_id, month, achieved, delivery_date, observations,
      goal_name, goal_description, goal_weight, goal_deadline, goal_type, is_deleted
    )
    SELECT
      g.id, target_month, 0, NULL, NULL,
      COALESCE(prev.goal_name, g.name),
      COALESCE(prev.goal_description, g.description),
      COALESCE(prev.goal_weight, g.weight),
      COALESCE(prev.goal_deadline, g.deadline),
      'sectoral', false
    FROM public.goal_monthly_progress prev
    JOIN public.goals g ON g.id = prev.goal_id
    JOIN public.employees e ON e.id = g.employee_id
    WHERE prev.month = prev_month
      AND prev.is_deleted = false
      AND COALESCE(prev.goal_type, g.goal_type) = 'sectoral'
      AND e.status = 'active'
    ON CONFLICT (goal_id, month) DO NOTHING;

    -- Metas macro: apenas as criadas para este mês
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
      AND g.goal_type = 'macro'
      AND g.restrict_to_month = target_month
    ON CONFLICT (goal_id, month) DO NOTHING;
  ELSE
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
  END IF;

  INSERT INTO public.employee_monthly_bonus (employee_id, month, performance_bonus, bonus_description)
  SELECT id, target_month, 0, NULL
  FROM public.employees
  WHERE status = 'active'
  ON CONFLICT (employee_id, month) DO NOTHING;
END;
$function$;