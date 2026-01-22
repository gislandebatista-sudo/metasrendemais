import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Save, Target, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Goal, getGoalStatus, getStatusLabel, getStatusColor } from '@/types/employee';
import { cn } from '@/lib/utils';

interface GoalObservationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  goalType: 'macro' | 'sectoral';
  onSave: (observations: string) => void;
}

export function GoalObservationsModal({ 
  open, 
  onOpenChange, 
  goal, 
  goalType,
  onSave 
}: GoalObservationsModalProps) {
  const [observations, setObservations] = useState(goal.observations || '');

  useEffect(() => {
    if (open) {
      setObservations(goal.observations || '');
    }
  }, [open, goal.observations]);

  const status = getGoalStatus(goal.deadline, goal.deliveryDate);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'early': return <CheckCircle className="w-4 h-4" />;
      case 'on_time': return <Clock className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      case 'not_delivered': return <XCircle className="w-4 h-4" />;
    }
  };

  const handleSave = () => {
    onSave(observations);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Observações / Justificativas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">{goal.name}</span>
              </div>
              <Badge variant="outline" className={cn("text-xs", getStatusColor(status))}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusLabel(status)}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-primary">Peso: {goal.weight}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold">{goal.achieved.toFixed(1)}%</span>
            </div>

            <Badge variant="secondary" className="text-xs">
              Meta {goalType === 'macro' ? 'Macro' : 'Setorial'}
            </Badge>
          </div>

          {/* Observations Field */}
          <div className="space-y-2">
            <Label htmlFor="observations" className="text-sm font-medium">
              Anotações e Justificativas
            </Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Adicione observações, justificativas de atraso, comentários do gestor ou colaborador..."
              className="min-h-[150px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Use este campo para registrar justificativas, acompanhamentos ou comentários relevantes sobre esta meta.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Observações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
