
-- 1. Remover policies inseguras existentes
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.goals;

-- 2. Criar policies seguras para employees (somente admins podem visualizar)
CREATE POLICY "Admins can view all employees"
  ON public.employees FOR SELECT
  USING (is_admin());

-- 3. Criar policies seguras para goals (somente admins podem visualizar)
CREATE POLICY "Admins can view all goals"
  ON public.goals FOR SELECT
  USING (is_admin());

-- 4. Remover policies de SELECT existentes na tabela profiles para recriar corretamente
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 5. Criar policy PERMISSIVE para profiles (usuário vê próprio perfil OU admin vê todos)
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- 6. Garantir que admins podem atualizar qualquer perfil
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (is_admin());

-- 7. Remover policy de gerenciamento duplicada se existir
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 8. Criar policy de UPDATE para user_roles (somente admins podem alterar roles)
CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE
  USING (is_admin());

-- 9. Criar policy de DELETE para user_roles (somente admins podem remover roles)
CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE
  USING (is_admin());
