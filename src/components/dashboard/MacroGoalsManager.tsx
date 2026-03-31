import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Goal } from '@/types/employee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MacroGoalRow {
  name: string;
  description?: string;
  weight: number;
  deadline: string;
  employeeCount: number;
  goalIds: string[];
}

interface MacroGoalsManagerProps {
  employees: Employee[];
  selectedMonth: string;
  canEdit: boolean;
  onRefresh: () => void;
}

interface GoalFormData {
  name: string;
  description: string;
  weight: string;
  deadline: string;
}

const emptyForm = (): GoalFormData => ({ name: '', description: '', weight: '', deadline: '' });

export function MacroGoalsManager({ employees, selectedMonth, canEdit, onRefresh }: MacroGoalsManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGoalName, setEditingGoalName] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<GoalFormData>(emptyForm());
  const [editForm, setEditForm] = useState<GoalFormData>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const macroGoalRows = useMemo((): MacroGoalRow[] => {
    const map = new Map<string, MacroGoalRow>();
    for (const emp of employees) {
      for (const goal of emp.macroGoals) {
        if (!map.has(goal.name)) {
          map.set(goal.name, {
            name: goal.name,
            description: goal.description,
            weight: goal.weight,
            deadline: goal.deadline,
            employeeCount: 0,
            goalIds: [],
          });
        }
        const row = map.get(goal.name)!;
        row.employeeCount += 1;
        row.goalIds.push(goal.id);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.deadline) {
      toast.error('Nome e prazo são obrigatórios');
      return;
    }
    setIsSaving(true);
    try {
      const weight = parseFloat(createForm.weight) || 0;
      const deadline = createForm.deadline;
      const description = createForm.description || null;

      for (const emp of activeEmployees) {
        const alreadyHas = emp.macroGoals.some(g => g.name === createForm.name);
        if (alreadyHas) continue;

        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            employee_id: emp.id,
            name: createForm.name,
            description,
            weight,
            achieved: 0,
            deadline,
            goal_type: 'macro',
          })
          .select('id')
          .single();
        if (goalError) throw goalError;

        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert({
            goal_id: goalData.id,
            month: selectedMonth,
            achieved: 0,
            goal_name: createForm.name,
            goal_description: description,
            goal_weight: weight,
            goal_deadline: deadline,
            goal_type: 'macro',
            is_deleted: false,
          }, { onConflict: 'goal_id,month' });
        if (progressError) throw progressError;
      }

      toast.success(`Meta macro "${createForm.name}" criada e aplicada a ${activeEmployees.length} colaborador(es)`);
      setCreateForm(emptyForm());
      setShowCreateForm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar meta macro');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (row: MacroGoalRow) => {
    setEditingGoalName(row.name);
    setEditForm({
      name: row.name,
      description: row.description || '',
      weight: row.weight === 0 ? '' : String(row.weight),
      deadline: row.deadline,
    });
  };

  const handleSaveEdit = async (originalName: string) => {
    if (!editForm.name || !editForm.deadline) {
      toast.error('Nome e prazo são obrigatórios');
      return;
    }
    setIsSaving(true);
    try {
      const weight = parseFloat(editForm.weight) || 0;
      const deadline = editForm.deadline;
      const description = editForm.description || null;

      for (const emp of employees) {
        for (const goal of emp.macroGoals) {
          if (goal.name !== originalName) continue;

          const { error: goalError } = await supabase
            .from('goals')
            .update({ name: editForm.name, description, weight, deadline })
            .eq('id', goal.id);
          if (goalError) throw goalError;

          const { error: progressError } = await supabase
            .from('goal_monthly_progress')
            .upsert({
              goal_id: goal.id,
              month: selectedMonth,
              goal_name: editForm.name,
              goal_description: description,
              goal_weight: weight,
              goal_deadline: deadline,
            }, { onConflict: 'goal_id,month', ignoreDuplicates: false });
          if (progressError) throw progressError;
        }
      }

      toast.success(`Meta "${originalName}" atualizada em todos os colaboradores`);
      setEditingGoalName(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar meta macro');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToAll = async (row: MacroGoalRow) => {
    setIsSaving(true);
    try {
      let applied = 0;
      for (const emp of activeEmployees) {
        const alreadyHas = emp.macroGoals.some(g => g.name === row.name);
        if (alreadyHas) continue;

        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            employee_id: emp.id,
            name: row.name,
            description: row.description || null,
            weight: row.weight,
            achieved: 0,
            deadline: row.deadline,
            goal_type: 'macro',
          })
          .select('id')
          .single();
        if (goalError) throw goalError;

        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert({
            goal_id: goalData.id,
            month: selectedMonth,
            achieved: 0,
            goal_name: row.name,
            goal_description: row.description || null,
            goal_weight: row.weight,
            goal_deadline: row.deadline,
            goal_type: 'macro',
            is_deleted: false,
          }, { onConflict: 'goal_id,month' });
        if (progressError) throw progressError;

        applied++;
      }

      if (applied === 0) {
        toast.info('Todos os colaboradores ativos já possuem esta meta');
      } else {
        toast.success(`Meta aplicada a ${applied} colaborador(es)`);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aplicar meta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: MacroGoalRow) => {
    setIsSaving(true);
    try {
      for (const goalId of row.goalIds) {
        const { error } = await supabase
          .from('goal_monthly_progress')
          .upsert({
            goal_id: goalId,
            month: selectedMonth,
            is_deleted: true,
            achieved: 0,
          }, { onConflict: 'goal_id,month' });
        if (error) throw error;
      }

      toast.success(`Meta "${row.name}" removida de ${row.employeeCount} colaborador(es) neste mês`);
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover meta macro');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="macro-goals-manager-toggle"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Metas Macros</h3>
          <Badge variant="secondary" className="text-xs" data-testid="macro-goals-count">
            {macroGoalRows.length}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {macroGoalRows.length === 0 && !showCreateForm ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhuma meta macro definida para este mês.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[22%]">Nome</TableHead>
                    <TableHead className="w-[28%]">Descrição</TableHead>
                    <TableHead className="w-[10%] text-right">Peso %</TableHead>
                    <TableHead className="w-[13%]">Prazo</TableHead>
                    <TableHead className="w-[10%] text-center">Colaboradores</TableHead>
                    <TableHead className="w-[17%] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {macroGoalRows.map((row) =>
                    editingGoalName === row.name ? (
                      <TableRow key={row.name} className="bg-muted/20" data-testid={`macro-goal-edit-row-${row.name}`}>
                        <TableCell>
                          <Input
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Nome"
                            data-testid="input-edit-goal-name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Descrição (opcional)"
                            data-testid="input-edit-goal-description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editForm.weight}
                            onChange={e => setEditForm({ ...editForm, weight: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="0"
                            data-testid="input-edit-goal-weight"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editForm.deadline}
                            onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                            className="h-8 text-sm"
                            data-testid="input-edit-goal-deadline"
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary hover:text-primary"
                              onClick={() => handleSaveEdit(row.name)}
                              disabled={isSaving}
                              data-testid="button-save-edit-goal"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditingGoalName(null)}
                              disabled={isSaving}
                              data-testid="button-cancel-edit-goal"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={row.name} data-testid={`macro-goal-row-${row.name}`}>
                        <TableCell className="font-medium text-sm">{row.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {row.description || <span className="italic text-muted-foreground/60">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {row.weight > 0 ? `${row.weight}%` : <span className="text-muted-foreground/60">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{row.deadline}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs" data-testid={`text-goal-employee-count-${row.name}`}>
                            {row.employeeCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleApplyToAll(row)}
                              disabled={isSaving}
                              data-testid={`button-apply-all-${row.name}`}
                            >
                              Aplicar a todos
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(row)}
                              disabled={isSaving}
                              data-testid={`button-edit-goal-${row.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(row)}
                              disabled={isSaving}
                              data-testid={`button-delete-goal-${row.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}

                  {showCreateForm && (
                    <TableRow className="bg-muted/20" data-testid="macro-goal-create-row">
                      <TableCell>
                        <Input
                          value={createForm.name}
                          onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Nome *"
                          data-testid="input-create-goal-name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={createForm.description}
                          onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Descrição (opcional)"
                          data-testid="input-create-goal-description"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={createForm.weight}
                          onChange={e => setCreateForm({ ...createForm, weight: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="0"
                          data-testid="input-create-goal-weight"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={createForm.deadline}
                          onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })}
                          className="h-8 text-sm"
                          data-testid="input-create-goal-deadline"
                        />
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary hover:text-primary"
                            onClick={handleCreate}
                            disabled={isSaving || !createForm.name || !createForm.deadline}
                            data-testid="button-save-create-goal"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => { setShowCreateForm(false); setCreateForm(emptyForm()); }}
                            disabled={isSaving}
                            data-testid="button-cancel-create-goal"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className={cn('px-4 py-3', macroGoalRows.length > 0 || showCreateForm ? 'border-t border-border' : '')}>
            {!showCreateForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowCreateForm(true); setEditingGoalName(null); }}
                disabled={isSaving}
                data-testid="button-new-macro-goal"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nova Meta Macro
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
