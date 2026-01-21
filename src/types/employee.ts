export type GoalStatus = 'early' | 'on_time' | 'late' | 'not_delivered';

export interface Goal {
  id: string;
  name: string;
  description?: string;
  weight: number; // percentage 0-100
  achieved: number; // percentage 0-100
  deadline: string; // ISO date string
  deliveryDate?: string; // ISO date string
}

export interface Employee {
  id: string;
  name: string;
  photo: string;
  role: string;
  sector: string;
  referenceMonth: string; // Format: YYYY-MM
  status: 'active' | 'inactive';
  macroGoals: Goal[]; // Up to 5 goals
  sectoralGoals: Goal[]; // Up to 10 goals
  performanceBonus: number; // 0-5%
  bonusDescription?: string; // Description/reason for bonus
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  employees: Employee[];
}

export type PerformanceLevel = 'low' | 'medium' | 'high' | 'excellent';

export const getGoalStatus = (deadline: string, deliveryDate?: string): GoalStatus => {
  if (!deliveryDate) return 'not_delivered';
  
  const deadlineDate = new Date(deadline);
  const delivery = new Date(deliveryDate);
  
  // Early: 1+ day before deadline
  const dayBefore = new Date(deadlineDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  
  if (delivery <= dayBefore) return 'early';
  if (delivery.toDateString() === deadlineDate.toDateString()) return 'on_time';
  return 'late';
};

export const getStatusLabel = (status: GoalStatus): string => {
  switch (status) {
    case 'early': return 'Entregue Antes';
    case 'on_time': return 'No Prazo';
    case 'late': return 'Com Atraso';
    case 'not_delivered': return 'Não Entregue';
  }
};

export const getStatusColor = (status: GoalStatus): string => {
  switch (status) {
    case 'early': return 'text-performance-excellent bg-performance-excellent/10';
    case 'on_time': return 'text-performance-high bg-performance-high/10';
    case 'late': return 'text-performance-low bg-performance-low/10';
    case 'not_delivered': return 'text-muted-foreground bg-muted';
  }
};

export const getPerformanceLevel = (percentage: number): PerformanceLevel => {
  if (percentage < 80) return 'low';
  if (percentage < 100) return 'medium';
  if (percentage === 100) return 'high';
  return 'excellent';
};

export const getPerformanceLevelLabel = (level: PerformanceLevel): string => {
  switch (level) {
    case 'low': return 'Baixo';
    case 'medium': return 'Médio';
    case 'high': return 'Alto';
    case 'excellent': return 'Excelente';
  }
};

export const calculateGoalsPerformance = (goals: Goal[]): number => {
  if (goals.length === 0) return 0;
  // Each goal's achieved is capped by its own weight (e.g., if weight=50%, max achieved contribution = 50%)
  const total = goals.reduce((acc, goal) => {
    // Cap achieved at 100% of the goal, then calculate weighted contribution
    const cappedAchieved = Math.min(goal.achieved, 100);
    // The contribution of this goal is (achieved% of goal) * (weight% of total)
    // But the max contribution is limited to the goal's weight
    const contribution = (cappedAchieved * goal.weight) / 100;
    return acc + Math.min(contribution, goal.weight);
  }, 0);
  return Math.min(total, 100);
};

export const calculateTotalPerformance = (employee: Employee): number => {
  const macroPerf = calculateGoalsPerformance(employee.macroGoals);
  const sectoralPerf = calculateGoalsPerformance(employee.sectoralGoals);
  
  // If both have goals, average them. Otherwise, use whichever has goals
  const hasMacro = employee.macroGoals.length > 0;
  const hasSectoral = employee.sectoralGoals.length > 0;
  
  let basePerformance = 0;
  if (hasMacro && hasSectoral) {
    basePerformance = (macroPerf + sectoralPerf) / 2;
  } else if (hasMacro) {
    basePerformance = macroPerf;
  } else if (hasSectoral) {
    basePerformance = sectoralPerf;
  }
  
  // Add bonus (capped at 5%) - only bonus can exceed 100%, max total is 105%
  const bonus = Math.min(employee.performanceBonus, 5);
  
  return Math.min(basePerformance + bonus, 105);
};

export const getTotalGoalsWeight = (goals: Goal[]): number => {
  return goals.reduce((sum, goal) => sum + goal.weight, 0);
};

export const getDelayedGoalsCount = (employee: Employee): number => {
  const allGoals = [...employee.macroGoals, ...employee.sectoralGoals];
  return allGoals.filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'late').length;
};

export const getNotDeliveredGoalsCount = (employee: Employee): number => {
  const allGoals = [...employee.macroGoals, ...employee.sectoralGoals];
  return allGoals.filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'not_delivered').length;
};
