export type GoalStatus = 'early' | 'on_time' | 'late' | 'not_delivered';

export interface GoalCriteria {
  id: string;
  name: string;
  value: number;
  maxValue?: number;
  sortOrder: number;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  weight: number; // percentage 0-100
  achieved: number; // percentage 0-100
  deadline: string; // ISO date string
  deliveryDate?: string; // ISO date string
  observations?: string; // Observações / Justificativas
  criteria?: GoalCriteria[];
  monthlyProgressId?: string; // ID from goal_monthly_progress for criteria linking
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
  updatedAt?: string; // ISO date string for last modification
  lastModifiedBy?: string; // User ID who last modified
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  employees: Employee[];
}

export type PerformanceLevel = 'low' | 'medium' | 'high' | 'excellent';

export const getGoalStatus = (deadline: string, deliveryDate?: string): GoalStatus => {
  if (!deliveryDate) return 'not_delivered';
  
  // Parse dates without timezone conversion by splitting the string
  const [deadlineYear, deadlineMonth, deadlineDay] = deadline.split('-').map(Number);
  const [deliveryYear, deliveryMonth, deliveryDay] = deliveryDate.split('-').map(Number);
  
  // Create dates at noon to avoid any timezone issues
  const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, deadlineDay, 12, 0, 0);
  const delivery = new Date(deliveryYear, deliveryMonth - 1, deliveryDay, 12, 0, 0);
  
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

// Calculate direct sum of achieved percentages for a set of goals
// Each goal's achieved is capped at its weight (e.g., weight=30% → max achieved=30%)
// Goals with weight=0 are informational and don't count towards performance
export const calculateGoalsPerformance = (goals: Goal[]): number => {
  if (goals.length === 0) return 0;
  // Direct sum: each goal contributes its achieved%, but capped at its weight
  // Goals with weight=0 are skipped (informational only)
  const total = goals.reduce((acc, goal) => {
    // Skip goals without weight (informational goals)
    if (goal.weight === 0) return acc;
    // Achieved cannot exceed the goal's weight
    const cappedAchieved = Math.min(goal.achieved, goal.weight);
    return acc + cappedAchieved;
  }, 0);
  return total;
};

// Calculate total performance using DIRECT SUM (not averages)
// Total = Macro Goals achieved + Sectoral Goals achieved + Bonus
// Maximum: 100% (goals) + 5% (bonus) = 105%
export const calculateTotalPerformance = (employee: Employee): number => {
  // Direct sum of all goals achieved (each capped at its weight)
  const macroSum = calculateGoalsPerformance(employee.macroGoals);
  const sectoralSum = calculateGoalsPerformance(employee.sectoralGoals);
  
  // Total from goals is the sum (should equal 100% max if weights are set correctly)
  const goalsTotal = macroSum + sectoralSum;
  
  // Add bonus (capped at 5%) - only bonus can exceed 100%, max total is 105%
  const bonus = Math.min(employee.performanceBonus, 5);
  
  return Math.min(goalsTotal + bonus, 105);
};

// Get unified total weight across all goals (Macro + Sectoral)
export const getUnifiedTotalWeight = (employee: Employee): number => {
  const macroWeight = getTotalGoalsWeight(employee.macroGoals);
  const sectoralWeight = getTotalGoalsWeight(employee.sectoralGoals);
  return macroWeight + sectoralWeight;
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
