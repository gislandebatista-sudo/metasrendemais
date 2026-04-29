import { Users, Send, Undo2, EyeOff, Eye, LogOut } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { UserMenu } from './UserMenu';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import logoRende from '@/assets/logo-rende-new.png';
import { brand } from '@/config/brand';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  totalEmployees: number;
  isPublished?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  isAdmin?: boolean;
  hidePercentages?: boolean;
  onTogglePercentages?: () => void;
}

export function Header({ selectedMonth, onMonthChange, totalEmployees, isPublished, onPublish, onUnpublish, isAdmin, hidePercentages, onTogglePercentages }: HeaderProps) {
  const { signOut } = useAuth();
  return (
    <header className="glass-strong rounded-2xl mb-6 shadow-elevated overflow-hidden">
      {/* Subtle ember accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* ─── Logo + Title ─── */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={logoRende}
              alt={`${brand.name} Logo`}
              className="h-12 md:h-14 w-auto object-contain relative z-10"
            />
            <div className="absolute inset-0 -m-2 bg-primary/20 blur-2xl rounded-full -z-0" />
          </div>
          <div className="border-l border-border/60 pl-5">
            <h1 className="text-lg md:text-xl font-semibold tracking-tight leading-tight text-foreground">
              {brand.dashboardTitle}
            </h1>
            <p className="font-mono-accent text-primary text-sm md:text-base font-medium mt-0.5">
              — {brand.dashboardYear}
            </p>
          </div>
        </div>

        {/* ─── Controls ─── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Users className="w-3.5 h-3.5" />
            <span className="tabular-nums">{totalEmployees}</span>
            <span className="text-primary/70">colaboradores</span>
          </div>

          {onTogglePercentages && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 hover:bg-secondary" onClick={onTogglePercentages}>
              {hidePercentages ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hidePercentages ? 'Mostrar' : 'Ocultar'}
            </Button>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Badge
                variant={isPublished ? 'default' : 'secondary'}
                className={`gap-1 h-8 px-2.5 ${isPublished ? 'bg-performance-high/15 text-performance-high border border-performance-high/30 hover:bg-performance-high/20' : 'bg-secondary text-muted-foreground border border-border'}`}
              >
                {isPublished ? '● Publicado' : '○ Rascunho'}
              </Badge>
              {isPublished ? (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={onUnpublish}>
                  <Undo2 className="w-3.5 h-3.5" />
                  Despublicar
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 text-xs h-8 shadow-glow-primary" onClick={onPublish}>
                  <Send className="w-3.5 h-3.5" />
                  Publicar
                </Button>
              )}
            </div>
          )}

          <div className="bg-secondary/60 rounded-lg border border-border/60">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          </div>

          <ThemeToggle />
          <UserMenu />
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
