import { Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useModificationInfo } from '@/hooks/useModificationInfo';

interface ModificationHistoryProps {
  updatedAt?: string;
  lastModifiedBy?: string;
  className?: string;
}

export function ModificationHistory({ updatedAt, lastModifiedBy, className = '' }: ModificationHistoryProps) {
  const { modifierEmail, modifierName, isLoading } = useModificationInfo(lastModifiedBy);

  if (!updatedAt) return null;

  const formattedDate = format(new Date(updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>Última modificação: {formattedDate}</span>
      </div>
      {(modifierEmail || modifierName) && (
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>Por: {modifierName || modifierEmail || 'Usuário desconhecido'}</span>
        </div>
      )}
      {isLoading && lastModifiedBy && (
        <span className="text-muted-foreground/50">Carregando...</span>
      )}
    </div>
  );
}
