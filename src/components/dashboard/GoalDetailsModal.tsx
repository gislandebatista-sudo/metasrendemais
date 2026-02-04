import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Employee, Goal } from '@/types/employee';
import { formatDateBR } from '@/lib/utils';
import { Target, User, Building2, Calendar, TrendingUp } from 'lucide-react';

interface GoalDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: 'goals' | 'employees';
  goalsWithEmployee?: { goal: Goal; employee: Employee }[];
  employeesWithPerformance?: { employee: Employee; performance: number }[];
}

export function GoalDetailsModal({
  open,
  onOpenChange,
  title,
  type,
  goalsWithEmployee = [],
  employeesWithPerformance = [],
}: GoalDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {type === 'goals' && goalsWithEmployee.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Meta
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Colaborador
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Setor
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Prazo
                    </div>
                  </TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goalsWithEmployee.map(({ goal, employee }, index) => (
                  <TableRow key={`${employee.id}-${goal.id}-${index}`}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium truncate max-w-[230px]" title={goal.name}>
                          {goal.name}
                        </p>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[230px]" title={goal.description}>
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img 
                          src={employee.photo} 
                          alt={employee.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.sector}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDateBR(goal.deadline)}</span>
                    </TableCell>
                    <TableCell>
                      {goal.deliveryDate ? (
                        <span className="text-sm">{formatDateBR(goal.deliveryDate)}</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{goal.weight}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {type === 'employees' && employeesWithPerformance.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Colaborador
                    </div>
                  </TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Setor
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <TrendingUp className="w-4 h-4" />
                      Desempenho
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesWithPerformance
                  .sort((a, b) => b.performance - a.performance)
                  .map(({ employee, performance }, index) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-bold text-primary">
                        {index + 1}º
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={employee.photo} 
                            alt={employee.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.sector}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          className={
                            performance >= 105 
                              ? 'bg-performance-excellent text-white' 
                              : 'bg-performance-high text-white'
                          }
                        >
                          {performance.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}

          {type === 'goals' && goalsWithEmployee.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma meta encontrada nesta categoria.</p>
            </div>
          )}

          {type === 'employees' && employeesWithPerformance.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum colaborador encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
