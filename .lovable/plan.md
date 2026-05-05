## Diagnóstico

Após inspecionar os hooks de dados, RLS e componentes, identifiquei várias causas para o carregamento lento e atualizações pesadas. A app não é "lenta de banco" — são duplicações de fetch, loops sutis em `useEffect` e ausência de cache/memoização.

### Problemas encontrados

1. **`useEvaluationMonths` é chamado duas vezes** (em `Index.tsx` e em `MonthSelector.tsx`). Cada instância faz seu próprio `fetch` em `evaluation_months` e roda seu próprio efeito de "auto-inicializar mês". Resultado: ~2× o tráfego de rede e estado dessincronizado.

2. **Loop potencial no auto-init de mês**: o `useEffect` depende de `evaluationMonths` (referência muda a cada fetch) e de `initializeMonth` (recriado quando `fetchEvaluationMonths` muda). Em alguns cenários re-dispara `initialize_month` repetidamente.

3. **`useAuth` busca role duas vezes** no boot: `onAuthStateChange` (evento `INITIAL_SESSION`) **e** `getSession().then(...)` chamam `fetchUserRole` para o mesmo usuário.

4. **`useSectors` faz uma query extra** em `employees` só para extrair setores distintos — dado já presente no array `employees` que `useMonthlyEmployees` retorna.

5. **Sem cache entre trocas de mês**: ao alternar mês, todo o pipeline (4 queries paralelas + remontagem) roda do zero. React Query não está sendo usado para esses dados (só está provider montado).

6. **Re-renders pesados nas edições**: ao editar uma meta, `setEmployees` cria um novo array → `MainStatsCards`, `RankingTable`, `PerformanceCharts`, `DashboardStatsCards` recalculam tudo, mesmo sem `React.memo`.

7. **RLS lenta em `goal_monthly_progress`**: política usa `IN (SELECT ... FROM goals JOIN employees ...)` por linha. Com 1.830 linhas a checagem pesa. Faltam índices em `goals.employee_id`, `goal_monthly_progress.goal_id` e `goal_monthly_progress.month`.

## Correções propostas

### 1. Compartilhar estado de meses via Context
Transformar `useEvaluationMonths` em provider (`EvaluationMonthsProvider`) montado uma única vez em `App.tsx`. `Index.tsx` e `MonthSelector.tsx` consomem o mesmo estado → elimina fetch duplicado e auto-init duplicado.

### 2. Estabilizar o auto-init de mês
Remover `evaluationMonths` e `initializeMonth` das deps do effect; usar `useRef` para marcar "já tentei inicializar este mês" evitando re-disparos.

### 3. Auth: evitar fetch duplicado de role
No `useAuth`, ignorar o `INITIAL_SESSION` do `onAuthStateChange` (já tratado pelo `getSession`), ou usar uma flag `initialized`.

### 4. Derivar setores do array de employees
Eliminar `useSectors`. Em `Index.tsx`, calcular `sectors` com `useMemo(() => [...new Set(employees.map(e => e.sector))], [employees])`. -1 round-trip no boot.

### 5. Cache via React Query
Migrar `fetchEmployees` e `fetchEvaluationMonths` para `useQuery` com `staleTime: 30s`. Ao trocar mês para um já visto, retorna instantâneo do cache. Mutations (`saveEmployee`, `updateGoal`, `updateBonus`) atualizam o cache via `setQueryData` (mantém o padrão atual de não-refetch).

### 6. Memoizar componentes pesados
Envolver `MainStatsCards`, `DashboardStatsCards`, `PerformanceCharts`, `RankingTable`, `GoalManagementTable` em `React.memo`. Garante que edição de bônus/meta de um colaborador não recompute charts inteiros desnecessariamente.

### 7. Índices no banco para acelerar RLS e joins
Migration adicionando (se não existirem):
```sql
CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON public.goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_gmp_goal_id ON public.goal_monthly_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_gmp_month ON public.goal_monthly_progress(month);
CREATE INDEX IF NOT EXISTS idx_gmp_month_deleted ON public.goal_monthly_progress(month, is_deleted);
CREATE INDEX IF NOT EXISTS idx_emb_employee_month ON public.employee_monthly_bonus(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
```

### 8. Reduzir colunas selecionadas
`useMonthlyEmployees` faz `select('*')` em `goal_monthly_progress` (1.830 linhas, ~15 colunas). Selecionar somente colunas usadas reduz payload em ~40%.

## Arquivos afetados

- `src/hooks/useAuth.tsx` — flag de inicialização
- `src/hooks/useEvaluationMonths.tsx` — vira provider + ref de auto-init
- `src/hooks/useMonthlyEmployees.tsx` — React Query + select enxuto
- `src/hooks/useSectors.tsx` — removido (ou esvaziado)
- `src/App.tsx` — adicionar `EvaluationMonthsProvider`
- `src/pages/Index.tsx` — derivar `sectors` de `employees`; usar provider
- `src/components/dashboard/MonthSelector.tsx` — consumir provider
- `src/components/dashboard/{MainStatsCards,DashboardStatsCards,PerformanceCharts,RankingTable,GoalManagementTable}.tsx` — `React.memo`
- Nova migration SQL com os índices

## Garantias

- **Zero mudança funcional**: padrão "Salvar Alterações" + sync local sem refetch é preservado.
- **RLS intacta**: nenhuma policy alterada — só índices.
- **Visual inalterado**: nenhum token/CSS tocado.
- **Compatibilidade**: `useEvaluationMonths()` continua exportando a mesma API (agora via context).

## Resultado esperado

- Boot da página: ~50% menos requests (de ~6 para ~3-4 queries) e zero duplicação de role/months.
- Troca de mês já visitado: instantânea (cache).
- Edição de meta/bônus: sem re-render de charts/tabelas não relacionadas.
- Queries DB: tempo de RLS reduzido com os índices.
