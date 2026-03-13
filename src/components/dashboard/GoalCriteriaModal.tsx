import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { GoalCriteria } from '@/types/employee';
import { toast } from 'sonner';
import { formatPercent } from '@/lib/utils';

interface GoalCriteriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalName: string;
  goalAchieved: number;
  goalWeight: number;
  monthlyProgressId: string | undefined;
  readOnly?: boolean;
  onCriteriaSaved?: () => void;
}

interface CriteriaRow {
  id?: string;
  name: string;
  value: number;
  maxValue: number | null;
  sortOrder: number;
  isNew?: boolean;
}

export function GoalCriteriaModal({
  open,
  onOpenChange,
  goalName,
  goalAchieved,
  goalWeight,
  monthlyProgressId,
  readOnly = false,
  onCriteriaSaved,
}: GoalCriteriaModalProps) {
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && monthlyProgressId) {
      fetchCriteria();
    }
  }, [open, monthlyProgressId]);

  const fetchCriteria = async () => {
    if (!monthlyProgressId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('goal_score_criteria' as any)
        .select('*')
        .eq('goal_monthly_progress_id', monthlyProgressId)
        .order('sort_order');

      if (error) throw error;
      setCriteria(
        (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          value: Number(c.value),
          maxValue: c.max_value != null ? Number(c.max_value) : null,
          sortOrder: c.sort_order,
        }))
      );
    } catch (error) {
      console.error('Error fetching criteria:', error);
      toast.error('Erro ao carregar critérios');
    } finally {
      setIsLoading(false);
    }
  };

  const addRow = () => {
    setCriteria(prev => [
      ...prev,
      { name: '', value: 0, maxValue: null, sortOrder: prev.length, isNew: true },
    ]);
  };

  const removeRow = (index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof CriteriaRow, val: any) => {
    setCriteria(prev => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  const handleSave = async () => {
    if (!monthlyProgressId) return;
    setIsSaving(true);
    try {
      // Delete all existing criteria for this progress entry
      const { error: delError } = await supabase
        .from('goal_score_criteria' as any)
        .delete()
        .eq('goal_monthly_progress_id', monthlyProgressId);
      if (delError) throw delError;

      // Insert current criteria
      const validCriteria = criteria.filter(c => c.name.trim());
      if (validCriteria.length > 0) {
        const { error: insError } = await supabase
          .from('goal_score_criteria' as any)
          .insert(
            validCriteria.map((c, i) => ({
              goal_monthly_progress_id: monthlyProgressId,
              name: c.name.trim(),
              value: c.value,
              max_value: c.maxValue,
              sort_order: i,
            }))
          );
        if (insError) throw insError;
      }

      toast.success('Composição salva com sucesso!');
      onCriteriaSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving criteria:', error);
      toast.error('Erro ao salvar composição');
    } finally {
      setIsSaving(false);
    }
  };

  const totalValue = criteria.reduce((sum, c) => sum + (c.value || 0), 0);
  const totalMax = criteria.some(c => c.maxValue != null)
    ? criteria.reduce((sum, c) => sum + (c.maxValue ?? 0), 0)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Composição — {goalName} ({formatPercent(goalAchieved)}%)
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-6">Carregando...</p>
        ) : !monthlyProgressId ? (
          <p className="text-center text-muted-foreground py-6">
            Não há dados de progresso mensal para esta meta neste mês.
          </p>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Critério</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead className="text-right">Máx</TableHead>
                  {!readOnly && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criteria.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 3 : 4} className="text-center text-muted-foreground py-6">
                      {readOnly ? 'Nenhum critério cadastrado para esta meta.' : 'Nenhum critério. Clique em "Adicionar" para começar.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  criteria.map((row, i) => (
                    <TableRow key={row.id || `new-${i}`}>
                      <TableCell>
                        {readOnly ? (
                          <span className="text-sm">{row.name}</span>
                        ) : (
                          <Input
                            value={row.name}
                            onChange={e => updateRow(i, 'name', e.target.value)}
                            placeholder="Nome do critério"
                            className="h-8 text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {readOnly ? (
                          <span className="font-medium">{formatPercent(row.value)}</span>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.value}
                            onChange={e => updateRow(i, 'value', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right w-20 ml-auto"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {readOnly ? (
                          <span className="text-muted-foreground">{row.maxValue != null ? formatPercent(row.maxValue) : '—'}</span>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.maxValue ?? ''}
                            onChange={e => updateRow(i, 'maxValue', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="—"
                            className="h-8 text-sm text-right w-20 ml-auto"
                          />
                        )}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(i)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
                {/* Total row */}
                {criteria.length > 0 && (
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-primary">{formatPercent(totalValue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalMax != null ? formatPercent(totalMax) : '—'}
                    </TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {!readOnly && (
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Adicionar Critério
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Composição'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
