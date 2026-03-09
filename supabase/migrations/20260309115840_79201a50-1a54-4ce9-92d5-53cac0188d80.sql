
-- Add publication control column
ALTER TABLE public.evaluation_months 
  ADD COLUMN is_published boolean NOT NULL DEFAULT false;

-- Security definer function to check publication status
CREATE OR REPLACE FUNCTION public.is_month_published(target_month varchar)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM evaluation_months 
    WHERE month = target_month AND is_published = true
  );
$$;

-- Update RLS: colaborador can only view published month data for goal_monthly_progress
DROP POLICY IF EXISTS "Users can view goal progress based on role" 
  ON public.goal_monthly_progress;
CREATE POLICY "Users can view goal progress based on role" 
  ON public.goal_monthly_progress FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_admin() OR
      NOT is_colaborador() OR
      (
        is_month_published(month) AND
        goal_id IN (
          SELECT g.id FROM goals g 
          JOIN employees e ON g.employee_id = e.id 
          WHERE e.user_id = auth.uid()
        )
      )
    )
  );

-- Update RLS: colaborador can only view published month data for employee_monthly_bonus
DROP POLICY IF EXISTS "Users can view bonuses based on role" 
  ON public.employee_monthly_bonus;
CREATE POLICY "Users can view bonuses based on role" 
  ON public.employee_monthly_bonus FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_admin() OR
      NOT is_colaborador() OR
      (
        is_month_published(month) AND
        employee_id IN (
          SELECT id FROM employees WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Update get_my_ranking_position to only work on published months for colaboradores
-- Also fix the ranking calculation to align exactly with frontend logic
CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month varchar)
RETURNS TABLE(rank_position bigint, total_participants bigint, my_score numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_employee_id uuid;
  my_perf numeric;
  is_colab boolean;
BEGIN
  -- Check if user is colaborador and month is not published
  SELECT is_colaborador() INTO is_colab;
  IF is_colab AND NOT is_month_published(target_month) THEN
    RETURN;
  END IF;

  SELECT id INTO my_employee_id FROM employees WHERE user_id = auth.uid();
  IF my_employee_id IS NULL THEN RETURN; END IF;

  -- Calculate my score: SUM(LEAST(achieved, goal_weight)) + bonus, cap 105
  SELECT COALESCE(SUM(LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight))), 0)
    + COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                WHERE emb.employee_id = my_employee_id AND emb.month = target_month), 0)
  INTO my_perf
  FROM goal_monthly_progress gmp
  JOIN goals g ON gmp.goal_id = g.id
  WHERE g.employee_id = my_employee_id 
    AND gmp.month = target_month 
    AND gmp.is_deleted = false
    AND COALESCE(gmp.goal_weight, g.weight) > 0;

  RETURN QUERY
  WITH scores AS (
    SELECT e.id as eid,
      LEAST(
        COALESCE(SUM(CASE WHEN COALESCE(gmp.goal_weight, g.weight) > 0 
          THEN LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight)) ELSE 0 END), 0)
        + COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                    WHERE emb.employee_id = e.id AND emb.month = target_month), 0),
        105
      ) as score
    FROM employees e
    LEFT JOIN goals g ON g.employee_id = e.id
    LEFT JOIN goal_monthly_progress gmp ON gmp.goal_id = g.id AND gmp.month = target_month AND gmp.is_deleted = false
    WHERE e.status = 'active'
    GROUP BY e.id
  )
  SELECT 
    (SELECT COUNT(*) + 1 FROM scores WHERE scores.score > LEAST(my_perf, 105))::bigint,
    (SELECT COUNT(*) FROM scores)::bigint,
    LEAST(my_perf, 105);
END;
$$;
