

# Tabela de Gestão de Metas Macro na Aba Ranking

## Resumo

Adicionar uma tabela administrativa na aba Ranking para gerenciar metas macro de forma centralizada: criar, editar nome, excluir e associar a todos os funcionários ativos. Apenas metas macro, conforme solicitado.

## Componente Novo: `GoalManagementTable.tsx`

Tabela visível apenas para admins, posicionada acima dos filtros na aba Ranking, com:

- Lista de metas macro únicas (agrupadas por nome a partir dos `goals` existentes)
- Formulário inline para adicionar nova meta macro (nome, peso, prazo)
- Para cada meta:
  - **Editar** — editar nome da meta (atualiza `goals.name` + `goal_monthly_progress.goal_name` de todos os registros com esse nome)
  - **Excluir** — remove a meta de todos os funcionários (deleta da tabela `goals` e `goal_monthly_progress`)
  - **Associar a Todos** — cria a meta para todos os funcionários ativos que ainda não a possuem, incluindo snapshot em `goal_monthly_progress` para o mês selecionado

## Fluxo "Associar a Todos"

1. Buscar employees ativos
2. Para cada um que não tem uma meta com esse nome, inserir em `goals` (employee_id, name, weight, deadline, goal_type='macro')
3. Criar snapshot em `goal_monthly_progress` para o mês atual
4. Recarregar dados

## Edição de Nome de Meta Já Associada

No `EmployeeProfile.tsx`, adicionar ícone de lápis ao lado do nome de cada meta (macro e setorial). Ao clicar:
- Input inline para editar o nome
- Ao confirmar, atualiza `goals.name` e `goal_monthly_progress.goal_name` correspondente

## Performance

Paralelizar as 4 queries sequenciais em `useMonthlyEmployees.tsx` com `Promise.all`.

## Arquivos

1. **`src/components/dashboard/GoalManagementTable.tsx`** (novo) — tabela de gestão de metas macro
2. **`src/pages/Index.tsx`** — incluir GoalManagementTable na aba Ranking (admin only), passar selectedMonth e callback de refresh
3. **`src/components/dashboard/EmployeeProfile.tsx`** — botão editar nome inline nas metas
4. **`src/hooks/useMonthlyEmployees.tsx`** — `Promise.all` para queries paralelas, expor função `refreshEmployees`

