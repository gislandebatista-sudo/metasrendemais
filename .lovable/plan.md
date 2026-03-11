

# Correção do Ranking: Filtro de Status

## Diagnóstico

A função SQL `get_my_ranking_position` inclui **todos os colaboradores (ativos + inativos)** no cálculo do ranking. Porém, o painel ADM filtra por padrão apenas colaboradores **ativos** (`selectedStatus = 'active'`). Isso causa divergência no `total_participants`:

- **RPC retorna:** posição 11 de **27** (inclui VALESKA, inativa)
- **Admin exibe:** posição 11 de **26** (apenas ativos)

A posição em si está correta (a inativa tem score 0, fica no final), mas o total difere. Para alinhar completamente, a função SQL deve considerar apenas colaboradores ativos, como faz o painel ADM por padrão.

## Solução

Adicionar `WHERE e.status = 'active'` na CTE `scores` da função `get_my_ranking_position`.

## Arquivo a Modificar

1. **Migration SQL** — Recriar `get_my_ranking_position` com filtro `WHERE e.status = 'active'`

```sql
-- Adicionar na CTE scores:
WHERE e.status = 'active'
```

Sem alterações no frontend necessárias. O `RankingTable.tsx` já ordena corretamente (score DESC, name ASC) e filtra ativos por padrão.

