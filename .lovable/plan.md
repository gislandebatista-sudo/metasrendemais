# Painel Individual de Colaboradores com Controle de Acesso

## Visão Geral

Criar um painel individual onde cada colaborador acessa apenas seus próprios dados (metas, porcentagens, gráficos), com login gerenciado pelo ADM. O admin mantém acesso total.

## Mudanças no Banco de Dados

### 1. Adicionar enum 'colaborador' ao app_role

```sql
ALTER TYPE public.app_role ADD VALUE 'colaborador';
```

### 2. Adicionar coluna `user_id` na tabela `employees`

Vincular cada colaborador a um usuário autenticado:

```sql
ALTER TABLE public.employees ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

### 3. Atualizar RLS em `employees` e `goals`

Colaboradores só veem seus próprios dados:

```sql
-- employees: colaborador vê apenas seu registro
CREATE POLICY "Colaborador can view own employee"
ON public.employees FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR user_id = auth.uid()
  )
);

-- goals: colaborador vê apenas metas do seu employee_id
CREATE POLICY "Colaborador can view own goals"
ON public.goals FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin() OR
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  )
);
```

Policies similares para `goal_monthly_progress` e `employee_monthly_bonus`.

### 4. Criar função `is_colaborador()` (security definer)

Para verificar se o user autenticado é colaborador e obter seu employee_id.

## Mudanças no Frontend

### 1. Nova página `/colaborador` — Painel Individual

- Reutiliza `EmployeeProfile` em modo read-only (sem botões de edição)
- Mostra: dados cadastrais, metas macro/setoriais com porcentagens, gráficos de desempenho
- Busca automaticamente o employee vinculado ao `auth.uid()`
- Com acesso a ranking, somente a sua posição e porcentagem, sem acesso a  listagem geral ou exportação

### 2. Roteamento baseado em role

No `App.tsx` / `ProtectedRoute`:

- `admin` → redireciona para `/` (painel administrativo atual)
- `colaborador` → redireciona para `/colaborador` (painel individual)
- `viewer` → mantém comportamento atual (visualização geral)

### 3. Hook `useAuth` — adicionar role 'colaborador'

Atualizar o tipo `UserRole` para incluir `'colaborador'`.

### 4. Gestão de credenciais pelo ADM

Adicionar no painel admin (EmployeeModal ou nova seção):

- Campo para vincular e-mail/senha ao colaborador
- Botão "Criar Acesso" que chama edge function para criar usuário via Supabase Admin API
- Opção de resetar senha
- Opção de ativar/desativar acesso

### 5. Edge Function `manage-employee-auth`

Função backend (usando service_role_key) para:

- Criar usuário (`supabase.auth.admin.createUser`)
- Atribuir role 'colaborador' na tabela `user_roles`
- Vincular `user_id` na tabela `employees`
- Resetar senha (`supabase.auth.admin.updateUserById`)
- Desativar acesso (`ban_duration`)

### 6. Página do Colaborador (`src/pages/ColaboradorDashboard.tsx`)

- Fetch do employee vinculado ao user logado
- Exibe `EmployeeProfile` em modo somente leitura (canEdit=false)
- Inclui: MonthSelector para navegar entre meses
- Mostra gráficos de desempenho individual

## Segurança

- RLS garante isolamento no backend — colaborador nunca acessa dados de outro
- Edge function com service_role_key para criação de usuários (não exposta ao frontend)
- Colaborador não pode criar conta manualmente (signup desabilitado para esse role)
- Validação dupla: frontend (rotas protegidas) + backend (RLS policies)

## Arquivos a Criar/Modificar

1. **Migration SQL** — enum, coluna user_id, RLS policies, função is_colaborador
2. `**supabase/functions/manage-employee-auth/index.ts**` — edge function para CRUD de credenciais
3. `**src/pages/ColaboradorDashboard.tsx**` — painel individual do colaborador
4. `**src/hooks/useAuth.tsx**` — adicionar 'colaborador' ao UserRole
5. `**src/components/ProtectedRoute.tsx**` — roteamento por role
6. `**src/App.tsx**` — nova rota `/colaborador`
7. `**src/components/dashboard/EmployeeModal.tsx**` — seção de gestão de acesso
8. `**supabase/config.toml**` — configurar edge function (verify_jwt)