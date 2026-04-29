import { Users, TrendingUp, Award, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, calculateTotalPerformance } from '@/types/employee';
import { formatPercent } from '@/lib/utils';
import { usePercentageVisibility } from '@/hooks/usePercentageVisibility';

interface MainStatsCardsProps {
  employees: Employee[];
}

export function MainStatsCards({ employees }: MainStatsCardsProps) {
  const { hidePercentages } = usePercentageVisibility();
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const performances = activeEmployees.map(emp => calculateTotalPerformance(emp));
  
  const averagePerformance = performances.length > 0 
    ? performances.reduce((a, b) => a + b, 0) / performances.length 
    : 0;
  
  const topPerformance = Math.max(...performances, 0);
  
  const stats = [
    {
      title: 'Colaboradores Ativos',
      value: activeEmployees.length,
      subtitle: `de ${employees.length} total`,
      icon: UserCheck,
      color: 'bg-primary text-primary-foreground',
      isPercentage: false,
    },
    {
      title: 'Média de Desempenho',
      value: hidePercentages ? '•••' : `${averagePerformance.toFixed(2).replace('.', ',')}%`,
      icon: TrendingUp,
      color: averagePerformance >= 100 ? 'bg-performance-high text-primary-foreground' : averagePerformance >= 80 ? 'bg-performance-medium text-primary-foreground' : 'bg-performance-low text-primary-foreground',
      isPercentage: true,
    },
    {
      title: 'Melhor Resultado',
      value: hidePercentages ? '•••' : `${formatPercent(topPerformance)}%`,
      icon: Award,
      color: 'bg-performance-excellent text-primary-foreground',
      isPercentage: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="group overflow-hidden hover:border-primary/30 animate-fade-in-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <CardContent className="p-5 relative">
            {/* Subtle hover wash */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-start justify-between gap-4 relative">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium font-mono-accent">
                  {stat.title}
                </p>
                <p className="kpi-number text-4xl mt-3 text-foreground">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono-accent">
                    {stat.subtitle}
                  </p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl ${stat.color} shrink-0 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.4)] ring-1 ring-white/10`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
