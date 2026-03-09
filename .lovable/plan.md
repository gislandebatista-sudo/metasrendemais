

# Correção do Ranking + Casas Decimais na Média

## Diagnóstico

### 1. Ranking incorreto
A função SQL `get_my_ranking_position` filtra apenas `WHERE e.status = 'active'`, mas o ranking do painel ADM (`RankingTable.tsx`) inclui **todos os colaboradores** (ativos e inativos) na ordenação. Isso causa divergência na posição.

Além disso, a função SQL não limita o bônus a 5% (`Math.min(performanceBonus, 5)`) como faz o frontend em `calculateTotalPerformance`.

**Correção:** Atualizar a função SQL para:
- Remover filtro `WHERE e.status = 'active'` (incluir todos como no ranking ADM)
- Aplicar `LEAST(bonus, 5)` no cálculo do bônus

### 2. Média de Desempenho — casas decimais
Em `MainStatsCards.tsx` linha 30, `formatPercent(averagePerformance)` exibe todas as casas decimais. Precisa exibir apenas 2 casas decimais, **somente nesse campo**.

**Correção:** Usar `.toFixed(2)` com vírgula apenas para a Média de Desempenho, sem alterar `formatPercent` global.

## Arquivos a Modificar

1. **Migration SQL** — Recriar `get_my_ranking_position` removendo filtro de status e adicionando cap de bônus
2. **`src/components/dashboard/MainStatsCards.tsx`** — Formatar Média de Desempenho com 2 casas decimais

## Detalhes Técnicos

**SQL (migration):**
```sql
-- Fix: include all employees (not just active) and cap bonus at 5
CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month varchar)
...
  -- Remove: WHERE e.status = 'active'
  -- Add: LEAST(emb.performance_bonus, 5) instead of emb.performance_bonus
```

**MainStatsCards.tsx (linha 30):**
```typescript
value: `${averagePerformance.toFixed(2).replace('.', ',')}%`,
```

