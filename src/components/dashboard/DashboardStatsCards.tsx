import { useState } from 'react';
import { TrendingUp, Target, Award, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Employee, calculateTotalPerformance, getDelayedGoalsCount, getNotDeliveredGoalsCount, getGoalStatus } from '@/types/employee';
import { GoalDetailsModal } from './GoalDetailsModal';

interface DashboardStatsCardsProps {
  employees: Employee[];
}

type ModalType = 'above100' | 'delayed' | 'notDelivered' | null;

export function DashboardStatsCards({ employees }: DashboardStatsCardsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const performances = activeEmployees.map(emp => ({
    employee: emp,
    performance: calculateTotalPerformance(emp),
  }));
  
  const above100 = performances.filter(p => p.performance >= 100);
  
  // Get delayed goals with employee info
  const delayedGoals = activeEmployees.flatMap(emp => {
    const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
    return allGoals
      .filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'late')
      .map(goal => ({
        goal,
        employee: emp,
      }));
  });
  
  // Get not delivered goals with employee info
  const notDeliveredGoals = activeEmployees.flatMap(emp => {
    const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
    return allGoals
      .filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'not_delivered')
      .map(goal => ({
        goal,
        employee: emp,
      }));
  });

  const stats = [
    {
      title: 'Acima de 100%',
      value: above100.length,
      subtitle: `de ${activeEmployees.length} colaboradores`,
      icon: Target,
      color: 'bg-accent text-accent-foreground',
      onClick: () => setActiveModal('above100'),
    },
    {
      title: 'Metas em Atraso',
      value: delayedGoals.length,
      subtitle: 'entregas atrasadas',
      icon: AlertTriangle,
      color: delayedGoals.length > 0 ? 'bg-performance-low text-primary-foreground' : 'bg-muted text-muted-foreground',
      onClick: () => setActiveModal('delayed'),
    },
    {
      title: 'Não Entregues',
      value: notDeliveredGoals.length,
      subtitle: 'metas pendentes',
      icon: Target,
      color: notDeliveredGoals.length > 0 ? 'bg-performance-medium text-primary-foreground' : 'bg-muted text-muted-foreground',
      onClick: () => setActiveModal('notDelivered'),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={stat.onClick}
          >
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
              <p className="text-xs text-primary mt-2 font-medium">Clique para ver detalhes →</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal for Above 100% */}
      <GoalDetailsModal
        open={activeModal === 'above100'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Colaboradores Acima de 100%"
        type="employees"
        employeesWithPerformance={above100}
      />

      {/* Modal for Delayed Goals */}
      <GoalDetailsModal
        open={activeModal === 'delayed'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Metas em Atraso"
        type="goals"
        goalsWithEmployee={delayedGoals}
      />

      {/* Modal for Not Delivered Goals */}
      <GoalDetailsModal
        open={activeModal === 'notDelivered'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Metas Não Entregues"
        type="goals"
        goalsWithEmployee={notDeliveredGoals}
      />
    </>
  );
}
