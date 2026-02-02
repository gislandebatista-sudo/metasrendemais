import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Goal } from '@/types/employee';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  // Fetch employees and their goals from database
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch employees using secure view that hides bonus data for non-admins
      // For admins, use the full employees table; for viewers, use secure view
      const { data: employeesData, error: employeesError } = isAdmin
        ? await supabase
            .from('employees')
            .select('*')
            .order('name')
        : await supabase
            .from('employees_secure' as any)
            .select('*')
            .order('name');

      if (employeesError) throw employeesError;

      // Fetch goals for all employees
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*');

      if (goalsError) throw goalsError;

      // Map to Employee type with goals
      const mappedEmployees: Employee[] = (employeesData || []).map(emp => {
        const empGoals = goalsData?.filter(g => g.employee_id === emp.id) || [];
        
        const macroGoals: Goal[] = empGoals
          .filter(g => g.goal_type === 'macro')
          .map(g => ({
            id: g.id,
            name: g.name,
            description: g.description || undefined,
            weight: Number(g.weight),
            achieved: Number(g.achieved),
            deadline: g.deadline,
            deliveryDate: g.delivery_date || undefined,
            observations: g.observations || undefined,
          }));

        const sectoralGoals: Goal[] = empGoals
          .filter(g => g.goal_type === 'sectoral')
          .map(g => ({
            id: g.id,
            name: g.name,
            description: g.description || undefined,
            weight: Number(g.weight),
            achieved: Number(g.achieved),
            deadline: g.deadline,
            deliveryDate: g.delivery_date || undefined,
            observations: g.observations || undefined,
          }));

        return {
          id: emp.id,
          name: emp.name,
          photo: emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1e3a5f&color=fff&size=150`,
          role: emp.role,
          sector: emp.sector,
          referenceMonth: emp.reference_month,
          status: emp.status as 'active' | 'inactive',
          macroGoals,
          sectoralGoals,
          performanceBonus: Number(emp.performance_bonus),
          bonusDescription: emp.bonus_description || undefined,
        };
      });

      setEmployees(mappedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user, fetchEmployees]);

  // Add or update employee
  const saveEmployee = async (employee: Employee): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Sem permissão', {
        description: 'Apenas administradores podem modificar colaboradores.',
      });
      return false;
    }

    try {
      // Check if employee exists
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employee.id)
        .single();

      const employeeData = {
        name: employee.name,
        photo: employee.photo,
        role: employee.role,
        sector: employee.sector,
        reference_month: employee.referenceMonth,
        status: employee.status,
        performance_bonus: employee.performanceBonus,
        bonus_description: employee.bonusDescription,
        created_by: user?.id,
      };

      let employeeId = employee.id;

      if (existing) {
        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);

        if (error) throw error;
      } else {
        // Insert new employee
        const { data: newEmp, error } = await supabase
          .from('employees')
          .insert(employeeData)
          .select('id')
          .single();

        if (error) throw error;
        employeeId = newEmp.id;
      }

      // Delete existing goals and insert new ones
      await supabase
        .from('goals')
        .delete()
        .eq('employee_id', employeeId);

      // Prepare goals for insertion
      const allGoals = [
        ...employee.macroGoals.map(g => ({
          employee_id: employeeId,
          name: g.name,
          description: g.description,
          weight: g.weight,
          achieved: g.achieved,
          deadline: g.deadline,
          delivery_date: g.deliveryDate || null,
          observations: g.observations,
          goal_type: 'macro' as const,
        })),
        ...employee.sectoralGoals.map(g => ({
          employee_id: employeeId,
          name: g.name,
          description: g.description,
          weight: g.weight,
          achieved: g.achieved,
          deadline: g.deadline,
          delivery_date: g.deliveryDate || null,
          observations: g.observations,
          goal_type: 'sectoral' as const,
        })),
      ];

      if (allGoals.length > 0) {
        const { error: goalsError } = await supabase
          .from('goals')
          .insert(allGoals);

        if (goalsError) throw goalsError;
      }

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

  // Update a single goal
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
      const { error } = await supabase
        .from('goals')
        .update({
          name: updates.name,
          description: updates.description,
          weight: updates.weight,
          achieved: updates.achieved,
          deadline: updates.deadline,
          delivery_date: updates.deliveryDate || null,
          observations: updates.observations,
        })
        .eq('id', goalId);

      if (error) throw error;

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

  // Update employee bonus
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
        .from('employees')
        .update({
          performance_bonus: bonus,
          bonus_description: description,
        })
        .eq('id', employeeId);

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
    fetchEmployees,
    saveEmployee,
    deleteEmployee,
    updateGoal,
    updateBonus,
  };
}
