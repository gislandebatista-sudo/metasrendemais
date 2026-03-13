

# Composição de Notas por Meta — Plano de Implementação

## Resumo

Criar um sistema que permite ao administrador cadastrar os critérios/notas que compõem a porcentagem final de cada meta. Ao clicar em uma meta, será exibido o detalhamento de como aquela porcentagem foi formada.

## 1. Nova Tabela no Banco de Dados

Criar tabela `goal_score_criteria` para armazenar os critérios de composição vinculados ao progresso mensal de cada meta:

```text
goal_score_criteria
├── id (uuid, PK)
├── goal_monthly_progress_id (uuid, FK → goal_monthly_progress.id)
├── name (text)           -- Ex: "Nota Avaliação", "Indicador X"
├── value (numeric)        -- Nota/valor atribuído
├── max_value (numeric)    -- Valor máximo possível (opcional)
├── sort_order (integer)   -- Ordem de exibição
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

RLS: Admins CRUD total. Colaboradores podem visualizar (SELECT) apenas critérios de suas próprias metas em meses publicados.

## 2. Fluxo de Dados

```text
Admin edita meta no EmployeeProfile
  → Clica no botão "Composição" na meta
  → Abre modal GoalCriteriaModal
  → Adiciona/edita critérios (nome + valor + valor máximo)
  → Salva → Persiste em goal_score_criteria via goal_monthly_progress_id

Colaborador visualiza meta no ColaboradorDashboard
  → Clica na meta
  → Abre mesmo modal em modo leitura
  → Vê a lista de critérios que compõem a porcentagem
```

## 3. Componentes a Criar/Modificar

**Novo componente:** `src/components/dashboard/GoalCriteriaModal.tsx`
- Modal com Dialog que exibe/edita os critérios de composição de uma meta
- Modo edição (admin): campos para nome, valor, valor máximo, botão adicionar/remover
- Modo leitura (colaborador): tabela simples mostrando nome e valor de cada critério
- Exibe o total calculado dos critérios

**Modificar:** `src/components/dashboard/EmployeeProfile.tsx`
- Adicionar botão "Composição" ao lado do botão "Observações" em cada meta
- Ao clicar, abre o GoalCriteriaModal passando o goal_monthly_progress_id

**Modificar:** `src/pages/ColaboradorDashboard.tsx`
- Nas metas listadas, tornar cada meta clicável
- Ao clicar, abre o GoalCriteriaModal em modo leitura
- Buscar os critérios junto com os dados da meta

**Modificar:** `src/hooks/useMonthlyEmployees.tsx`
- Incluir busca dos critérios (goal_score_criteria) ao carregar progresso mensal
- Expor dados de critérios no tipo Goal ou via lookup separado

**Modificar:** `src/types/employee.ts`
- Adicionar interface `GoalCriteria` com campos: id, name, value, maxValue, sortOrder
- Adicionar campo opcional `criteria?: GoalCriteria[]` na interface `Goal`

## 4. Exemplo Visual

Ao clicar em "META DNA = 4%":

```text
┌─────────────────────────────────────┐
│  Composição - META DNA (4%)         │
│─────────────────────────────────────│
│  Critério              Nota   Máx   │
│  ─────────────────────────────────  │
│  Avaliação Liderança   1,5    2,0   │
│  Indicador Qualidade   1,0    1,5   │
│  Presença Reuniões     1,5    1,5   │
│  ─────────────────────────────────  │
│  Total                 4,0    5,0   │
└─────────────────────────────────────┘
```

## 5. Ordem de Execução

1. Migration SQL — criar tabela + RLS policies
2. Atualizar `src/types/employee.ts` com interface GoalCriteria
3. Criar `GoalCriteriaModal.tsx`
4. Modificar `EmployeeProfile.tsx` — botão "Composição" no admin
5. Modificar `ColaboradorDashboard.tsx` — meta clicável com modal leitura
6. Atualizar hooks para buscar/salvar critérios

