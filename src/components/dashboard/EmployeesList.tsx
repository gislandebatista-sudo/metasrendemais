import { useState, useMemo } from 'react';
import { Search, User, Briefcase, Building2, Target, TrendingUp, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Employee, calculateTotalPerformance, getGoalStatus, GoalStatus } from '@/types/employee';
import { cn } from '@/lib/utils';

interface EmployeesListProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  selectedEmployeeId?: string;
}

export function EmployeesList({ employees, onSelectEmployee, selectedEmployeeId }: EmployeesListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter employees based on search term (name, role, or sector)
  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return employees;
    
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(term) ||
      emp.role.toLowerCase().includes(term) ||
      emp.sector.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  // Count goals by status for each employee
  const getGoalStatusCounts = (employee: Employee) => {
    const allGoals = [...employee.macroGoals, ...employee.sectoralGoals];
    const counts: Record<GoalStatus, number> = {
      early: 0,
      on_time: 0,
      late: 0,
      not_delivered: 0
    };
    
    allGoals.forEach(goal => {
      const status = getGoalStatus(goal.deadline, goal.deliveryDate);
      counts[status]++;
    });
    
    return counts;
  };

  const getStatusBadge = (status: GoalStatus, count: number) => {
    if (count === 0) return null;
    
    const config = {
      early: { icon: CheckCircle, color: 'bg-performance-excellent/10 text-performance-excellent border-performance-excellent/30' },
      on_time: { icon: Clock, color: 'bg-performance-high/10 text-performance-high border-performance-high/30' },
      late: { icon: AlertCircle, color: 'bg-performance-low/10 text-performance-low border-performance-low/30' },
      not_delivered: { icon: XCircle, color: 'bg-muted text-muted-foreground border-muted-foreground/30' }
    };

    const { icon: Icon, color } = config[status];
    
    return (
      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border", color)}>
        <Icon className="w-3 h-3" />
        <span>{count}</span>
      </div>
    );
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 100) return 'text-performance-excellent';
    if (performance >= 80) return 'text-performance-high';
    if (performance >= 60) return 'text-performance-medium';
    return 'text-performance-low';
  };

  const activeEmployees = filteredEmployees.filter(e => e.status === 'active');

  return (
    <Card className="shadow-lg border-t-4 border-t-primary h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Colaboradores Ativos ({activeEmployees.length})
        </CardTitle>
        
        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-2 p-4 pt-0">
            {activeEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p>{searchTerm ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador ativo'}</p>
              </div>
            ) : (
              activeEmployees.map((employee) => {
                const performance = calculateTotalPerformance(employee);
                const statusCounts = getGoalStatusCounts(employee);
                const totalGoals = employee.macroGoals.length + employee.sectoralGoals.length;
                const isSelected = selectedEmployeeId === employee.id;

                return (
                  <div
                    key={employee.id}
                    onClick={() => onSelectEmployee(employee)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border hover:border-primary/50 bg-card"
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12 border-2 border-background shadow">
                        <AvatarImage src={employee.photo} alt={employee.name} />
                        <AvatarFallback className="text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold truncate">{employee.name}</h4>
                          <ChevronRight className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isSelected && "text-primary rotate-90"
                          )} />
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {employee.role}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {employee.sector}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Row */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Desempenho:</span>
                          <span className={cn("font-bold", getPerformanceColor(performance))}>
                            {performance.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{totalGoals} metas</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <Progress 
                        value={Math.min(performance, 100)} 
                        className="h-2 mt-2"
                      />

                      {/* Goal Status Badges */}
                      {totalGoals > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {getStatusBadge('early', statusCounts.early)}
                          {getStatusBadge('on_time', statusCounts.on_time)}
                          {getStatusBadge('late', statusCounts.late)}
                          {getStatusBadge('not_delivered', statusCounts.not_delivered)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
