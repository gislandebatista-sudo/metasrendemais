import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'viewer' | 'colaborador';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, userRole, isColaborador, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect colaborador away from admin routes
  if (isColaborador && !requiredRole) {
    return <Navigate to="/colaborador" replace />;
  }

  // Redirect non-colaboradores away from colaborador route
  if (requiredRole === 'colaborador' && !isColaborador && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Admin can access everything
  if (requiredRole === 'colaborador' && isAdmin) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
