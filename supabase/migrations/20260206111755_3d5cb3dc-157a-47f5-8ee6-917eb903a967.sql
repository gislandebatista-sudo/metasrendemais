-- Criar view segura para colaboradores (mascara dados sensíveis para não-administradores)
CREATE OR REPLACE VIEW public.employees_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  photo,
  role,
  sector,
  reference_month,
  status,
  created_at,
  updated_at,
  last_modified_by,
  created_by,
  -- Mascarar dados de bônus para não-administradores
  CASE WHEN is_admin() THEN performance_bonus ELSE 0 END as performance_bonus,
  CASE WHEN is_admin() THEN bonus_description ELSE NULL END as bonus_description
FROM public.employees;