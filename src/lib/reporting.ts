import {
  Employee,
  Goal,
  getGoalStatus,
  calculateGoalsPerformance,
  calculateTotalPerformance,
  getTotalGoalsWeight,
  getDelayedGoalsCount,
  getNotDeliveredGoalsCount,
} from '@/types/employee';

// ============================================================
// Performance bands
// ============================================================

export type PerformanceBand = 'excellent' | 'satisfactory' | 'attention' | 'critical';

export const PERFORMANCE_BAND_LABEL: Record<PerformanceBand, string> = {
  excellent: '≥ 100%',
  satisfactory: '95% – 99,99%',
  attention: '90% – 94,99%',
  critical: '< 90%',
};

export const PERFORMANCE_BAND_DESCRIPTION: Record<PerformanceBand, string> = {
  excellent: 'Superou ou atingiu integralmente',
  satisfactory: 'Desempenho satisfatório',
  attention: 'Atenção',
  critical: 'Desempenho crítico',
};

export const PERFORMANCE_BAND_COLOR: Record<PerformanceBand, string> = {
  excellent: '#16a34a', // green
  satisfactory: '#3b82f6', // blue
  attention: '#f59e0b', // amber
  critical: '#dc2626', // red
};

export function getPerformanceBand(value: number): PerformanceBand {
  if (value >= 100) return 'excellent';
  if (value >= 95) return 'satisfactory';
  if (value >= 90) return 'attention';
  return 'critical';
}

// ============================================================
// Overall employee status (highest criticality wins)
// ============================================================

export type OverallStatus = 'excellent' | 'satisfactory' | 'attention' | 'critical';

export const OVERALL_STATUS_LABEL: Record<OverallStatus, string> = {
  excellent: 'Excelente',
  satisfactory: 'Satisfatório',
  attention: 'Atenção',
  critical: 'Crítico',
};

export const OVERALL_STATUS_COLOR: Record<OverallStatus, string> = {
  excellent: '#16a34a',
  satisfactory: '#3b82f6',
  attention: '#f59e0b',
  critical: '#dc2626',
};

export function getOverallStatus(emp: Employee): OverallStatus {
  const perf = calculateTotalPerformance(emp);
  const delayed = getDelayedGoalsCount(emp);
  const notDelivered = getNotDeliveredGoalsCount(emp);

  // Critical wins
  if (perf < 90 || notDelivered > 0) return 'critical';
  if (perf < 95 || delayed > 0) return 'attention';
  if (perf < 100) return 'satisfactory';
  // perf >= 100 & no delays & no not-delivered
  return 'excellent';
}

// ============================================================
// Goal counting helpers (respect "still-within-deadline" rule)
// ============================================================

function isOverdue(deadline: string): boolean {
  if (!deadline) return false;
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return false;
  const deadlineDate = new Date(y, m - 1, d, 23, 59, 59);
  return new Date() > deadlineDate;
}

export interface GoalCounts {
  total: number; // total goals (excluding weight=0 informational? — include all)
  early: number;
  onTime: number;
  late: number;
  notDelivered: number; // overdue AND no delivery date
  pending: number; // not delivered but still within deadline
  dueInPeriod: number; // delivered + notDelivered (not counting pending)
}

export function countGoals(goals: Goal[]): GoalCounts {
  const counts: GoalCounts = {
    total: goals.length,
    early: 0,
    onTime: 0,
    late: 0,
    notDelivered: 0,
    pending: 0,
    dueInPeriod: 0,
  };
  for (const g of goals) {
    if (g.deliveryDate) {
      const s = getGoalStatus(g.deadline, g.deliveryDate);
      if (s === 'early') counts.early++;
      else if (s === 'on_time') counts.onTime++;
      else if (s === 'late') counts.late++;
    } else if (isOverdue(g.deadline)) {
      counts.notDelivered++;
    } else {
      counts.pending++;
    }
  }
  counts.dueInPeriod = counts.early + counts.onTime + counts.late + counts.notDelivered;
  return counts;
}

