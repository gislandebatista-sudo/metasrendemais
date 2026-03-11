CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month character varying)
 RETURNS TABLE(rank_position bigint, total_participants bigint, my_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  my_employee_id uuid;
  my_perf numeric;
  is_colab boolean;
BEGIN
  SELECT is_colaborador() INTO is_colab;
  IF is_colab AND NOT is_month_published(target_month) THEN
    RETURN;
  END IF;

  SELECT id INTO my_employee_id FROM employees WHERE user_id = auth.uid();
  IF my_employee_id IS NULL THEN RETURN; END IF;

  -- Calculate my score using same logic as frontend calculateTotalPerformance
  SELECT LEAST(
    COALESCE(SUM(
      CASE WHEN COALESCE(gmp.goal_weight, g.weight) > 0 
        THEN LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight)) 
        ELSE 0 
      END
    ), 0)
    + LEAST(COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                WHERE emb.employee_id = my_employee_id AND emb.month = target_month), 0), 5),
    105
  )
  INTO my_perf
  FROM goal_monthly_progress gmp
  JOIN goals g ON gmp.goal_id = g.id
  WHERE g.employee_id = my_employee_id 
    AND gmp.month = target_month 
    AND gmp.is_deleted = false;

  RETURN QUERY
  WITH scores AS (
    SELECT e.id as eid,
      LEAST(
        COALESCE(SUM(CASE WHEN COALESCE(gmp.goal_weight, g.weight) > 0 
          THEN LEAST(gmp.achieved, COALESCE(gmp.goal_weight, g.weight)) ELSE 0 END), 0)
        + LEAST(COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                    WHERE emb.employee_id = e.id AND emb.month = target_month), 0), 5),
        105
      ) as score
    FROM employees e
    LEFT JOIN goals g ON g.employee_id = e.id
    LEFT JOIN goal_monthly_progress gmp ON gmp.goal_id = g.id AND gmp.month = target_month AND gmp.is_deleted = false
    GROUP BY e.id
  )
  SELECT 
    (SELECT COUNT(*) + 1 FROM scores WHERE scores.score > my_perf)::bigint,
    (SELECT COUNT(*) FROM scores)::bigint,
    my_perf;
END;
$function$;