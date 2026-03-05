import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Target, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Employee, Goal } from '@/types/employee';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoWhite from '@/assets/logo-rende-white.png';
import logo from '@/assets/logo-rende-new.png';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { UserMenu } from '@/components/dashboard/UserMenu';

export default function ColaboradorDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const fetchMyData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Fetch employee linked to this user
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empError) throw empError;
      if (!empData) {
        setEmployee(null);
        return;
      }

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('employee_id', empData.id);

      if (goalsError) throw goalsError;

      // Check if there's monthly progress for this month
      const { data: monthlyProgress } = await supabase
        .from('goal_monthly_progress')
        .select('*')
        .eq('month', selectedMonth)
        .in('goal_id', (goalsData || []).map(g => g.id));

      // Check monthly bonus
      const { data: monthlyBonus } = await supabase
        .from('employee_monthly_bonus')
        .select('*')
        .eq('employee_id', empData.id)
        .eq('month', selectedMonth)
        .maybeSingle();

      const mapGoals = (type: string): Goal[] => {
        return (goalsData || [])
          .filter(g => g.goal_type === type)
          .map(g => {
            // Check monthly progress for this goal
            const progress = monthlyProgress?.find(p => p.goal_id === g.id);
            return {
              id: g.id,
              name: progress?.goal_name || g.name,
              description: progress?.goal_description || g.description || undefined,
              weight: Number(progress?.goal_weight ?? g.weight),
              achieved: Number(progress?.achieved ?? g.achieved),
              deadline: progress?.goal_deadline || g.deadline,
              deliveryDate: progress?.delivery_date || g.delivery_date || undefined,
              observations: progress?.observations || g.observations || undefined,
            };
          });
      };

      const mapped: Employee = {
        id: empData.id,
        name: empData.name,
        photo: empData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(empData.name)}&background=1e3a5f&color=fff&size=150`,
        role: empData.role,
        sector: empData.sector,
        referenceMonth: empData.reference_month,
        status: empData.status as 'active' | 'inactive',
        macroGoals: mapGoals('macro'),
        sectoralGoals: mapGoals('sectoral'),
        performanceBonus: Number(monthlyBonus?.performance_bonus ?? empData.performance_bonus),
        bonusDescription: monthlyBonus?.bonus_description || empData.bonus_description || undefined,
        updatedAt: empData.updated_at,
        lastModifiedBy: empData.last_modified_by || undefined,
      };

      setEmployee(mapped);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso não vinculado</h2>
            <p className="text-muted-foreground">
              Seu usuário ainda não está vinculado a um colaborador. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No-op handlers since colaborador can't edit
  const noOpGoal = () => {};
  const noOpBonus = () => {};
  const noOpEdit = () => {};
  const noOpDelete = () => {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img 
              src={theme === 'dark' ? logoWhite : logo} 
              alt="Rende +" 
              className="h-10"
            />
            <div>
              <h1 className="text-xl font-bold">Meu Painel</h1>
              <p className="text-sm text-muted-foreground">Visualize suas metas e desempenho</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <User className="w-3 h-3" />
              Colaborador
            </Badge>
            <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Employee Profile - Read Only */}
        <div className="space-y-6">
          <EmployeeProfile
            employee={employee}
            onClose={() => {}}
            onUpdateGoal={noOpGoal}
            onUpdateBonus={noOpBonus}
            onEditEmployee={noOpEdit}
            onDeleteEmployee={noOpDelete}
            canEdit={false}
          />

          {/* Performance Charts */}
          <PerformanceCharts employees={[employee]} />
        </div>
      </div>
    </div>
  );
}
