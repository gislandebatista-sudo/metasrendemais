import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Pencil, Trash2, Users, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GoalManagementTableProps {
  employees: Employee[];
  selectedMonth: string;
  onRefresh: () => void;
}

interface UniqueMacroGoal {
  name: string;
  weight: number;
  deadline: string;
  count: number;
}

interface EditingState {
  name: string;
  editName: string;
  editWeight: string;
  editDeadline: string;
}

export function GoalManagementTable({ employees, selectedMonth, onRefresh }: GoalManagementTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [editingGoal, setEditingGoal] = useState<EditingState | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Extract unique macro goals from all employees
  const uniqueMacroGoals = useMemo(() => {
    const goalMap = new Map<string, UniqueMacroGoal>();
    employees.forEach(emp => {
      emp.macroGoals.forEach(goal => {
        const existing = goalMap.get(goal.name);
        if (existing) {
          existing.count++;
        } else {
          goalMap.set(goal.name, {
            name: goal.name,
            weight: goal.weight,
            deadline: goal.deadline,
            count: 1,
          });
        }
      });
    });
    return Array.from(goalMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const handleAdd = async () => {
    if (!newName.trim() || !newWeight || !newDeadline) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading('add');
    try {
      // Insert goal for all active employees
      const goalsToInsert = activeEmployees.map(emp => ({
        employee_id: emp.id,
        name: newName.trim(),
        weight: parseFloat(newWeight),
        deadline: newDeadline,
        goal_type: 'macro',
        achieved: 0,
        restrict_to_month: selectedMonth,
      }));

      const { data: insertedGoals, error } = await supabase
        .from('goals')
        .insert(goalsToInsert)
        .select('id, employee_id');
      if (error) throw error;

      // Create monthly progress snapshots
      if (insertedGoals && insertedGoals.length > 0) {
        const progressEntries = insertedGoals.map(g => ({
          goal_id: g.id,
          month: selectedMonth,
          achieved: 0,
          goal_name: newName.trim(),
          goal_weight: parseFloat(newWeight),
          goal_deadline: newDeadline,
          goal_type: 'macro',
          is_deleted: false,
        }));

        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert(progressEntries, { onConflict: 'goal_id,month' });
        if (progressError) throw progressError;
      }

      toast.success(`Meta "${newName.trim()}" criada para ${activeEmployees.length} colaboradores`);
      setIsAdding(false);
      setNewName('');
      setNewWeight('');
      setNewDeadline('');
      onRefresh();
    } catch (error) {
      console.error('Error adding macro goal:', error);
      toast.error('Erro ao adicionar meta');
    } finally {
      setLoading(null);
    }
  };

  const handleAssociateToAll = async (goalName: string, weight: number, deadline: string) => {
    setLoading(`associate-${goalName}`);
    try {
      // Find employees who don't have this goal
      const employeesWithGoal = new Set(
        employees
          .filter(emp => emp.macroGoals.some(g => g.name === goalName))
          .map(emp => emp.id)
      );

      const employeesWithout = activeEmployees.filter(emp => !employeesWithGoal.has(emp.id));

      if (employeesWithout.length === 0) {
        toast.info('Todos os colaboradores ativos já possuem esta meta');
        setLoading(null);
        return;
      }

      const goalsToInsert = employeesWithout.map(emp => ({
        employee_id: emp.id,
        name: goalName,
        weight,
        deadline,
        goal_type: 'macro',
        achieved: 0,
        restrict_to_month: selectedMonth,
      }));

      const { data: insertedGoals, error } = await supabase
        .from('goals')
        .insert(goalsToInsert)
        .select('id');
      if (error) throw error;

      if (insertedGoals && insertedGoals.length > 0) {
        const progressEntries = insertedGoals.map(g => ({
          goal_id: g.id,
          month: selectedMonth,
          achieved: 0,
          goal_name: goalName,
          goal_weight: weight,
          goal_deadline: deadline,
          goal_type: 'macro',
          is_deleted: false,
        }));

        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert(progressEntries, { onConflict: 'goal_id,month' });
        if (progressError) throw progressError;
      }

      toast.success(`Meta associada a ${employeesWithout.length} colaboradores`);
      onRefresh();
    } catch (error) {
      console.error('Error associating goal:', error);
      toast.error('Erro ao associar meta');
    } finally {
      setLoading(null);
    }
  };

  const handleEditName = async (oldName: string) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingGoal(null);
      return;
    }

    setLoading(`edit-${oldName}`);
    try {
      // Update goals table
      const { error: goalsError } = await supabase
        .from('goals')
        .update({ name: editName.trim() })
        .eq('name', oldName)
        .eq('goal_type', 'macro');
      if (goalsError) throw goalsError;

      // Update goal_monthly_progress snapshots
      const { error: progressError } = await supabase
        .from('goal_monthly_progress')
        .update({ goal_name: editName.trim() })
        .eq('goal_name', oldName)
        .eq('goal_type', 'macro');
      if (progressError) throw progressError;

      toast.success(`Meta renomeada para "${editName.trim()}"`);
      setEditingGoal(null);
      onRefresh();
    } catch (error) {
      console.error('Error editing goal name:', error);
      toast.error('Erro ao editar nome da meta');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (goalName: string) => {
    if (!confirm(`Excluir a meta "${goalName}" de todos os colaboradores?`)) return;

    setLoading(`delete-${goalName}`);
    try {
      // Get all goal IDs with this name and type
      const { data: goals, error: fetchError } = await supabase
        .from('goals')
        .select('id')
        .eq('name', goalName)
        .eq('goal_type', 'macro');
      if (fetchError) throw fetchError;

      if (goals && goals.length > 0) {
        const goalIds = goals.map(g => g.id);

        // Delete monthly progress first
        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .delete()
          .in('goal_id', goalIds);
        if (progressError) throw progressError;

        // Delete goals
        const { error: goalsError } = await supabase
          .from('goals')
          .delete()
          .in('id', goalIds);
        if (goalsError) throw goalsError;
      }

      toast.success(`Meta "${goalName}" excluída de todos os colaboradores`);
      onRefresh();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao excluir meta');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Gestão de Metas Macro
          </CardTitle>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="w-4 h-4 mr-1" />
            Nova Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome da Meta</TableHead>
              <TableHead className="w-20">Peso</TableHead>
              <TableHead className="w-32">Prazo</TableHead>
              <TableHead className="w-28">Associados</TableHead>
              <TableHead className="w-48 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell>
                  <Input
                    placeholder="Nome da meta"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    placeholder="%"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="h-8 w-16"
                    min="0"
                    max="100"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{activeEmployees.length}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={handleAdd} disabled={loading === 'add'}>
                      {loading === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-primary" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {uniqueMacroGoals.map((goal) => (
              <TableRow key={goal.name}>
                <TableCell>
                  {editingGoal === goal.name ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditName(goal.name);
                          if (e.key === 'Escape') setEditingGoal(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleEditName(goal.name)} disabled={loading === `edit-${goal.name}`}>
                        {loading === `edit-${goal.name}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-primary" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingGoal(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">{goal.name}</span>
                  )}
                </TableCell>
                <TableCell>{goal.weight}%</TableCell>
                <TableCell>{goal.deadline}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{goal.count}/{activeEmployees.length}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Editar nome"
                      onClick={() => { setEditingGoal(goal.name); setEditName(goal.name); }}
                      disabled={!!loading}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Excluir de todos"
                      onClick={() => handleDelete(goal.name)}
                      disabled={!!loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Associar a todos"
                      onClick={() => handleAssociateToAll(goal.name, goal.weight, goal.deadline)}
                      disabled={!!loading || goal.count === activeEmployees.length}
                    >
                      {loading === `associate-${goal.name}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-1" />
                          Associar
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {uniqueMacroGoals.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhuma meta macro cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
