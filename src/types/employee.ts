export interface Goal {
  id: string;
  name: string;
  description?: string;
  weight: number; // percentage 0-100
  achieved: number; // percentage 0-105
}

export interface Employee {
  id: string;
  name: string;
  photo: string;
  role: string;
  sector: string;
  admissionDate?: string;
  goals: Goal[];
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  employees: Employee[];
}

export type PerformanceLevel = 'low' | 'medium' | 'high' | 'excellent';

export const getPerformanceLevel = (percentage: number): PerformanceLevel => {
  if (percentage < 80) return 'low';
  if (percentage < 100) return 'medium';
  if (percentage === 100) return 'high';
  return 'excellent';
};

export const calculateTotalPerformance = (goals: Goal[]): number => {
  if (goals.length === 0) return 0;
  const total = goals.reduce((acc, goal) => {
    const cappedAchieved = Math.min(goal.achieved, 105);
    return acc + (cappedAchieved * goal.weight) / 100;
  }, 0);
  return Math.min(total, 105);
};
