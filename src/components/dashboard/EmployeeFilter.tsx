import { Search, UserPlus, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sectors } from '@/data/mockEmployees';

interface EmployeeFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  onAddEmployee: () => void;
}

export function EmployeeFilter({
  searchTerm,
  onSearchChange,
  selectedSector,
  onSectorChange,
  onAddEmployee,
}: EmployeeFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaborador..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-3">
        <Select value={selectedSector} onValueChange={onSectorChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Todos os setores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={onAddEmployee} className="gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Colaborador</span>
        </Button>
      </div>
    </div>
  );
}
