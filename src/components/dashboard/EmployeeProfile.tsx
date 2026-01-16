import { X, Briefcase, Building2, Calendar, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Employee, Goal, calculateTotalPerformance, getPerformanceLevel } from '@/types/employee';
import { cn } from '@/lib/utils';

interface EmployeeProfileProps {
  employee: Employee;
  onClose: () => void;
  onUpdateGoal: (employeeId: string, goalId: string, achieved: number) => void;
}

export function EmployeeProfile({ employee, onClose, onUpdateGoal }: EmployeeProfileProps) {
  const totalPerformance = calculateTotalPerformance(employee.goals);
  const level = getPerformanceLevel(totalPerformance);

  const getPerformanceColorClass = (level: string) => {
    switch (level) {
      case 'low': return 'bg-performance-low';
      case 'medium': return 'bg-performance-medium';
      case 'high': return 'bg-performance-high';
      case 'excellent': return 'bg-performance-excellent';
      default: return 'bg-muted';
    }
  };

  const getProgressColor = (achieved: number) => {
    if (achieved < 80) return 'bg-performance-low';
    if (achieved < 100) return 'bg-performance-medium';
    if (achieved === 100) return 'bg-performance-high';
    return 'bg-performance-excellent';
  };

  const handleAchievedChange = (goalId: string, value: string) => {
    const numValue = Math.min(105, Math.max(0, parseFloat(value) || 0));
    onUpdateGoal(employee.id, goalId, numValue);
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Perfil do Colaborador
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Employee Info */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
            <AvatarImage src={employee.photo} alt={employee.name} />
            <AvatarFallback className="text-xl">{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{employee.name}</h3>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {employee.role}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {employee.sector}
              </span>
              {employee.admissionDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(employee.admissionDate).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total Performance */}
        <div className={cn(
          "p-4 rounded-xl text-primary-foreground",
          getPerformanceColorClass(level)
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">Resultado Final do Mês</span>
            </div>
            <span className="text-3xl font-bold">{totalPerformance.toFixed(1)}%</span>
          </div>
        </div>

        {/* Goals */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Metas do Mês
          </h4>
          
          {employee.goals.map((goal) => {
            const weightedResult = (goal.achieved * goal.weight) / 100;
            
            return (
              <div key={goal.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h5 className="font-medium">{goal.name}</h5>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                    Peso: {goal.weight}%
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Realizado</span>
                      <span className="font-medium">{goal.achieved}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", getProgressColor(goal.achieved))}
                        style={{ width: `${Math.min(100, (goal.achieved / 105) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      max="105"
                      value={goal.achieved}
                      onChange={(e) => handleAchievedChange(goal.id, e.target.value)}
                      className="text-center font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resultado Ponderado</span>
                  <span className="font-semibold text-primary">{weightedResult.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
