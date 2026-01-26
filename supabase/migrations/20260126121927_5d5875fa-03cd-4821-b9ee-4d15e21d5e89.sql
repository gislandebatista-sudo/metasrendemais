-- 1. Criar bucket de storage para anexos de metas
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-attachments', 'goal-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar tabela para armazenar referências aos arquivos anexados
CREATE TABLE public.goal_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS na tabela de anexos
ALTER TABLE public.goal_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Policies para goal_attachments - Admins podem fazer tudo
CREATE POLICY "Admins can insert attachments"
  ON public.goal_attachments FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete attachments"
  ON public.goal_attachments FOR DELETE
  USING (is_admin());

-- 5. Policy para SELECT - Admins e Viewers podem visualizar anexos
CREATE POLICY "Authenticated users can view attachments"
  ON public.goal_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. Políticas de Storage para o bucket goal-attachments
-- Permitir upload apenas para admins
CREATE POLICY "Admins can upload goal attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'goal-attachments' 
    AND is_admin()
  );

-- Permitir visualização para todos os usuários autenticados
CREATE POLICY "Authenticated users can view goal attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'goal-attachments' 
    AND auth.uid() IS NOT NULL
  );

-- Permitir deleção apenas para admins
CREATE POLICY "Admins can delete goal attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'goal-attachments' 
    AND is_admin()
  );

-- 7. Atualizar policies de goals para permitir viewers visualizarem
-- Primeiro remover a policy existente
DROP POLICY IF EXISTS "Admins can view all goals" ON public.goals;

-- Criar nova policy que permite admins e viewers visualizarem
CREATE POLICY "Authenticated users can view goals"
  ON public.goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 8. Atualizar policies de employees para permitir viewers visualizarem
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;

CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);