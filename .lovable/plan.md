

# Melhorias no Painel do Colaborador

## Resumo
Atualizar `ColaboradorDashboard.tsx` para incluir: filtragem mensal correta (já parcialmente funcional), posição no ranking, cards de metas em atraso/não entregues, e exportação individual.

## 1. Filtragem por Mês (Ajuste)
O `ColaboradorDashboard` já usa `selectedMonth` e busca `goal_monthly_progress` filtrado pelo mês. O problema atual: mostra metas base mesmo sem snapshot no mês. **Corrigir para mostrar apenas metas com snapshot no mês selecionado** (filtrar `goalsData` para incluir somente as que possuem entrada em `monthlyProgress` com `is_deleted = false`).

**Arquivo:** `src/pages/ColaboradorDashboard.tsx` -- ajustar `mapGoals` para filtrar somente goals com progresso mensal existente e não deletado.

## 2. Posição no Ranking
Buscar todos os colaboradores e suas performances no mês para calcular a posição. Isso deve ser feito via uma query segura -- como o RLS para `colaborador` bloqueia a lista de employees, precisamos de uma **edge function** ou **database function** (security definer) que retorne apenas a posição e pontuação do usuário.

**Abordagem:** Criar uma database function `get_my_ranking_position(target_month varchar)` que:
- Calcula performance de todos os colaboradores ativos no mês
- Retorna apenas: `position`, `total_participants`, `my_score`
- Usa `SECURITY DEFINER` para acessar dados de todos sem expor dados individuais

**Arquivos:**
- **Migration SQL** -- criar função `get_my_ranking_position`
- **`src/pages/ColaboradorDashboard.tsx`** -- chamar a função via `supabase.rpc()` e exibir card com posição

## 3. Cards de Metas em Atraso e Não Entregues
Reutilizar a lógica de `DashboardStatsCards` mas filtrada para o colaborador logado.

**Arquivo:** `src/pages/ColaboradorDashboard.tsx` -- adicionar seção com cards mostrando:
- Quantidade de metas em atraso (com lista detalhada ao clicar)
- Quantidade de metas não entregues (com lista detalhada ao clicar)
- Usar `getGoalStatus`, `getDelayedGoalsCount`, `getNotDeliveredGoalsCount` do `types/employee.ts`
- Reutilizar `GoalDetailsModal` para exibir detalhes

## 4. Exportação Individual (PDF/Excel)
Adaptar a lógica de `ExportTab` para funcionar com um único colaborador.

**Arquivo:** `src/pages/ColaboradorDashboard.tsx` -- adicionar botões de exportação PDF e Excel que:
- Exportam apenas os dados do colaborador logado
- Respeitam o mês selecionado
- Incluem: metas, percentuais, status, posição no ranking
- Usar `jspdf` e `xlsx` (já instalados)

## 5. Ranking via Database Function

```sql
CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month varchar)
RETURNS TABLE(position bigint, total_participants bigint, my_score numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_employee_id uuid;
  my_perf numeric;
BEGIN
  SELECT id INTO my_employee_id FROM employees WHERE user_id = auth.uid();
  IF my_employee_id IS NULL THEN RETURN; END IF;

  -- Calculate my score from monthly progress
  SELECT COALESCE(SUM(LEAST(gmp.achieved, gmp.goal_weight)), 0)
    + COALESCE((SELECT emb.performance_bonus FROM employee_monthly_bonus emb 
                WHERE emb.employee_id = my_employee_id AND emb.month = target_month), 0)
  INTO my_perf
  FROM goal_monthly_progress gmp
  JOIN goals g ON gmp.goal_id = g.id
  WHERE g.employee_id = my_employee_id AND gmp.month = target_month AND gmp.is_deleted = false;

  -- Count how many active employees score higher
  RETURN QUERY
  WITH scores AS (
    SELECT e.id as eid,
      LEAST(
        COALESCE(SUM(LEAST(gmp.achieved, gmp.goal_weight)), 0)
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
```

## Arquivos a Modificar
1. **Migration SQL** -- `get_my_ranking_position` function
2. **`src/pages/ColaboradorDashboard.tsx`** -- reescrever com: ranking card, stats cards (atraso/não entregues), export buttons, filtragem mensal corrigida

## Segurança
- A function `get_my_ranking_position` usa `auth.uid()` internamente, impossibilitando manipulação
- RLS existente já garante isolamento dos dados de metas/bonus
- Exportação usa apenas dados já carregados no frontend (filtrados por RLS)

