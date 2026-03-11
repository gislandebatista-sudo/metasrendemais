CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month character varying)
 RETURNS TABLE(rank_position bigint, total_participants bigint, my_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  my_employee_id uuid;
  is_colab boolean;
BEGIN
  SELECT is_colaborador() INTO is_colab;
  IF is_colab AND NOT is_month_published(target_month) THEN
    RETURN;
  END IF;

  SELECT id INTO my_employee_id FROM employees WHERE user_id = auth.uid();
  IF my_employee_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH scores AS (
    SELECT e.id as eid, e.name as ename,
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
    WHERE e.status = 'active'
    GROUP BY e.id, e.name
  ),
  ranked AS (
    SELECT eid, score,
      ROW_NUMBER() OVER (ORDER BY score DESC, ename ASC) as rn
    FROM scores
  )
  SELECT 
    r.rn::bigint as rank_position,
    (SELECT COUNT(*) FROM scores)::bigint as total_participants,
    r.score as my_score
  FROM ranked r
  WHERE r.eid = my_employee_id;
END;
$function$;