export function allEmployeeGoals(emp: Employee): Goal[] {
  return [...emp.macroGoals, ...emp.sectoralGoals];
}

// ============================================================
// Rates
// ============================================================

/**
 * Taxa de pontualidade = (antecipadas + no prazo) / total entregues × 100
 * Total entregues = early + onTime + late (excludes not-delivered and pending)
 */
export function getPunctualityRate(counts: GoalCounts): number | null {
  const delivered = counts.early + counts.onTime + counts.late;
  if (delivered === 0) return null;
  return ((counts.early + counts.onTime) / delivered) * 100;
}

/**
 * Taxa de cumprimento = (early + onTime + late) / total vencidas no período × 100
 */
export function getFulfillmentRate(counts: GoalCounts): number | null {
  if (counts.dueInPeriod === 0) return null;
  const delivered = counts.early + counts.onTime + counts.late;
  return (delivered / counts.dueInPeriod) * 100;
}

// ============================================================
// Formatting
// ============================================================

/**
 * Format with up to 3 decimals, trimming trailing zeros. Uses BR locale (comma).
 */
export function formatSmartPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Não informado';
  const rounded = Math.round(value * 1000) / 1000;
  const str = rounded.toString();
  return str.replace('.', ',');
}

export function formatMaybe(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Não informado';
  return `${formatSmartPercent(value)}${suffix}`;
}

// ============================================================
// Ranking (with deterministic tiebreaker)
// ============================================================

export interface RankedEmployee {
  employee: Employee;
  position: number;
  totalPerformance: number;
  macroPerformance: number;
  sectoralPerformance: number;
  counts: GoalCounts;
  status: OverallStatus;
  band: PerformanceBand;
  punctuality: number | null;
  fulfillment: number | null;
}

export function rankEmployees(employees: Employee[]): RankedEmployee[] {
  const enriched = employees.map((emp) => {
    const totalPerformance = calculateTotalPerformance(emp);
    const counts = countGoals(allEmployeeGoals(emp));
    return {
      employee: emp,
      totalPerformance,
      macroPerformance: calculateGoalsPerformance(emp.macroGoals),
      sectoralPerformance: calculateGoalsPerformance(emp.sectoralGoals),
      counts,
      status: getOverallStatus(emp),
      band: getPerformanceBand(totalPerformance),
      punctuality: getPunctualityRate(counts),
      fulfillment: getFulfillmentRate(counts),
    };
  });
  enriched.sort((a, b) => {
    if (b.totalPerformance !== a.totalPerformance) return b.totalPerformance - a.totalPerformance;
    return a.employee.name.localeCompare(b.employee.name, 'pt-BR');
  });
  return enriched.map((r, i) => ({ ...r, position: i + 1 }));
}

// ============================================================
// Executive summary
// ============================================================

export interface ExecutiveSummary {
  totalEmployees: number;
  activeEmployees: number;
  averagePerformance: number | null;
  bestPerformance: number | null;
  worstPerformance: number | null;
  bandCounts: Record<PerformanceBand, number>;
  bandPercents: Record<PerformanceBand, number>;
  totalGoals: number;
  earlyGoals: number;
  onTimeGoals: number;
  lateGoals: number;
  notDeliveredGoals: number;
  overallPunctuality: number | null;
  overallFulfillment: number | null;
}

