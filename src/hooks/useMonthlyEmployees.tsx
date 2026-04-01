import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Goal } from '@/types/employee';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MonthlyBonus {
  employeeId: string;
  performanceBonus: number;
  bonusDescription?: string;
}

export function useMonthlyEmployees(selectedMonth: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  const activeMonth = useMemo(() => {
    if (selectedMonth === 'all') {
      return format(new Date(), 'yyyy-MM');
    }
    if (selectedMonth.length === 2) {
      return `${new Date().getFullYear()}-${selectedMonth}`;
    }
    return selectedMonth;
  }, [selectedMonth]);

  // Fetch employees with their goals built from monthly snapshots
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all data in parallel for performance
      const [employeesRes, goalsRes, progressRes, bonusRes] = await Promise.all([
        isAdmin
          ? supabase.from('employees').select('*').order('name')
          : supabase.from('employees_secure' as any).select('*').order('name'),
        supabase.from('goals').select('id, employee_id, goal_type, name, description, weight, deadline'),
        supabase.from('goal_monthly_progress').select('*').eq('month', activeMonth).eq('is_deleted', false),
        supabase.from('employee_monthly_bonus').select('*').eq('month', activeMonth),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (progressRes.error) throw progressRes.error;
      if (bonusRes.error) throw bonusRes.error;

      const employeesData = employeesRes.data;
      const goalsData = goalsRes.data;
      const progressData = progressRes.data;
      const bonusData = bonusRes.data;

      // Build a goal_id -> employee_id lookup from goals table
      const goalToEmployee = new Map<string, string>();
      const goalBaseInfo = new Map<string, { employee_id: string; goal_type: string; name: string; description: string | null; weight: number; deadline: string }>();
      (goalsData || []).forEach(g => {
        goalToEmployee.set(g.id, g.employee_id);
        goalBaseInfo.set(g.id, g);
      });

      // Group monthly progress by employee_id
      const progressByEmployee = new Map<string, any[]>();
      (progressData || []).forEach(p => {
        const employeeId = goalToEmployee.get(p.goal_id);
        if (!employeeId) return;
        if (!progressByEmployee.has(employeeId)) {
          progressByEmployee.set(employeeId, []);
        }
        progressByEmployee.get(employeeId)!.push(p);
      });

      const bonusMap = new Map<string, MonthlyBonus>();
      (bonusData || []).forEach(b => {
        bonusMap.set(b.employee_id, {
          employeeId: b.employee_id,
          performanceBonus: Number(b.performance_bonus),
          bonusDescription: b.bonus_description || undefined,
        });
      });

      // Map employees using monthly snapshot data
      const mappedEmployees: Employee[] = (employeesData || []).map(emp => {
        const empProgress = progressByEmployee.get(emp.id) || [];

        const mapProgressToGoal = (p: any): Goal => {
          const base = goalBaseInfo.get(p.goal_id);
          return {
            id: p.goal_id,
            name: p.goal_name || base?.name || 'Meta',
            description: p.goal_description || base?.description || undefined,
            weight: p.goal_weight != null ? Number(p.goal_weight) : (base?.weight ? Number(base.weight) : 0),
            achieved: Number(p.achieved),
            deadline: p.goal_deadline || base?.deadline || '',
            deliveryDate: p.delivery_date || undefined,
            observations: p.observations || undefined,
            monthlyProgressId: p.id,
          };
        };

        // Determine goal type from snapshot or base
        const getGoalType = (p: any): string => {
          if (p.goal_type) return p.goal_type;
          const base = goalBaseInfo.get(p.goal_id);
          return base?.goal_type || 'macro';
        };

        const macroGoals = empProgress
          .filter(p => getGoalType(p) === 'macro')
          .map(mapProgressToGoal);

        const sectoralGoals = empProgress
          .filter(p => getGoalType(p) === 'sectoral')
          .map(mapProgressToGoal);

        const bonus = bonusMap.get(emp.id);

        return {
          id: emp.id,
          name: emp.name,
          photo: emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1e3a5f&color=fff&size=150`,
          role: emp.role,
          sector: emp.sector,
          referenceMonth: activeMonth,
          status: emp.status as 'active' | 'inactive',
          macroGoals,
          sectoralGoals,
          performanceBonus: bonus?.performanceBonus ?? 0,
          bonusDescription: bonus?.bonusDescription,
          updatedAt: emp.updated_at,
          lastModifiedBy: (emp as any).last_modified_by || undefined,
        };
      });

      setEmployees(mappedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, activeMonth]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user, fetchEmployees]);

  // Save employee (base data + goals + monthly snapshots)
  const saveEmployee = async (employee: Employee): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem modificar colaboradores.',
      });
      return false;
    }

    try {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employee.id)
        .maybeSingle();

      const employeeData = {
        name: employee.name,
        photo: employee.photo,
        role: employee.role,
        sector: employee.sector,
        reference_month: activeMonth,
        status: employee.status,
        performance_bonus: 0,
        bonus_description: null,
        created_by: user?.id,
      };

      let employeeId = employee.id;

      if (existing) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);
        if (error) throw error;
      } else {
        const { data: newEmp, error } = await supabase
          .from('employees')
          .insert(employeeData)
          .select('id')
          .single();
        if (error) throw error;
        employeeId = newEmp.id;
      }

      // Update existing goals in-place to preserve IDs
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('id')
        .eq('employee_id', employeeId);

      const existingGoalIds = new Set((existingGoals || []).map(g => g.id));

      const allGoalsWithType = [
        ...employee.macroGoals.map(g => ({ ...g, goal_type: 'macro' as const })),
        ...employee.sectoralGoals.map(g => ({ ...g, goal_type: 'sectoral' as const })),
      ];

      const goalsToUpdate = allGoalsWithType.filter(g => existingGoalIds.has(g.id));
      const goalsToInsert = allGoalsWithType.filter(g => !existingGoalIds.has(g.id));
      const incomingIds = new Set(allGoalsWithType.map(g => g.id));
      const goalsToRemoveFromMonth = [...existingGoalIds].filter(id => !incomingIds.has(id));

      // Update existing goals base data (parallel)
      await Promise.all(goalsToUpdate.map(async (goal) => {
        const { error } = await supabase
          .from('goals')
          .update({
            name: goal.name,
            description: goal.description || null,
            weight: goal.weight,
            deadline: goal.deadline,
            goal_type: goal.goal_type,
          })
          .eq('id', goal.id);
        if (error) throw error;
      }));

      // Insert new goals
      let newGoalIds: string[] = [];
      if (goalsToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('goals')
          .insert(goalsToInsert.map(g => ({
            employee_id: employeeId,
            name: g.name,
            description: g.description || null,
            weight: g.weight,
            achieved: 0,
            deadline: g.deadline,
            delivery_date: null,
            observations: null,
            goal_type: g.goal_type,
          })))
          .select('id');
        if (insertError) throw insertError;
        newGoalIds = (inserted || []).map(g => g.id);
      }

      // SOFT-DELETE goals from THIS MONTH ONLY (mark as is_deleted in goal_monthly_progress)
      // Do NOT delete from the goals table - this preserves other months' data
      if (goalsToRemoveFromMonth.length > 0) {
        const { error: softDeleteError } = await supabase
          .from('goal_monthly_progress')
          .upsert(
            goalsToRemoveFromMonth.map(goalId => ({
              goal_id: goalId,
              month: activeMonth,
              is_deleted: true,
              achieved: 0,
            })),
            { onConflict: 'goal_id,month' }
          );
        if (softDeleteError) throw softDeleteError;
      }

      // Create/update monthly snapshot entries for ALL active goals in the current month
      const allCurrentGoalIds = [
        ...goalsToUpdate.map(g => g.id),
        ...newGoalIds,
      ];
      const allCurrentGoals = [
        ...goalsToUpdate,
        ...goalsToInsert,
      ];

      const progressEntries = allCurrentGoalIds.map((goalId, index) => {
        const originalGoal = allCurrentGoals[index];
        return {
          goal_id: goalId,
          month: activeMonth,
          achieved: originalGoal.achieved || 0,
          delivery_date: originalGoal.deliveryDate || null,
          observations: originalGoal.observations || null,
          // Snapshot fields
          goal_name: originalGoal.name,
          goal_description: originalGoal.description || null,
          goal_weight: originalGoal.weight,
          goal_deadline: originalGoal.deadline,
          goal_type: originalGoal.goal_type,
          is_deleted: false,
        };
      });

      if (progressEntries.length > 0) {
        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert(progressEntries, { onConflict: 'goal_id,month' });
        if (progressError) throw progressError;
      }

      // Save monthly bonus
      const { error: bonusError } = await supabase
        .from('employee_monthly_bonus')
        .upsert({
          employee_id: employeeId,
          month: activeMonth,
          performance_bonus: employee.performanceBonus,
          bonus_description: employee.bonusDescription,
        }, { onConflict: 'employee_id,month' });
      if (bonusError) throw bonusError;

      await fetchEmployees();
      toast.success(existing ? 'Colaborador atualizado!' : 'Colaborador cadastrado!');
      return true;
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Erro ao salvar colaborador');
      return false;
    }
  };

  // Delete employee
  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem excluir colaboradores.',
      });
      return false;
    }

    try {
      // First, clean up auth user linked to this employee
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await supabase.functions.invoke('self-register', {
          body: { action: 'delete_employee_auth', employee_id: employeeId },
        });
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);
      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== employeeId));
      toast.success('Colaborador excluído!');
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Erro ao excluir colaborador');
      return false;
    }
  };

  // Update a single goal's monthly progress + snapshot
  const updateGoal = async (
    employeeId: string,
    goalId: string,
    updates: Partial<Goal>
  ): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem modificar metas.',
      });
      return false;
    }

    try {
      // Update base goal data if structural fields changed
      const goalBaseUpdates: Record<string, any> = {};
      if (updates.name !== undefined) goalBaseUpdates.name = updates.name;
      if (updates.description !== undefined) goalBaseUpdates.description = updates.description;
      if (updates.weight !== undefined) goalBaseUpdates.weight = updates.weight;
      if (updates.deadline !== undefined) goalBaseUpdates.deadline = updates.deadline;

      if (Object.keys(goalBaseUpdates).length > 0) {
        const { error: goalError } = await supabase
          .from('goals')
          .update(goalBaseUpdates)
          .eq('id', goalId);
        if (goalError) throw goalError;
      }

      // Build monthly progress update with snapshot fields
      const progressUpdates: Record<string, any> = {};
      if (updates.achieved !== undefined) progressUpdates.achieved = updates.achieved;
      if ('deliveryDate' in updates) progressUpdates.delivery_date = updates.deliveryDate || null;
      if ('observations' in updates) progressUpdates.observations = updates.observations || null;
      if (updates.name !== undefined) progressUpdates.goal_name = updates.name;
      if (updates.description !== undefined) progressUpdates.goal_description = updates.description || null;
      if (updates.weight !== undefined) progressUpdates.goal_weight = updates.weight;
      if (updates.deadline !== undefined) progressUpdates.goal_deadline = updates.deadline;

      if (Object.keys(progressUpdates).length > 0) {
        const { error: progressError } = await supabase
          .from('goal_monthly_progress')
          .upsert({
            goal_id: goalId,
            month: activeMonth,
            ...progressUpdates,
          }, { onConflict: 'goal_id,month', ignoreDuplicates: false });
        if (progressError) throw progressError;
      }

      // Update local state
      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            macroGoals: emp.macroGoals.map(g =>
              g.id === goalId ? { ...g, ...updates } : g
            ),
            sectoralGoals: emp.sectoralGoals.map(g =>
              g.id === goalId ? { ...g, ...updates } : g
            ),
          };
        }
        return emp;
      }));

      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Erro ao atualizar meta');
      return false;
    }
  };

  // Update employee's monthly bonus
  const updateBonus = async (
    employeeId: string,
    bonus: number,
    description?: string
  ): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem modificar bônus.',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('employee_monthly_bonus')
        .upsert({
          employee_id: employeeId,
          month: activeMonth,
          performance_bonus: bonus,
          bonus_description: description,
        }, { onConflict: 'employee_id,month' });
      if (error) throw error;

      setEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            performanceBonus: bonus,
            bonusDescription: description,
          };
        }
        return emp;
      }));

      return true;
    } catch (error) {
      console.error('Error updating bonus:', error);
      toast.error('Erro ao atualizar bônus');
      return false;
    }
  };

  return {
    employees,
    isLoading,
    activeMonth,
    fetchEmployees,
    saveEmployee,
    deleteEmployee,
    updateGoal,
    updateBonus,
  };
}
