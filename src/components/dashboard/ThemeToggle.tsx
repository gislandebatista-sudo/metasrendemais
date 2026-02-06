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
      className="h-10 w-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20"
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-primary-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-primary-foreground" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