export function computeExecutiveSummary(employees: Employee[]): ExecutiveSummary {
  const active = employees.filter((e) => e.status === 'active');
  const perfs = active.map((e) => calculateTotalPerformance(e));

  const bandCounts: Record<PerformanceBand, number> = {
    excellent: 0,
    satisfactory: 0,
    attention: 0,
    critical: 0,
  };
  for (const p of perfs) bandCounts[getPerformanceBand(p)]++;

  const bandPercents: Record<PerformanceBand, number> = {
    excellent: 0,
    satisfactory: 0,
    attention: 0,
    critical: 0,
  };
  const totalActive = active.length || 1;
  (Object.keys(bandCounts) as PerformanceBand[]).forEach((b) => {
    bandPercents[b] = (bandCounts[b] / totalActive) * 100;
  });

  // Aggregate goal counts across ALL employees included in the filter
  const aggregate: GoalCounts = {
    total: 0,
    early: 0,
    onTime: 0,
    late: 0,
    notDelivered: 0,
    pending: 0,
    dueInPeriod: 0,
  };
  for (const emp of employees) {
    const c = countGoals(allEmployeeGoals(emp));
    aggregate.total += c.total;
    aggregate.early += c.early;
    aggregate.onTime += c.onTime;
    aggregate.late += c.late;
    aggregate.notDelivered += c.notDelivered;
    aggregate.pending += c.pending;
    aggregate.dueInPeriod += c.dueInPeriod;
  }

  return {
    totalEmployees: employees.length,
    activeEmployees: active.length,
    averagePerformance: perfs.length ? perfs.reduce((a, b) => a + b, 0) / perfs.length : null,
    bestPerformance: perfs.length ? Math.max(...perfs) : null,
    worstPerformance: perfs.length ? Math.min(...perfs) : null,
    bandCounts,
    bandPercents,
    totalGoals: aggregate.total,
    earlyGoals: aggregate.early,
    onTimeGoals: aggregate.onTime,
    lateGoals: aggregate.late,
    notDeliveredGoals: aggregate.notDelivered,
    overallPunctuality: getPunctualityRate(aggregate),
    overallFulfillment: getFulfillmentRate(aggregate),
  };
}

// ============================================================
// Sector comparison
// ============================================================

export interface SectorSummary {
  sector: string;
  employeeCount: number;
  averagePerformance: number | null;
  bestPerformance: number | null;
  worstPerformance: number | null;
  averageMacro: number | null;
  averageSectoral: number | null;
  delayedGoals: number;
  notDeliveredGoals: number;
  punctuality: number | null;
  status: OverallStatus;
}

export function computeSectorSummaries(employees: Employee[]): SectorSummary[] {
  const bySector = new Map<string, Employee[]>();
  for (const emp of employees) {
    const key = emp.sector || 'Não informado';
    if (!bySector.has(key)) bySector.set(key, []);
    bySector.get(key)!.push(emp);
  }

  const summaries: SectorSummary[] = [];
  for (const [sector, list] of bySector) {
    const perfs = list.map((e) => calculateTotalPerformance(e));
    const macroPerfs = list.map((e) => calculateGoalsPerformance(e.macroGoals));
    const sectoralPerfs = list.map((e) => calculateGoalsPerformance(e.sectoralGoals));

    let delayed = 0;
    let notDelivered = 0;
    const aggregate: GoalCounts = { total: 0, early: 0, onTime: 0, late: 0, notDelivered: 0, pending: 0, dueInPeriod: 0 };
    for (const emp of list) {
      const c = countGoals(allEmployeeGoals(emp));
      aggregate.early += c.early;
      aggregate.onTime += c.onTime;
      aggregate.late += c.late;
      aggregate.notDelivered += c.notDelivered;
      aggregate.pending += c.pending;
      aggregate.dueInPeriod += c.dueInPeriod;
      aggregate.total += c.total;
      delayed += c.late;
      notDelivered += c.notDelivered;
    }

    const avg = perfs.length ? perfs.reduce((a, b) => a + b, 0) / perfs.length : null;
    let status: OverallStatus = 'excellent';
    if ((avg ?? 0) < 90 || notDelivered > 0) status = 'critical';
    else if ((avg ?? 0) < 95 || delayed > 0) status = 'attention';
    else if ((avg ?? 0) < 100) status = 'satisfactory';

    summaries.push({
      sector,
      employeeCount: list.length,
      averagePerformance: avg,
      bestPerformance: perfs.length ? Math.max(...perfs) : null,
      worstPerformance: perfs.length ? Math.min(...perfs) : null,
      averageMacro: macroPerfs.length ? macroPerfs.reduce((a, b) => a + b, 0) / macroPerfs.length : null,
      averageSectoral: sectoralPerfs.length ? sectoralPerfs.reduce((a, b) => a + b, 0) / sectoralPerfs.length : null,
      delayedGoals: delayed,
      notDeliveredGoals: notDelivered,
      punctuality: getPunctualityRate(aggregate),
      status,
    });
  }
  summaries.sort((a, b) => (b.averagePerformance ?? -1) - (a.averagePerformance ?? -1));
  return summaries;
}

