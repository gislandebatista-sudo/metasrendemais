import { Users } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import logoRende from '@/assets/logo-rende-white.png';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  totalEmployees: number;
}

export function Header({ selectedMonth, onMonthChange, totalEmployees }: HeaderProps) {
  return (
    <header className="gradient-primary text-primary-foreground p-6 rounded-2xl mb-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo + Title Section */}
        <div className="flex items-center gap-5">
          <img 
            src={logoRende} 
            alt="Rende+ Logo" 
            className="h-20 md:h-24 w-auto object-contain drop-shadow-lg"
          />
          <div className="border-l-2 border-primary-foreground/30 pl-5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">
              Gerenciamento de metas
            </h1>
            <p className="text-primary-foreground/80 text-lg md:text-xl font-semibold mt-0.5">
              2026
            </p>
          </div>
        </div>
        
        {/* Controls Section */}
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

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
