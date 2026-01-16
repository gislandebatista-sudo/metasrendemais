import { useState } from 'react';
import { X, Briefcase, Building2, Calendar, Target, TrendingUp, Gift, Clock, CheckCircle2, AlertCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Employee, 
  Goal, 
  calculateTotalPerformance, 
  calculateGoalsPerformance,
  getPerformanceLevel,
  getPerformanceLevelLabel,
  getGoalStatus,
  getStatusLabel,
  getStatusColor
} from '@/types/employee';
import { cn } from '@/lib/utils';

interface EmployeeProfileProps {
  employee: Employee;
  onClose: () => void;
  onUpdateGoal: (employeeId: string, goalType: 'macro' | 'sectoral', goalId: string, updates: Partial<Goal>) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
}

export function EmployeeProfile({ employee, onClose, onUpdateGoal, onEditEmployee, onDeleteEmployee }: EmployeeProfileProps) {
  const totalPerformance = calculateTotalPerformance(employee);
  const macroPerformance = calculateGoalsPerformance(employee.macroGoals);
  const sectoralPerformance = calculateGoalsPerformance(employee.sectoralGoals);
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

  const getStatusIcon = (status: ReturnType<typeof getGoalStatus>) => {
    switch (status) {
      case 'early': return <CheckCircle2 className="w-4 h-4" />;
      case 'on_time': return <Clock className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      case 'not_delivered': return <XCircle className="w-4 h-4" />;
    }
  };

  const handleAchievedChange = (goalType: 'macro' | 'sectoral', goalId: string, value: string) => {
    const numValue = Math.min(105, Math.max(0, parseFloat(value) || 0));
    onUpdateGoal(employee.id, goalType, goalId, { achieved: numValue });
  };

  const handleDeliveryDateChange = (goalType: 'macro' | 'sectoral', goalId: string, value: string) => {
    onUpdateGoal(employee.id, goalType, goalId, { deliveryDate: value || undefined });
  };

  const renderGoalsList = (goals: Goal[], type: 'macro' | 'sectoral') => (
    <div className="space-y-4">
      {goals.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">Nenhuma meta cadastrada</p>
      ) : (
        goals.map((goal) => {
          const weightedResult = (goal.achieved * goal.weight) / 100;
          const status = getGoalStatus(goal.deadline, goal.deliveryDate);
          
          return (
            <div key={goal.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium">{goal.name}</h5>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(status))}>
                      {getStatusIcon(status)}
                      <span className="ml-1">{getStatusLabel(status)}</span>
                    </Badge>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </div>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                  Peso: {goal.weight}%
                </span>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Prazo:</span>
                  <span className="ml-2 font-medium">{new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Entrega:</span>
                  <Input
                    type="date"
                    value={goal.deliveryDate || ''}
                    onChange={(e) => handleDeliveryDateChange(type, goal.id, e.target.value)}
                    className="h-7 text-sm w-36"
                  />
                </div>
              </div>

              {/* Progress */}
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
                
                <div className="w-20">
                  <Input
                    type="number"
                    min="0"
                    max="105"
                    value={goal.achieved}
                    onChange={(e) => handleAchievedChange(type, goal.id, e.target.value)}
                    className="text-center font-medium h-8"
                  />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resultado Ponderado</span>
                <span className="font-semibold text-primary">{weightedResult.toFixed(1)}%</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Card className="shadow-lg border-t-4 border-t-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Perfil do Colaborador
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEditEmployee(employee)}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir este colaborador?')) {
                  onDeleteEmployee(employee.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
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
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{employee.name}</h3>
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                {employee.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
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

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={cn(
            "p-4 rounded-xl text-primary-foreground",
            getPerformanceColorClass(level)
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Total</span>
              </div>
              <span className="text-2xl font-bold">{totalPerformance.toFixed(1)}%</span>
            </div>
            <p className="text-sm opacity-80 mt-1">{getPerformanceLevelLabel(level)}</p>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                <span className="font-medium">Macro</span>
              </div>
              <span className="text-2xl font-bold text-primary">{macroPerformance.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{employee.macroGoals.length} metas</p>
          </div>

          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-foreground">
                <Briefcase className="w-5 h-5" />
                <span className="font-medium">Setoriais</span>
              </div>
              <span className="text-2xl font-bold">{sectoralPerformance.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{employee.sectoralGoals.length} metas</p>
          </div>
        </div>

        {/* Bonus */}
        {employee.performanceBonus > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Gift className="w-5 h-5 text-accent" />
            <span className="font-medium">Bônus de Performance:</span>
            <span className="text-lg font-bold text-accent">+{employee.performanceBonus}%</span>
          </div>
        )}

        {/* Goals Tabs */}
        <Tabs defaultValue="macro" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="macro" className="gap-2">
              <Target className="w-4 h-4" />
              Metas Macro ({employee.macroGoals.length})
            </TabsTrigger>
            <TabsTrigger value="sectoral" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Metas Setoriais ({employee.sectoralGoals.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="macro" className="mt-4">
            {renderGoalsList(employee.macroGoals, 'macro')}
          </TabsContent>
          
          <TabsContent value="sectoral" className="mt-4">
            {renderGoalsList(employee.sectoralGoals, 'sectoral')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
