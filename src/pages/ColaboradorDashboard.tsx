import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Target, User, Trophy, AlertTriangle, Download, FileText, FileSpreadsheet, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Employee, Goal, calculateTotalPerformance, calculateGoalsPerformance, getTotalGoalsWeight, getGoalStatus, getStatusLabel, getDelayedGoalsCount, getNotDeliveredGoalsCount } from '@/types/employee';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { GoalDetailsModal } from '@/components/dashboard/GoalDetailsModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import logoWhite from '@/assets/logo-rende-white.png';
import logo from '@/assets/logo-rende-new.png';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { UserMenu } from '@/components/dashboard/UserMenu';
import { formatPercent, formatDateBR } from '@/lib/utils';
import { toast } from 'sonner';
import { usePercentageVisibility } from '@/hooks/usePercentageVisibility';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface RankingInfo {
  rank_position: number;
  total_participants: number;
  my_score: number;
}

export default function ColaboradorDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { hidePercentages, togglePercentages } = usePercentageVisibility();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [ranking, setRanking] = useState<RankingInfo | null>(null);
  const [activeModal, setActiveModal] = useState<'delayed' | 'notDelivered' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPublished, setIsPublished] = useState<boolean | null>(null);

  const fetchMyData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Check if month is published
      const { data: monthData } = await supabase
        .from('evaluation_months')
        .select('is_published')
        .eq('month', selectedMonth)
        .maybeSingle();

      const published = (monthData as any)?.is_published ?? false;
      setIsPublished(published);

      // If month is not published, don't load data for colaborador
      if (!published) {
        setEmployee(null);
        setRanking(null);
        return;
      }

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

      // Fetch monthly progress for this month
      const { data: monthlyProgress } = await supabase
        .from('goal_monthly_progress')
        .select('*')
        .eq('month', selectedMonth)
        .in('goal_id', (goalsData || []).map(g => g.id));

      // Monthly bonus
      const { data: monthlyBonus } = await supabase
        .from('employee_monthly_bonus')
        .select('*')
        .eq('employee_id', empData.id)
        .eq('month', selectedMonth)
        .maybeSingle();

      // Ranking position
      const { data: rankData } = await supabase.rpc('get_my_ranking_position', {
        target_month: selectedMonth,
      });

      if (rankData && rankData.length > 0) {
        setRanking(rankData[0] as unknown as RankingInfo);
      } else {
        setRanking(null);
      }

      const mapGoals = (type: string): Goal[] => {
        return (goalsData || [])
          .filter(g => g.goal_type === type)
          .filter(g => {
            // Only show goals that have a monthly snapshot and are not deleted
            const progress = monthlyProgress?.find(p => p.goal_id === g.id);
            return progress && !progress.is_deleted;
          })
          .map(g => {
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

  // Delayed and not delivered goals
  const delayedGoals = employee
    ? [...employee.macroGoals, ...employee.sectoralGoals]
        .filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'late')
        .map(goal => ({ goal, employee }))
    : [];

  const notDeliveredGoals = employee
    ? [...employee.macroGoals, ...employee.sectoralGoals]
        .filter(goal => getGoalStatus(goal.deadline, goal.deliveryDate) === 'not_delivered')
        .map(goal => ({ goal, employee }))
    : [];

  // Export PDF
  const exportToPDF = async () => {
    if (!employee) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const totalPerf = calculateTotalPerformance(employee);
      const macroPerf = calculateGoalsPerformance(employee.macroGoals);
      const sectoralPerf = calculateGoalsPerformance(employee.sectoralGoals);

      doc.setFontSize(18);
      doc.setTextColor(249, 115, 22);
      doc.text('Rende + | Meu Desempenho', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Mês: ${selectedMonth}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 34, { align: 'center' });

      let yPos = 48;

      // Employee info
      doc.setTextColor(60);
      doc.setFontSize(12);
      doc.text(`Colaborador: ${employee.name}`, 15, yPos); yPos += 6;
      doc.text(`Cargo: ${employee.role} | Setor: ${employee.sector}`, 15, yPos); yPos += 10;

      // Ranking
      if (ranking) {
        doc.setFillColor(249, 115, 22);
        doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`RANKING: ${ranking.rank_position}º de ${ranking.total_participants} | Pontuação: ${formatPercent(ranking.my_score)}%`, 15, yPos + 2);
        yPos += 18;
      }

      // Stats
      doc.setTextColor(60);
      doc.setFontSize(10);
      doc.text(`Metas em Atraso: ${delayedGoals.length}`, 15, yPos); yPos += 6;
      doc.text(`Metas Não Entregues: ${notDeliveredGoals.length}`, 15, yPos); yPos += 10;

      // Macro Goals
      doc.setFontSize(11);
      doc.setTextColor(249, 115, 22);
      doc.text('Metas Macro:', 15, yPos); yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(80);
      employee.macroGoals.forEach(goal => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${formatPercent(goal.achieved)}% | ${getStatusLabel(getGoalStatus(goal.deadline, goal.deliveryDate))}`, 15, yPos);
        yPos += 5;
        if (goal.observations) {
          doc.setTextColor(120);
          doc.text(`    Obs: ${goal.observations.substring(0, 80)}${goal.observations.length > 80 ? '...' : ''}`, 15, yPos);
          doc.setTextColor(80);
          yPos += 5;
        }
      });
      if (employee.macroGoals.length === 0) { doc.text('  Nenhuma meta', 15, yPos); yPos += 5; }
      doc.text(`  Subtotal Macro: ${formatPercent(macroPerf)}%`, 15, yPos); yPos += 8;

      // Sectoral Goals
      doc.setFontSize(11);
      doc.setTextColor(249, 115, 22);
      doc.text('Metas Setoriais:', 15, yPos); yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(80);
      employee.sectoralGoals.forEach(goal => {
        if (yPos > 280) { doc.addPage(); yPos = 20; }
        doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${formatPercent(goal.achieved)}% | ${getStatusLabel(getGoalStatus(goal.deadline, goal.deliveryDate))}`, 15, yPos);
        yPos += 5;
        if (goal.observations) {
          doc.setTextColor(120);
          doc.text(`    Obs: ${goal.observations.substring(0, 80)}${goal.observations.length > 80 ? '...' : ''}`, 15, yPos);
          doc.setTextColor(80);
          yPos += 5;
        }
      });
      if (employee.sectoralGoals.length === 0) { doc.text('  Nenhuma meta', 15, yPos); yPos += 5; }
      doc.text(`  Subtotal Setorial: ${formatPercent(sectoralPerf)}%`, 15, yPos); yPos += 10;

      // Summary
      doc.setFillColor(245, 245, 245);
      doc.rect(10, yPos - 3, pageWidth - 20, 16, 'F');
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Bônus: +${employee.performanceBonus}%${employee.bonusDescription ? ` (${employee.bonusDescription})` : ''}`, 15, yPos + 3);
      doc.setFontSize(12);
      doc.setTextColor(249, 115, 22);
      doc.text(`TOTAL: ${formatPercent(totalPerf)}%`, pageWidth - 50, yPos + 10);

      doc.save(`meu-desempenho-${selectedMonth}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Excel
  const exportToExcel = async () => {
    if (!employee) return;
    setIsExporting(true);
    try {
      const totalPerf = calculateTotalPerformance(employee);
      const macroPerf = calculateGoalsPerformance(employee.macroGoals);
      const sectoralPerf = calculateGoalsPerformance(employee.sectoralGoals);
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['MEU DESEMPENHO', ''],
        ['Mês', selectedMonth],
        ['Colaborador', employee.name],
        ['Cargo', employee.role],
        ['Setor', employee.sector],
        ['', ''],
        ['Ranking', ranking ? `${ranking.rank_position}º de ${ranking.total_participants}` : 'N/A'],
        ['Pontuação', ranking ? `${formatPercent(ranking.my_score)}%` : 'N/A'],
        ['Metas em Atraso', delayedGoals.length],
        ['Metas Não Entregues', notDeliveredGoals.length],
        ['', ''],
        ['Subtotal Macro (%)', formatPercent(macroPerf)],
        ['Subtotal Setorial (%)', formatPercent(sectoralPerf)],
        ['Bônus (%)', employee.performanceBonus],
        ['TOTAL (%)', formatPercent(totalPerf)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

      // Goals sheet
      const allGoals = [
        ...employee.macroGoals.map(g => ({ ...g, type: 'Macro' })),
        ...employee.sectoralGoals.map(g => ({ ...g, type: 'Setorial' })),
      ];
      const goalsRows = [
        ['Tipo', 'Meta', 'Peso (%)', 'Realizado (%)', 'Prazo', 'Entrega', 'Status', 'Observações'],
        ...allGoals.map(g => [
          g.type,
          g.name,
          g.weight,
          g.achieved,
          g.deadline ? formatDateBR(g.deadline) : '',
          g.deliveryDate ? formatDateBR(g.deliveryDate) : '',
          getStatusLabel(getGoalStatus(g.deadline, g.deliveryDate)),
          g.observations || '',
        ]),
      ];
      const wsGoals = XLSX.utils.aoa_to_sheet(goalsRows);
      wsGoals['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsGoals, 'Metas');

      XLSX.writeFile(wb, `meu-desempenho-${selectedMonth}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

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
    // Check if it's because the month is not published
    if (isPublished === false) {
      return (
        <div className="min-h-screen bg-background">
          <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img src={theme === 'dark' ? logoWhite : logo} alt="Rende +" className="h-10" />
                <div>
                  <h1 className="text-xl font-bold">Meu Painel</h1>
                  <p className="text-sm text-muted-foreground">Visualize suas metas e desempenho</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
                <ThemeToggle />
                <UserMenu />
              </div>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dados não publicados</h2>
                <p className="text-muted-foreground">
                  Os dados deste mês ainda não foram publicados pelo administrador. Tente novamente mais tarde.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

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

  const noOp = () => {};

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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge variant="secondary" className="gap-1">
              <User className="w-3 h-3" />
              Colaborador
            </Badge>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={togglePercentages}>
              {hidePercentages ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hidePercentages ? 'Mostrar %' : 'Ocultar %'}
            </Button>
            <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Ranking + Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Ranking Card */}
          <Card className="shadow-md overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Minha Posição</p>
                  <p className="text-2xl font-bold mt-1">
                    {ranking ? `${ranking.rank_position}º` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ranking ? `de ${ranking.total_participants} colaboradores` : 'Sem dados no mês'}
                  </p>
                  {ranking && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      Pontuação: {formatPercent(ranking.my_score)}%
                    </p>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delayed Goals Card */}
          <Card 
            className="shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveModal('delayed')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Metas em Atraso</p>
                  <p className="text-2xl font-bold mt-1">{delayedGoals.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">entregas atrasadas</p>
                </div>
                <div className={`p-2 rounded-lg ${delayedGoals.length > 0 ? 'bg-performance-low text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-primary mt-2 font-medium">Clique para ver detalhes →</p>
            </CardContent>
          </Card>

          {/* Not Delivered Goals Card */}
          <Card 
            className="shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveModal('notDelivered')}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Não Entregues</p>
                  <p className="text-2xl font-bold mt-1">{notDeliveredGoals.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">metas pendentes</p>
                </div>
                <div className={`p-2 rounded-lg ${notDeliveredGoals.length > 0 ? 'bg-performance-medium text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-primary mt-2 font-medium">Clique para ver detalhes →</p>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPDF} 
            disabled={isExporting}
            className="gap-1"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel} 
            disabled={isExporting}
            className="gap-1"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Employee Profile - Read Only */}
        <div className="space-y-6">
          <EmployeeProfile
            employee={employee}
            onClose={noOp}
            onUpdateGoal={noOp}
            onUpdateBonus={noOp}
            onEditEmployee={noOp}
            onDeleteEmployee={noOp}
            canEdit={false}
          />
          <PerformanceCharts employees={[employee]} />
        </div>
      </div>

      {/* Modals */}
      <GoalDetailsModal
        open={activeModal === 'delayed'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Minhas Metas em Atraso"
        type="goals"
        goalsWithEmployee={delayedGoals}
      />
      <GoalDetailsModal
        open={activeModal === 'notDelivered'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Minhas Metas Não Entregues"
        type="goals"
        goalsWithEmployee={notDeliveredGoals}
      />
    </div>
  );
}
