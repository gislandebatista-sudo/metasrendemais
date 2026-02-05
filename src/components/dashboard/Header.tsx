import { Users, TrendingUp } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { UserMenu } from './UserMenu';

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
          
          {/* Month Selector with navigation */}
          <div className="bg-primary-foreground/10 rounded-lg">
            <MonthSelector 
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
