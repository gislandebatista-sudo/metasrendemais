import { Calendar, Lock, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEvaluationMonths, formatMonthLabel, getAvailableMonths } from '@/hooks/useEvaluationMonths';
import { useAuth } from '@/hooks/useAuth';
import { format, addMonths, subMonths, parse } from 'date-fns';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const { evaluationMonths, initializeMonth, isMonthEditable, isLoading } = useEvaluationMonths();
  const { isAdmin } = useAuth();
  
  const availableMonths = getAvailableMonths();
  const currentMonthValue = selectedMonth === 'all' 
    ? format(new Date(), 'yyyy-MM') 
    : selectedMonth.length === 2 
      ? `${new Date().getFullYear()}-${selectedMonth}`
      : selectedMonth;

  const isEditable = isMonthEditable(currentMonthValue);
  const monthExists = evaluationMonths.some(m => m.month === currentMonthValue);

  const handlePrevMonth = () => {
    const currentDate = parse(currentMonthValue, 'yyyy-MM', new Date());
    const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const currentDate = parse(currentMonthValue, 'yyyy-MM', new Date());
    const nextMonth = format(addMonths(currentDate, 1), 'yyyy-MM');
    onMonthChange(nextMonth);
  };

  const handleInitializeMonth = async () => {
    await initializeMonth(currentMonthValue);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex items-center gap-1 bg-card border rounded-lg p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select value={currentMonthValue} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => {
                const evalMonth = evaluationMonths.find(m => m.month === month.value);
                const isClosed = evalMonth?.status === 'closed';
                
                return (
                  <SelectItem key={month.value} value={month.value}>
                    <div className="flex items-center gap-2">
                      <span>{month.label}</span>
                      {isClosed && <Lock className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Status indicator */}
        {!isLoading && (
          <div className="flex items-center gap-2">
            {monthExists ? (
              isEditable ? (
                <Badge variant="outline" className="bg-performance-high/10 text-performance-high border-performance-high/20">
                  Ativo
                </Badge>
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" />
                      Fechado
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Este mês está fechado e não pode ser editado
                  </TooltipContent>
                </Tooltip>
              )
            ) : isAdmin ? (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={handleInitializeMonth}
              >
                <Plus className="w-4 h-4" />
                Inicializar Mês
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Sem dados
              </Badge>
            )}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}
