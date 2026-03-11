

# Correção do Ranking: Diagnóstico e Solução

## Causa Raiz Identificada

O problema é uma **divergência fundamental na lógica de posicionamento** entre o painel ADM e a função SQL do colaborador.

**Dados no banco (mês 2026-01):** 25 de 27 colaboradores têm score = 105 (pontuação máxima). Apenas 2 estão abaixo.

**Painel ADM (`RankingTable.tsx`):** Ordena por score DESC e usa o **índice do array** como posição (1, 2, 3... 25), mesmo quando os scores são iguais. Não há desempate — a ordem é arbitrária entre empates.

**Função SQL (`get_my_ranking_position`):** Usa lógica de RANK: `COUNT(scores > my_score) + 1`. Isso faz com que **todos os 25 colaboradores com score 105 apareçam como "1º lugar"**, o que não corresponde ao que o admin vê.

Resultado: Um colaborador que aparece como 5º no admin vê "1º lugar" no seu painel individual.

## Solução

1. **Adicionar desempate determinístico em ambos os lados** — ordenar por score DESC, depois por nome ASC. Isso garante que a mesma ordem apareça no admin e no SQL.

2. **Reescrever a função SQL** para usar `ROW_NUMBER()` com o mesmo critério de ordenação, em vez de `COUNT(score > x) + 1`.

3. **Atualizar o `RankingTable.tsx`** para incluir o desempate por nome.

## Arquivos a Modificar

1. **Migration SQL** — Recriar `get_my_ranking_position` usando `ROW_NUMBER() OVER (ORDER BY score DESC, name ASC)`.

2. **`src/components/dashboard/RankingTable.tsx`** (linha 40) — Alterar o `.sort()` para incluir desempate por nome:
   ```typescript
   .sort((a, b) => b.goalAchieved - a.goalAchieved || a.name.localeCompare(b.name));
   ```

## Detalhes Técnicos

**Nova função SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_my_ranking_position(target_month varchar)
RETURNS TABLE(rank_position bigint, total_participants bigint, my_score numeric)
...
  WITH scores AS (
    SELECT e.id as eid, e.name as ename,
      LEAST(SUM(...) + LEAST(bonus, 5), 105) as score
    FROM employees e ...
    GROUP BY e.id, e.name
  ),
  ranked AS (
    SELECT eid, ename, score,
      ROW_NUMBER() OVER (ORDER BY score DESC, ename ASC) as rn
    FROM scores
  )
  SELECT rn, (SELECT COUNT(*) FROM scores), score
  FROM ranked WHERE eid = my_employee_id;
```

**RankingTable.tsx (linha 40):**
```typescript
.sort((a, b) => b.goalAchieved - a.goalAchieved || a.name.localeCompare(b.name));
```

