

# Correções: Exclusão de Perfis, Ocultação de % e Ranking

## 1. Sincronização de Exclusão de Perfis

**Problema:** Quando o admin exclui um colaborador, o `user_id` é deletado junto com o registro em `employees`, mas o usuário auth e o role `colaborador` permanecem. Se o admin recriar o colaborador (mesmo nome), o `user_id` será `null`, permitindo novo cadastro.

**Solução:** Atualizar a edge function `self-register` e o `deleteEmployee` no hook `useEmployees.tsx` / `useMonthlyEmployees.tsx`:
- Ao excluir um colaborador, chamar a edge function para também deletar o auth user e limpar o `user_roles`
- Adicionar uma nova action `delete_employee_auth` na edge function `self-register` que recebe o `employee_id`, busca o `user_id` vinculado e deleta o auth user via `supabaseAdmin.auth.admin.deleteUser()`
- Isso garante que o nome volta a ficar disponível na lista de cadastro automaticamente (pois `user_id` será `null` ou o employee será recriado sem vínculo)

**Arquivos:**
- `supabase/functions/self-register/index.ts` — nova action `delete_employee_auth`
- `src/hooks/useEmployees.tsx` e `src/hooks/useMonthlyEmployees.tsx` — antes de deletar o employee, chamar a edge function para limpar o auth user

## 2. Ocultação Completa de Porcentagens no Painel do Colaborador

**Problema:** `EmployeeProfile.tsx` não usa `usePercentageVisibility`. Todas as `formatPercent()` dentro dele continuam visíveis quando o toggle está ativo.

**Solução:** Adicionar `usePercentageVisibility` ao `EmployeeProfile.tsx` e substituir todas as exibições de porcentagem por versões condicionais:
- `formatPercent(totalPerformance)%` → `hidePercentages ? '•••' : formatPercent(totalPerformance) + '%'`
- Aplicar em: Total Ranking, Metas Macro %, Metas Setoriais %, cada meta individual (achieved, contribuição), bônus %
- Manter barras de progresso visíveis (só ocultar números)

**Arquivo:** `src/components/dashboard/EmployeeProfile.tsx`

## 3. Correção do Ranking

**Problema:** A função SQL `get_my_ranking_position` pode divergir do ranking ADM. O ranking ADM usa `calculateTotalPerformance` no frontend que faz `SUM(LEAST(achieved, weight)) + LEAST(bonus, 5)`, cap 105%. A função SQL deve fazer exatamente o mesmo.

**Diagnóstico adicional:** Vou verificar se o `useMonthlyEmployees` (usado no painel ADM com mês selecionado) calcula da mesma forma. O ranking ADM usa dados do `goal_monthly_progress` enquanto a função SQL também usa. A divergência pode estar em:
- Tratamento de `NULL` values no `goal_weight`
- Filtro de employees (ativos vs todos)

**Solução:** Reescrever `get_my_ranking_position` para usar exatamente:
```sql
score = LEAST(
  SUM(CASE WHEN goal_weight > 0 THEN LEAST(achieved, goal_weight) ELSE 0 END)
  + LEAST(COALESCE(bonus, 0), 5),
  105
)
```
E incluir TODOS os employees (sem filtro de status), igual ao `RankingTable.tsx` que recebe `employees` sem filtro de status.

**Arquivo:** Nova migration SQL para recriar a função

## Arquivos a Modificar

1. **`supabase/functions/self-register/index.ts`** — nova action `delete_employee_auth`
2. **`src/hooks/useEmployees.tsx`** — chamar edge function ao deletar employee
3. **`src/hooks/useMonthlyEmployees.tsx`** — idem
4. **`src/components/dashboard/EmployeeProfile.tsx`** — adicionar masking de porcentagens
5. **Migration SQL** — recriar `get_my_ranking_position` corrigida