// ============================================================
// Alerts and validations
// ============================================================

export type AlertLevel = 'critical' | 'attention' | 'info';

export interface ReportAlert {
  level: AlertLevel;
  category: string;
  employee?: string;
  message: string;
}

export function computeAlerts(employees: Employee[]): ReportAlert[] {
  const alerts: ReportAlert[] = [];
  const seenNames = new Set<string>();

  for (const emp of employees) {
    if (seenNames.has(emp.name.toLowerCase().trim())) {
      alerts.push({ level: 'attention', category: 'Registro duplicado', employee: emp.name, message: 'Colaborador com nome duplicado no período.' });
    }
    seenNames.add(emp.name.toLowerCase().trim());

    const allGoals = allEmployeeGoals(emp);

    if (emp.status === 'active' && allGoals.length === 0) {
      alerts.push({ level: 'critical', category: 'Sem metas', employee: emp.name, message: 'Colaborador ativo sem metas cadastradas.' });
    }

    const totalWeight = getTotalGoalsWeight(emp.macroGoals) + getTotalGoalsWeight(emp.sectoralGoals);
    if (allGoals.length > 0 && Math.round(totalWeight) !== 100) {
      alerts.push({
        level: 'attention',
        category: 'Soma de pesos',
        employee: emp.name,
        message: `Soma dos pesos = ${formatSmartPercent(totalWeight)}% (esperado 100%).`,
      });
    }

    for (const g of allGoals) {
      if (g.weight === 0) {
        alerts.push({ level: 'info', category: 'Meta com peso zero', employee: emp.name, message: `Meta "${g.name}" tem peso 0%.` });
      }
      if (!g.deadline) {
        alerts.push({ level: 'critical', category: 'Meta sem prazo', employee: emp.name, message: `Meta "${g.name}" sem prazo.` });
      } else if (!g.deliveryDate && isOverdue(g.deadline)) {
        alerts.push({ level: 'critical', category: 'Meta vencida sem entrega', employee: emp.name, message: `Meta "${g.name}" venceu sem entrega.` });
      }
      if (g.achieved > g.weight && g.weight > 0 && !g.observations) {
        alerts.push({
          level: 'attention',
          category: 'Realizado maior que peso',
          employee: emp.name,
          message: `Meta "${g.name}" tem realizado (${formatSmartPercent(g.achieved)}%) maior que peso (${formatSmartPercent(g.weight)}%) sem justificativa.`,
        });
      }
    }

    const totalPerf = calculateTotalPerformance(emp);
    if (totalPerf > 100 && emp.performanceBonus <= 0) {
      alerts.push({ level: 'attention', category: 'Resultado > 100% sem bônus', employee: emp.name, message: `Desempenho ${formatSmartPercent(totalPerf)}% sem bônus cadastrado.` });
    }
    if (emp.performanceBonus > 0 && !emp.bonusDescription) {
      alerts.push({ level: 'attention', category: 'Bônus sem motivo', employee: emp.name, message: 'Bônus atribuído sem descrição/motivo.' });
    }
  }
  return alerts;
}

// ============================================================
// Recurring delays across the full employee dataset (all months in memory)
// ============================================================

export function findRecurringDelays(allEmployeesAllMonths: Employee[]): Map<string, number> {
  const byName = new Map<string, Set<string>>();
  for (const emp of allEmployeesAllMonths) {
    const late = getDelayedGoalsCount(emp);
    if (late > 0) {
      if (!byName.has(emp.name)) byName.set(emp.name, new Set());
      byName.get(emp.name)!.add(emp.referenceMonth);
    }
  }
  const result = new Map<string, number>();
  for (const [name, months] of byName) {
    if (months.size >= 2) result.set(name, months.size);
  }
  return result;
}
