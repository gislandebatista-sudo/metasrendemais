
CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month varchar)
RETURNS TABLE(rank_position bigint, total_participants bigint, my_score numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_employee_id uuid;
  my_perf numeric;
BEGIN
  SELECT id INTO my_employee_id FROM employees WHERE user_id = auth.uid();
  IF my_employee_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight))), 0)
    + COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                WHERE emb.employee_id = my_employee_id AND emb.month = target_month), 0)
  INTO my_perf
  FROM goal_monthly_progress gmp
  JOIN goals g ON gmp.goal_id = g.id
  WHERE g.employee_id = my_employee_id AND gmp.month = target_month AND gmp.is_deleted = false;

  RETURN QUERY
  WITH scores AS (
    SELECT e.id as eid,
      LEAST(
        COALESCE(SUM(LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight))), 0)
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
