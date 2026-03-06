

# Correção do Ranking + Controle de Publicação ADM→Colaborador

## Problema 1: Ranking não exibe posição correta

O `ColaboradorDashboard` já chama `get_my_ranking_position` via RPC e exibe o resultado. O problema provavelmente está na função SQL: ela calcula `SUM(LEAST(achieved, goal_weight))` mas o ranking do painel ADM (`RankingTable`) usa `calculateTotalPerformance` que soma `LEAST(achieved, weight)` + bônus, com cap de 105%. Preciso verificar se a lógica está de fato alinhada e se há dados retornados. Vou garantir que a função SQL esteja sincronizada com a lógica do frontend.

**Ação:** Revisar e corrigir a função `get_my_ranking_position` para alinhar exatamente com o cálculo do `calculateTotalPerformance` usado no ranking do ADM (que soma `LEAST(achieved, weight)` para cada meta + bônus, cap 105%).

## Problema 2: Controle de Publicação (Draft vs Published)

Implementar um sistema onde as edições do ADM ficam em estado "rascunho" até que ele clique "Publicar". Colaboradores só veem dados "publicados".

### Abordagem no Banco de Dados

Adicionar coluna `is_published` (boolean, default `false`) à tabela `evaluation_months`. Quando o ADM edita dados de um mês, eles ficam salvos normalmente. O colaborador, ao buscar dados, só vê meses onde `is_published = true`.

- **Nova coluna:** `ALTER TABLE evaluation_months ADD COLUMN is_published boolean NOT NULL DEFAULT false;`
- **RLS update:** A policy de SELECT em `goal_monthly_progress` e `employee_monthly_bonus` para colaboradores deve verificar que o mês correspondente está publicado.

### Abordagem no Frontend

1. **Painel ADM (`Index.tsx` / `Header.tsx`):** Adicionar botão "Publicar Mês" visível apenas para admins. Ao clicar, atualiza `is_published = true` no `evaluation_months` para o mês selecionado. Mostrar badge indicando se o mês está publicado ou em rascunho.

2. **Painel Colaborador (`ColaboradorDashboard.tsx`):** Ao buscar dados, verificar se o mês está publicado. Se não estiver, exibir mensagem "Dados ainda não publicados para este mês".

### Arquivos a Modificar

1. **Migration SQL** — adicionar `is_published` à `evaluation_months`, criar função `is_month_published(month)` security definer, atualizar RLS de `goal_monthly_progress` e `employee_monthly_bonus` para colaboradores verificarem publicação.

2. **`src/pages/ColaboradorDashboard.tsx`** — verificar `is_published` antes de exibir dados; mostrar mensagem quando não publicado.

3. **`src/pages/Index.tsx`** — adicionar botão "Publicar Mês" e badge de status de publicação.

4. **`src/hooks/useEvaluationMonths.tsx`** — adicionar função `publishMonth` e estado `isPublished`.

5. **Função `get_my_ranking_position`** — corrigir cálculo para alinhar com a lógica do ranking do ADM.

### Detalhes Técnicos

**Migration SQL:**
```sql
-- Add publication control
ALTER TABLE public.evaluation_months 
  ADD COLUMN is_published boolean NOT NULL DEFAULT false;

-- Security definer function to check publication
CREATE OR REPLACE FUNCTION public.is_month_published(target_month varchar)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM evaluation_months 
    WHERE month = target_month AND is_published = true
  );
$$;

-- Update RLS: colaborador can only view published month data
-- Drop and recreate goal_monthly_progress SELECT policy
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

-- Same for employee_monthly_bonus
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
```

**Ranking fix:** Atualizar `get_my_ranking_position` para usar a mesma lógica: `SUM(LEAST(achieved, goal_weight))` + bônus, cap 105%. A função atual já faz isso — investigar se o problema é que o mês não foi inicializado (sem snapshots). Adicionar verificação de publicação na função para colaboradores.

**Botão Publicar no ADM:**
- Localizado no Header ou na área de badges de status do mês
- Texto: "Publicar para Colaboradores"
- Ao clicar: `UPDATE evaluation_months SET is_published = true WHERE month = selectedMonth`
- Badge visual: "Rascunho" (amarelo) ou "Publicado" (verde)
- Possibilidade de "Despublicar" para voltar ao rascunho

