import { Users, TrendingUp, Target, Award, AlertTriangle, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, calculateTotalPerformance, getDelayedGoalsCount, getNotDeliveredGoalsCount } from '@/types/employee';

interface StatsCardsProps {
  employees: Employee[];
}

export function StatsCards({ employees }: StatsCardsProps) {
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const performances = activeEmployees.map(emp => calculateTotalPerformance(emp));
  
  const averagePerformance = performances.length > 0 
    ? performances.reduce((a, b) => a + b, 0) / performances.length 
    : 0;
  
  const above100Count = performances.filter(p => p >= 100).length;
  const topPerformance = Math.max(...performances, 0);
  
  // Count delayed goals across all employees
  const totalDelayedGoals = employees.reduce((sum, emp) => sum + getDelayedGoalsCount(emp), 0);
  const totalNotDelivered = employees.reduce((sum, emp) => sum + getNotDeliveredGoalsCount(emp), 0);
  
  const stats = [
    {
      title: 'Colaboradores Ativos',
      value: activeEmployees.length,
      subtitle: `de ${employees.length} total`,
      icon: UserCheck,
      color: 'bg-primary text-primary-foreground',
    },
    {
      title: 'Média de Desempenho',
      value: `${averagePerformance.toFixed(1)}%`,
      icon: TrendingUp,
      color: averagePerformance >= 100 ? 'bg-performance-high text-primary-foreground' : averagePerformance >= 80 ? 'bg-performance-medium text-primary-foreground' : 'bg-performance-low text-primary-foreground',
    },
    {
      title: 'Melhor Resultado',
      value: `${topPerformance.toFixed(1)}%`,
      icon: Award,
      color: 'bg-performance-excellent text-primary-foreground',
    },
    {
      title: 'Acima de 100%',
      value: above100Count,
      subtitle: `de ${activeEmployees.length} colaboradores`,
      icon: Target,
      color: 'bg-accent text-accent-foreground',
    },
    {
      title: 'Metas em Atraso',
      value: totalDelayedGoals,
      subtitle: 'entregas atrasadas',
      icon: AlertTriangle,
      color: totalDelayedGoals > 0 ? 'bg-performance-low text-primary-foreground' : 'bg-muted text-muted-foreground',
    },
    {
      title: 'Não Entregues',
      value: totalNotDelivered,
      subtitle: 'metas pendentes',
      icon: Target,
      color: totalNotDelivered > 0 ? 'bg-performance-medium text-primary-foreground' : 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="overflow-hidden group hover:border-primary/40 transition-all duration-200 animate-fade-in-up"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <CardContent className="p-4 relative">
            {/* Subtle gradient wash on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-start justify-between relative">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium font-mono-accent">{stat.title}</p>
                <p className="text-2xl font-semibold mt-1.5 tabular-nums tracking-tight text-foreground">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${stat.color} shrink-0 shadow-sm`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
