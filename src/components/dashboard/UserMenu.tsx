import { LogOut, User, Shield, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function UserMenu() {
  const { user, userRole, isAdmin, signOut } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email}
            </p>
            <Badge 
              variant={isAdmin ? 'default' : 'secondary'} 
              className="w-fit gap-1"
            >
              {isAdmin ? (
                <>
                  <Shield className="w-3 h-3" />
                  Administrador
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  Visualizador
                </>
              )}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
