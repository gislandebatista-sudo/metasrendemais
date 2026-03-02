-- Snapshot mensal de metas para preservar histórico entre meses
ALTER TABLE public.goal_monthly_progress
  ADD COLUMN IF NOT EXISTS goal_name text,
  ADD COLUMN IF NOT EXISTS goal_description text,
  ADD COLUMN IF NOT EXISTS goal_weight numeric,
  ADD COLUMN IF NOT EXISTS goal_deadline date,
  ADD COLUMN IF NOT EXISTS goal_type text,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Backfill dos snapshots existentes com dados atuais da meta base
UPDATE public.goal_monthly_progress gmp
SET
  goal_name = COALESCE(gmp.goal_name, g.name),
  goal_description = COALESCE(gmp.goal_description, g.description),
  goal_weight = COALESCE(gmp.goal_weight, g.weight),
  goal_deadline = COALESCE(gmp.goal_deadline, g.deadline),
  goal_type = COALESCE(gmp.goal_type, g.goal_type)
FROM public.goals g
WHERE g.id = gmp.goal_id;

CREATE INDEX IF NOT EXISTS idx_goal_monthly_progress_month_is_deleted
  ON public.goal_monthly_progress (month, is_deleted);

-- Atualiza inicialização de mês para criar snapshots mensais independentes
CREATE OR REPLACE FUNCTION public.initialize_month(target_month character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar registro do mês se não existir
  INSERT INTO public.evaluation_months (month, status)
  VALUES (target_month, 'active')
  ON CONFLICT (month) DO NOTHING;

  -- Criar registros de progresso zerados com snapshot dos dados da meta no mês
  INSERT INTO public.goal_monthly_progress (
    goal_id,
    month,
    achieved,
    delivery_date,
    observations,
    goal_name,
    goal_description,
    goal_weight,
    goal_deadline,
    goal_type,
    is_deleted
  )
  SELECT
    g.id,
    target_month,
    0,
    NULL,
    NULL,
    g.name,
    g.description,
    g.weight,
    g.deadline,
    g.goal_type,
    false
  FROM public.goals g
  JOIN public.employees e ON g.employee_id = e.id
  WHERE e.status = 'active'
  ON CONFLICT (goal_id, month) DO NOTHING;

  -- Criar registros de bônus zerados para todos os colaboradores ativos
  INSERT INTO public.employee_monthly_bonus (employee_id, month, performance_bonus, bonus_description)
  SELECT
    id,
    target_month,
    0,
    NULL
  FROM public.employees
  WHERE status = 'active'
  ON CONFLICT (employee_id, month) DO NOTHING;
END;
$function$;