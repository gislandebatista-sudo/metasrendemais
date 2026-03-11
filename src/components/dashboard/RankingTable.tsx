import { Trophy, Medal, Crown, ChevronRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Employee, calculateTotalPerformance, getPerformanceLevel } from '@/types/employee';
import { cn, formatPercent } from '@/lib/utils';
import { usePercentageVisibility } from '@/hooks/usePercentageVisibility';

interface RankingTableProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  selectedGoalName?: string;
}

export function RankingTable({ employees, onSelectEmployee, selectedGoalName }: RankingTableProps) {
  const { hidePercentages } = usePercentageVisibility();
  const isGoalFiltered = selectedGoalName && selectedGoalName !== 'all';

  const getGoalAchieved = (emp: Employee): number => {
    if (!isGoalFiltered) return calculateTotalPerformance(emp);
    const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
    const goal = allGoals.find(g => g.name === selectedGoalName);
    return goal ? goal.achieved : 0;
  };

  const getGoalWeight = (emp: Employee): number | null => {
    if (!isGoalFiltered) return null;
    const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
    const goal = allGoals.find(g => g.name === selectedGoalName);
    return goal ? goal.weight : null;
  };

  const rankedEmployees = [...employees]
    .map(emp => ({
      ...emp,
      totalPerformance: calculateTotalPerformance(emp),
      goalAchieved: getGoalAchieved(emp),
      goalWeight: getGoalWeight(emp),
    }))
    .sort((a, b) => b.goalAchieved - a.goalAchieved || a.name.localeCompare(b.name));

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="w-5 h-5 text-rank-gold" />;
      case 1: return <Medal className="w-5 h-5 text-rank-silver" />;
      case 2: return <Medal className="w-5 h-5 text-rank-bronze" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-medium">{position + 1}</span>;
    }
  };

  const getRankBadge = (position: number) => {
    switch (position) {
      case 0: return 'rank-gold';
      case 1: return 'rank-silver';
      case 2: return 'rank-bronze';
      default: return 'bg-muted';
    }
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-performance-low';
      case 'medium': return 'text-performance-medium';
      case 'high': return 'text-performance-high';
      case 'excellent': return 'text-performance-excellent';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-accent" />
          {isGoalFiltered ? `Meta: ${selectedGoalName}` : 'Ranking Geral'}
        </CardTitle>
        {isGoalFiltered && (
          <p className="text-sm text-muted-foreground">Exibindo porcentagem individual da meta selecionada</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {rankedEmployees.map((employee, index) => {
            const displayValue = isGoalFiltered ? employee.goalAchieved : employee.totalPerformance;
            const level = getPerformanceLevel(displayValue);
            const isTopThree = index < 3;
            const isTopTen = index < 10;
            const isAbove100 = displayValue >= 100;
            const isInactive = employee.status === 'inactive';

            return (
              <button
                key={employee.id}
                onClick={() => onSelectEmployee(employee)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left",
                  isTopThree && "bg-accent/10 border-l-4 border-l-accent",
                  !isTopThree && isTopTen && "bg-primary/5 border-l-4 border-l-primary/30",
                  isInactive && "opacity-60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm",
                  getRankBadge(index)
                )}>
                  {index + 1}
                </div>

                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                  <AvatarImage src={employee.photo} alt={employee.name} />
                  <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{employee.name}</span>
                    {isTopThree && <Star className="w-4 h-4 text-accent fill-accent" />}
                    {!hidePercentages && isAbove100 && (
                      <Badge variant="outline" className="text-xs bg-performance-excellent/10 text-performance-excellent border-performance-excellent/30">
                        +100%
                      </Badge>
                    )}
                    {isInactive && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{employee.role}</span>
                </div>

                <div className="text-right">
                  <div className={cn("font-bold text-lg", getPerformanceColor(level))}>
                    {hidePercentages ? '•••' : `${formatPercent(displayValue)}%`}
                  </div>
                  {!hidePercentages && isGoalFiltered && employee.goalWeight !== null && (
                    <span className="text-xs text-muted-foreground">Peso: {employee.goalWeight}%</span>
                  )}
                  {!hidePercentages && !isGoalFiltered && employee.performanceBonus > 0 && (
                    <span className="text-xs text-accent">+{employee.performanceBonus}% bônus</span>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
