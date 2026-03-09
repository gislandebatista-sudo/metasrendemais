import { Users, TrendingUp, Award, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, calculateTotalPerformance } from '@/types/employee';
import { formatPercent } from '@/lib/utils';

interface MainStatsCardsProps {
  employees: Employee[];
}

export function MainStatsCards({ employees }: MainStatsCardsProps) {
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
    },
    {
      title: 'Média de Desempenho',
      value: `${averagePerformance.toFixed(2).replace('.', ',')}%`,
      icon: TrendingUp,
      color: averagePerformance >= 100 ? 'bg-performance-high text-primary-foreground' : averagePerformance >= 80 ? 'bg-performance-medium text-primary-foreground' : 'bg-performance-low text-primary-foreground',
    },
    {
      title: 'Melhor Resultado',
      value: `${formatPercent(topPerformance)}%`,
      icon: Award,
      color: 'bg-performance-excellent text-primary-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-md overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
