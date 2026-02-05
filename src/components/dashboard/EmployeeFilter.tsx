import { Search, UserPlus, Filter, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GoalStatus } from '@/types/employee';

interface EmployeeFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedGoalStatus: string;
  onGoalStatusChange: (status: string) => void;
  onAddEmployee: () => void;
  availableSectors?: string[];
  canEdit?: boolean;
}

const goalStatusOptions = [
  { value: 'all', label: 'Todos os Status', icon: null },
  { value: 'early', label: 'Antes do Prazo', icon: CheckCircle },
  { value: 'on_time', label: 'No Prazo', icon: Clock },
  { value: 'late', label: 'Com Atraso', icon: AlertCircle },
  { value: 'not_delivered', label: 'Não Entregue', icon: XCircle },
];

export function EmployeeFilter({
  searchTerm,
  onSearchChange,
  selectedSector,
  onSectorChange,
  selectedMonth,
  onMonthChange,
  selectedStatus,
  onStatusChange,
  selectedGoalStatus,
  onGoalStatusChange,
  onAddEmployee,
  availableSectors = [],
  canEdit = true,
}: EmployeeFilterProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Main filters row */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador ou cargo..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedSector} onValueChange={onSectorChange}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {availableSectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          {canEdit && (
            <Button onClick={onAddEmployee} className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Colaborador</span>
            </Button>
          )}
        </div>
      </div>

      {/* Goal status filter row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Status da Meta:</span>
        {goalStatusOptions.map((option) => (
          <Badge
            key={option.value}
            variant={selectedGoalStatus === option.value ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => onGoalStatusChange(option.value)}
          >
            {option.icon && <option.icon className="w-3 h-3 mr-1" />}
            {option.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
