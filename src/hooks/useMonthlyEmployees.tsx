import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Goal } from '@/types/employee';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MonthlyProgress {
  goalId: string;
  achieved: number;
  deliveryDate?: string;
  observations?: string;
}

interface MonthlyBonus {
  employeeId: string;
  performanceBonus: number;
  bonusDescription?: string;
}

export function useMonthlyEmployees(selectedMonth: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  // Get the active month or default to current
  const activeMonth = useMemo(() => {
    if (selectedMonth === 'all') {
      return format(new Date(), 'yyyy-MM');
    }
    // If selectedMonth is just MM format, convert to YYYY-MM
    if (selectedMonth.length === 2) {
      return `${new Date().getFullYear()}-${selectedMonth}`;
    }
    return selectedMonth;
  }, [selectedMonth]);

  // Fetch employees with their goals and monthly progress
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch employees
      const { data: employeesData, error: employeesError } = isAdmin
        ? await supabase.from('employees').select('*').order('name')
        : await supabase.from('employees_secure' as any).select('*').order('name');

      if (employeesError) throw employeesError;

      // Fetch goals (base templates)
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*');

      if (goalsError) throw goalsError;

      // Fetch monthly progress for the selected month
      const { data: progressData, error: progressError } = await supabase
        .from('goal_monthly_progress')
        .select('*')
        .eq('month', activeMonth);

      if (progressError) throw progressError;

      // Fetch monthly bonuses for the selected month
      const { data: bonusData, error: bonusError } = await supabase
        .from('employee_monthly_bonus')
        .select('*')
        .eq('month', activeMonth);

      if (bonusError) throw bonusError;

      // Create lookup maps for faster access
      const progressMap = new Map<string, MonthlyProgress>();
      (progressData || []).forEach(p => {
        progressMap.set(p.goal_id, {
          goalId: p.goal_id,
          achieved: Number(p.achieved),
          deliveryDate: p.delivery_date || undefined,
          observations: p.observations || undefined,
        });
      });

      const bonusMap = new Map<string, MonthlyBonus>();
      (bonusData || []).forEach(b => {
        bonusMap.set(b.employee_id, {
          employeeId: b.employee_id,
          performanceBonus: Number(b.performance_bonus),
          bonusDescription: b.bonus_description || undefined,
        });
      });

      // Map employees with their goals and monthly data
      const mappedEmployees: Employee[] = (employeesData || []).map(emp => {
        const empGoals = goalsData?.filter(g => g.employee_id === emp.id) || [];
        
        const mapGoal = (g: any): Goal => {
          const progress = progressMap.get(g.id);
          return {
            id: g.id,
            name: g.name,
            description: g.description || undefined,
            weight: Number(g.weight),
            // Use monthly progress if available, otherwise 0
            achieved: progress?.achieved ?? 0,
            deadline: g.deadline,
            deliveryDate: progress?.deliveryDate,
            observations: progress?.observations,
          };
        };

        const macroGoals = empGoals.filter(g => g.goal_type === 'macro').map(mapGoal);
        const sectoralGoals = empGoals.filter(g => g.goal_type === 'sectoral').map(mapGoal);

        // Get monthly bonus or default to 0
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

  // Save employee (base data only - goals and progress are separate)
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
        performance_bonus: 0, // Deprecated - now stored in employee_monthly_bonus
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

      // Delete existing goals for this employee and recreate
      await supabase.from('goals').delete().eq('employee_id', employeeId);

      // Prepare goals for insertion (base templates)
      const allGoals = [
        ...employee.macroGoals.map(g => ({
          employee_id: employeeId,
          name: g.name,
          description: g.description,
          weight: g.weight,
          achieved: 0, // Deprecated - now in goal_monthly_progress
          deadline: g.deadline,
          delivery_date: null,
          observations: null,
          goal_type: 'macro' as const,
        })),
        ...employee.sectoralGoals.map(g => ({
          employee_id: employeeId,
          name: g.name,
          description: g.description,
          weight: g.weight,
          achieved: 0,
          deadline: g.deadline,
          delivery_date: null,
          observations: null,
          goal_type: 'sectoral' as const,
        })),
      ];

      if (allGoals.length > 0) {
        const { data: insertedGoals, error: goalsError } = await supabase
          .from('goals')
          .insert(allGoals)
          .select('id');

        if (goalsError) throw goalsError;

        // Create monthly progress entries for the new goals
        const progressEntries = insertedGoals?.map((goal, index) => {
          const originalGoal = index < employee.macroGoals.length 
            ? employee.macroGoals[index]
            : employee.sectoralGoals[index - employee.macroGoals.length];
          
          return {
            goal_id: goal.id,
            month: activeMonth,
            achieved: originalGoal.achieved || 0,
            delivery_date: originalGoal.deliveryDate || null,
            observations: originalGoal.observations || null,
          };
        }) || [];

        if (progressEntries.length > 0) {
          const { error: progressError } = await supabase
            .from('goal_monthly_progress')
            .upsert(progressEntries, { onConflict: 'goal_id,month' });

          if (progressError) throw progressError;
        }
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

  // Update a single goal's monthly progress
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
      // Update base goal data (name, weight, deadline) - only if those fields are present
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

      // Build only the fields that were actually updated for monthly progress
      const progressUpdates: Record<string, any> = {};
      if (updates.achieved !== undefined) progressUpdates.achieved = updates.achieved;
      if ('deliveryDate' in updates) progressUpdates.delivery_date = updates.deliveryDate || null;
      if ('observations' in updates) progressUpdates.observations = updates.observations || null;

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
