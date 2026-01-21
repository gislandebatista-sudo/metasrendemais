import { Calendar, Users, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { months } from '@/data/mockEmployees';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  totalEmployees: number;
}

export function Header({ selectedMonth, onMonthChange, totalEmployees }: HeaderProps) {
  return (
    <header className="gradient-primary text-primary-foreground p-6 rounded-2xl mb-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Rende +
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              Sistema de Gestão de Metas e Desempenho
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
            <Users className="w-5 h-5" />
            <span className="font-medium">{totalEmployees} colaboradores ativos</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="w-[140px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
}