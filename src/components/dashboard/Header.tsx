import { Users } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import logoRende from '@/assets/logo-rende-new.png';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  totalEmployees: number;
}

export function Header({ selectedMonth, onMonthChange, totalEmployees }: HeaderProps) {
  return (
    <header className="bg-card border border-border p-6 rounded-2xl mb-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo + Title Section */}
        <div className="flex items-center gap-5">
          <img 
            src={logoRende} 
            alt="Rende+ Logo" 
            className="h-14 md:h-16 w-auto object-contain"
          />
          <div className="border-l-2 border-border pl-5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight text-foreground">
              Gerenciamento de metas
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-semibold mt-0.5">
              2026
            </p>
          </div>
        </div>
        
        {/* Controls Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg">
            <Users className="w-5 h-5" />
            <span className="font-medium">{totalEmployees} colaboradores ativos</span>
          </div>
          
          {/* Month Selector with navigation */}
          <div className="bg-muted rounded-lg">
            <MonthSelector 
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
