-- =====================================================
-- SISTEMA DE CICLOS MENSAIS INDEPENDENTES
-- =====================================================
-- Este sistema separa as metas (templates permanentes) do progresso mensal,
-- permitindo que cada mês funcione como um ciclo de avaliação independente.

-- 1. Criar tabela de progresso mensal para metas
-- Esta tabela armazena o progresso de cada meta em cada mês
CREATE TABLE public.goal_monthly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  achieved NUMERIC NOT NULL DEFAULT 0, -- Porcentagem atingida neste mês
  delivery_date DATE, -- Data de entrega neste mês
  observations TEXT, -- Observações específicas do mês
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by UUID,
  UNIQUE(goal_id, month) -- Cada meta tem apenas um registro por mês
);

-- 2. Criar tabela de bônus mensal para colaboradores
-- O bônus agora é registrado por mês, não no colaborador diretamente
CREATE TABLE public.employee_monthly_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  performance_bonus NUMERIC NOT NULL DEFAULT 0,
  bonus_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by UUID,
  UNIQUE(employee_id, month) -- Cada colaborador tem apenas um registro de bônus por mês
);

-- 3. Criar tabela para controlar meses ativos/fechados
CREATE TABLE public.evaluation_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL UNIQUE, -- Format: YYYY-MM
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' ou 'closed'
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.goal_monthly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_monthly_bonus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_months ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para goal_monthly_progress
CREATE POLICY "Authenticated users can view goal progress"
ON public.goal_monthly_progress FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert goal progress"
ON public.goal_monthly_progress FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update goal progress"
ON public.goal_monthly_progress FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete goal progress"
ON public.goal_monthly_progress FOR DELETE
USING (is_admin());

-- 6. Políticas RLS para employee_monthly_bonus
CREATE POLICY "Authenticated users can view bonuses"
ON public.employee_monthly_bonus FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert bonuses"
ON public.employee_monthly_bonus FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update bonuses"
ON public.employee_monthly_bonus FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete bonuses"
ON public.employee_monthly_bonus FOR DELETE
USING (is_admin());

-- 7. Políticas RLS para evaluation_months
CREATE POLICY "Authenticated users can view evaluation months"
ON public.evaluation_months FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert evaluation months"
ON public.evaluation_months FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update evaluation months"
ON public.evaluation_months FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete evaluation months"
ON public.evaluation_months FOR DELETE
USING (is_admin());

-- 8. Trigger para atualizar updated_at nas novas tabelas
CREATE TRIGGER update_goal_monthly_progress_updated_at
  BEFORE UPDATE ON public.goal_monthly_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified_by();

CREATE TRIGGER update_employee_monthly_bonus_updated_at
  BEFORE UPDATE ON public.employee_monthly_bonus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified_by();

-- 9. Migrar dados existentes para o novo formato
-- Copiar progresso atual das metas para goal_monthly_progress
INSERT INTO public.goal_monthly_progress (goal_id, month, achieved, delivery_date, observations)
SELECT 
  g.id,
  e.reference_month,
  g.achieved,
  g.delivery_date,
  g.observations
FROM public.goals g
JOIN public.employees e ON g.employee_id = e.id
WHERE g.achieved > 0 OR g.delivery_date IS NOT NULL OR g.observations IS NOT NULL;

-- Copiar bônus atual dos colaboradores para employee_monthly_bonus
INSERT INTO public.employee_monthly_bonus (employee_id, month, performance_bonus, bonus_description)
SELECT 
  id,
  reference_month,
  performance_bonus,
  bonus_description
FROM public.employees
WHERE performance_bonus > 0 OR bonus_description IS NOT NULL;

-- Criar registros de meses de avaliação baseado nos dados existentes
INSERT INTO public.evaluation_months (month, status)
SELECT DISTINCT reference_month, 'active'
FROM public.employees
ON CONFLICT (month) DO NOTHING;

-- 10. Função para inicializar novo mês automaticamente
CREATE OR REPLACE FUNCTION public.initialize_month(target_month VARCHAR(7))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar registro do mês se não existir
  INSERT INTO public.evaluation_months (month, status)
  VALUES (target_month, 'active')
  ON CONFLICT (month) DO NOTHING;
  
  -- Criar registros de progresso zerados para todas as metas ativas
  INSERT INTO public.goal_monthly_progress (goal_id, month, achieved, delivery_date, observations)
  SELECT 
    g.id,
    target_month,
    0, -- Progresso zerado
    NULL,
    NULL
  FROM public.goals g
  JOIN public.employees e ON g.employee_id = e.id
  WHERE e.status = 'active'
  ON CONFLICT (goal_id, month) DO NOTHING;
  
  -- Criar registros de bônus zerados para todos os colaboradores ativos
  INSERT INTO public.employee_monthly_bonus (employee_id, month, performance_bonus, bonus_description)
  SELECT 
    id,
    target_month,
    0, -- Bônus zerado
    NULL
  FROM public.employees
  WHERE status = 'active'
  ON CONFLICT (employee_id, month) DO NOTHING;
END;
$$;

-- 11. Conceder permissão para executar a função
GRANT EXECUTE ON FUNCTION public.initialize_month TO authenticated;