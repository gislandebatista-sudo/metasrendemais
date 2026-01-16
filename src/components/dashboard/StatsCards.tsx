import { Users, TrendingUp, Target, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, calculateTotalPerformance } from '@/types/employee';

interface StatsCardsProps {
  employees: Employee[];
}

export function StatsCards({ employees }: StatsCardsProps) {
  const performances = employees.map(emp => calculateTotalPerformance(emp.goals));
  
  const averagePerformance = performances.length > 0 
    ? performances.reduce((a, b) => a + b, 0) / performances.length 
    : 0;
  
  const above100Count = performances.filter(p => p >= 100).length;
  const topPerformance = Math.max(...performances, 0);
  
  const stats = [
    {
      title: 'Colaboradores',
      value: employees.length,
      icon: Users,
      color: 'bg-primary text-primary-foreground',
    },
    {
      title: 'Média Geral',
      value: `${averagePerformance.toFixed(1)}%`,
      icon: TrendingUp,
      color: averagePerformance >= 100 ? 'bg-performance-high text-primary-foreground' : averagePerformance >= 80 ? 'bg-performance-medium text-primary-foreground' : 'bg-performance-low text-primary-foreground',
    },
    {
      title: 'Acima de 100%',
      value: above100Count,
      subtitle: `de ${employees.length} colaboradores`,
      icon: Target,
      color: 'bg-performance-excellent text-primary-foreground',
    },
    {
      title: 'Melhor Resultado',
      value: `${topPerformance.toFixed(1)}%`,
      icon: Award,
      color: 'bg-accent text-accent-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-md overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
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
