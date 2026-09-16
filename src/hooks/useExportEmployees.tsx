import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Goal } from '@/types/employee';
import { useAuth } from './useAuth';

interface MonthlyBonus {
  employeeId: string;
  performanceBonus: number;
  bonusDescription?: string;
}

/**
 * Loads employee data across ALL evaluation months (independent of the
 * month selected in the header) so the Export module's own filters can
 * fully control the generated report.
 */
export function useExportEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  const fetchAllMonths = useCallback(async () => {
    try {
      setIsLoading(true);

      const [employeesRes, goalsRes, progressRes, bonusRes] = await Promise.all([
        isAdmin
          ? supabase.from('employees').select('*').order('name')
          : supabase.from('employees_secure' as any).select('*').order('name'),
        supabase.from('goals').select('id, employee_id, goal_type, name, description, weight, deadline'),
        supabase.from('goal_monthly_progress')
          .select('id, goal_id, month, achieved, delivery_date, observations, goal_name, goal_description, goal_weight, goal_deadline, goal_type')
          .eq('is_deleted', false),
        supabase.from('employee_monthly_bonus').select('employee_id, month, performance_bonus, bonus_description'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (progressRes.error) throw progressRes.error;
      if (bonusRes.error) throw bonusRes.error;

      const employeesData = employeesRes.data || [];
      const goalsData = goalsRes.data || [];
      const progressData = progressRes.data || [];
      const bonusData = bonusRes.data || [];

      const goalToEmployee = new Map<string, string>();
      const goalBaseInfo = new Map<string, { employee_id: string; goal_type: string; name: string; description: string | null; weight: number; deadline: string }>();
      goalsData.forEach(g => {
        goalToEmployee.set(g.id, g.employee_id);
        goalBaseInfo.set(g.id, g);
      });

      // (employeeId, month) -> progress rows
      const progressByEmployeeMonth = new Map<string, any[]>();
      const monthsSet = new Set<string>();
      progressData.forEach(p => {
        const employeeId = goalToEmployee.get(p.goal_id);
        if (!employeeId || !p.month) return;
        monthsSet.add(p.month);
        const key = `${employeeId}|${p.month}`;
        if (!progressByEmployeeMonth.has(key)) {
          progressByEmployeeMonth.set(key, []);
        }
        progressByEmployeeMonth.get(key)!.push(p);
      });

      const bonusByEmployeeMonth = new Map<string, MonthlyBonus>();
      bonusData.forEach(b => {
        if (!b.month) return;
        monthsSet.add(b.month);
        bonusByEmployeeMonth.set(`${b.employee_id}|${b.month}`, {
          employeeId: b.employee_id,
          performanceBonus: Number(b.performance_bonus),
          bonusDescription: b.bonus_description || undefined,
        });
      });

      const months = Array.from(monthsSet).sort();

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

      const getGoalType = (p: any): string => {
        if (p.goal_type) return p.goal_type;
        const base = goalBaseInfo.get(p.goal_id);
        return base?.goal_type || 'macro';
      };

      const mapped: Employee[] = [];
      employeesData.forEach(emp => {
        months.forEach(month => {
          const empProgress = progressByEmployeeMonth.get(`${emp.id}|${month}`) || [];
          const bonus = bonusByEmployeeMonth.get(`${emp.id}|${month}`);

          // Skip months where the employee has no data at all
          if (empProgress.length === 0 && !bonus) return;

          mapped.push({
            id: `${emp.id}|${month}`,
            name: emp.name,
            photo: emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1e3a5f&color=fff&size=150`,
            role: emp.role,
            sector: emp.sector,
            referenceMonth: month,
            status: emp.status as 'active' | 'inactive',
            macroGoals: empProgress.filter(p => getGoalType(p) === 'macro').map(mapProgressToGoal),
            sectoralGoals: empProgress.filter(p => getGoalType(p) === 'sectoral').map(mapProgressToGoal),
            performanceBonus: bonus?.performanceBonus ?? 0,
            bonusDescription: bonus?.bonusDescription,
            updatedAt: emp.updated_at,
            lastModifiedBy: (emp as any).last_modified_by || undefined,
          });
        });
      });

      setEmployees(mapped);
    } catch (error) {
      console.error('Error fetching export employees:', error);
      // Fall back to whatever data was passed down
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      fetchAllMonths();
    }
  }, [user, fetchAllMonths]);

  return { employees, isLoading, refetch: fetchAllMonths };
}
