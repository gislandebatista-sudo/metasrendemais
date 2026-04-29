import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 rounded-lg hover:bg-secondary border border-border/60"
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-3.5 w-3.5 text-foreground" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-foreground" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
