import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, ListChecks, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn(
        'min-h-[32px] h-auto py-1.5 px-2 resize-none overflow-hidden leading-tight',
        className
      )}
    />
  );
}

interface MacroGoalCompositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalName: string;
  selectedMonth: string;
  onSaved?: () => void;
}

interface TemplateRow {
  name: string;
  maxValue: number | null;
}

export function MacroGoalCompositionModal({
  open,
  onOpenChange,
  goalName,
  selectedMonth,
  onSaved,
}: MacroGoalCompositionModalProps) {
  const [template, setTemplate] = useState<TemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);

  useEffect(() => {
    if (open) loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goalName, selectedMonth]);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      // Fetch monthly_progress rows for this macro goal in this month
      const { data: progress, error: pErr } = await supabase
        .from('goal_monthly_progress')
        .select('id')
        .eq('month', selectedMonth)
        .eq('goal_name', goalName)
        .eq('goal_type', 'macro')
        .eq('is_deleted', false);
      if (pErr) throw pErr;

      const ids = (progress || []).map(p => p.id);
      setAffectedCount(ids.length);

      if (ids.length === 0) {
        setTemplate([]);
        return;
      }

      // Read existing criteria, aggregate by name (use max sort_order from first matched)
      const { data: crits, error: cErr } = await supabase
        .from('goal_score_criteria' as any)
        .select('name, max_value, sort_order, goal_monthly_progress_id')
        .in('goal_monthly_progress_id', ids)
        .order('sort_order');
      if (cErr) throw cErr;

      const map = new Map<string, TemplateRow & { sortOrder: number }>();
      (crits || []).forEach((c: any) => {
        if (!map.has(c.name)) {
          map.set(c.name, {
            name: c.name,
            maxValue: c.max_value != null ? Number(c.max_value) : null,
            sortOrder: c.sort_order,
          });
        }
      });

      setTemplate(
        Array.from(map.values())
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ name, maxValue }) => ({ name, maxValue }))
      );
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar composição');
    } finally {
      setIsLoading(false);
    }
  };

  const addRow = () =>
    setTemplate(prev => [...prev, { name: '', maxValue: null }]);

  const removeRow = (i: number) =>
    setTemplate(prev => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof TemplateRow, val: any) =>
    setTemplate(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const handleSaveToAll = async () => {
    const valid = template
      .map(r => ({ name: r.name.trim(), maxValue: r.maxValue }))
      .filter(r => r.name);

    setIsSaving(true);
    try {
      // Get all monthly_progress rows for this macro goal in this month
      const { data: progress, error: pErr } = await supabase
        .from('goal_monthly_progress')
        .select('id')
        .eq('month', selectedMonth)
        .eq('goal_name', goalName)
        .eq('goal_type', 'macro')
        .eq('is_deleted', false);
      if (pErr) throw pErr;

      const ids = (progress || []).map(p => p.id);
      if (ids.length === 0) {
        toast.info('Nenhum colaborador possui esta meta no mês selecionado');
        return;
      }

      // Load existing criteria to preserve values when names match
      const { data: existing, error: exErr } = await supabase
        .from('goal_score_criteria' as any)
        .select('goal_monthly_progress_id, name, value')
        .in('goal_monthly_progress_id', ids);
      if (exErr) throw exErr;

      const valueByKey = new Map<string, number>();
      (existing || []).forEach((c: any) => {
        valueByKey.set(`${c.goal_monthly_progress_id}::${c.name}`, Number(c.value));
      });

      // Delete all existing criteria for these progress rows
      const { error: delErr } = await supabase
        .from('goal_score_criteria' as any)
        .delete()
        .in('goal_monthly_progress_id', ids);
      if (delErr) throw delErr;

      // Build inserts (skip entirely if template empty — composition cleared)
      if (valid.length > 0) {
        const rows = ids.flatMap(pid =>
          valid.map((c, i) => ({
            goal_monthly_progress_id: pid,
            name: c.name,
            value: valueByKey.get(`${pid}::${c.name}`) ?? 0,
            max_value: c.maxValue,
            sort_order: i,
          }))
        );

        const { error: insErr } = await supabase
          .from('goal_score_criteria' as any)
          .insert(rows);
        if (insErr) throw insErr;
      }

      toast.success(
        valid.length === 0
          ? `Composição removida de ${ids.length} colaborador(es)`
          : `Composição aplicada a ${ids.length} colaborador(es)`
      );
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar composição');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Composição — {goalName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            Será aplicada a {affectedCount} colaborador(es) no mês {selectedMonth}. Notas já lançadas serão preservadas quando o nome do critério coincidir.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-6">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[65%]">Critério</TableHead>
                  <TableHead className="text-right">Máx</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Nenhum critério. Clique em "Adicionar" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  template.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={e => updateRow(i, 'name', e.target.value)}
                          placeholder="Nome do critério"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.maxValue ?? ''}
                          onChange={e =>
                            updateRow(i, 'maxValue', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          placeholder="—"
                          className="h-8 text-sm text-right w-20 ml-auto"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeRow(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="w-4 h-4" />
                Adicionar Critério
              </Button>
              <Button
                size="sm"
                onClick={handleSaveToAll}
                disabled={isSaving || affectedCount === 0}
                className="gap-1"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Aplicar a Todos'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
