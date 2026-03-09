import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { MainStatsCards } from '@/components/dashboard/MainStatsCards';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { EmployeeFilter } from '@/components/dashboard/EmployeeFilter';
import { RankingTable } from '@/components/dashboard/RankingTable';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { ExportTab } from '@/components/dashboard/ExportTab';
import { EmployeesList } from '@/components/dashboard/EmployeesList';
import { useMonthlyEmployees } from '@/hooks/useMonthlyEmployees';
import { useEvaluationMonths } from '@/hooks/useEvaluationMonths';
import { useSectors } from '@/hooks/useSectors';
import { useAuth } from '@/hooks/useAuth';
import { Employee, Goal, getGoalStatus } from '@/types/employee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, Download, List, Loader2, Shield, Eye, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Index = () => {
  const { isAdmin } = useAuth();
  
  // Month state - default to current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Use the new monthly employees hook
  const { employees, isLoading, activeMonth, saveEmployee, deleteEmployee, updateGoal, updateBonus } = useMonthlyEmployees(selectedMonth);
  const { isMonthEditable, isMonthPublished, publishMonth, unpublishMonth, evaluationMonths } = useEvaluationMonths();
  const { sectors } = useSectors();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [selectedGoalStatus, setSelectedGoalStatus] = useState('all');
  const [selectedGoalName, setSelectedGoalName] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  
  // Check if current month is editable
  const canEdit = isAdmin && isMonthEditable(activeMonth);

  // Compute all unique goal names for the filter
  const availableGoalNames = useMemo(() => {
    const names = new Set<string>();
    employees.forEach(emp => {
      [...emp.macroGoals, ...emp.sectoralGoals].forEach(goal => {
        names.add(goal.name);
      });
    });
    return Array.from(names).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'all' || emp.sector === selectedSector;
      const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus;
      
      // Filter by goal status
      let matchesGoalStatus = true;
      if (selectedGoalStatus !== 'all') {
        const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
        matchesGoalStatus = allGoals.some(goal => 
          getGoalStatus(goal.deadline, goal.deliveryDate) === selectedGoalStatus
        );
      }

      // Filter by goal name
      let matchesGoalName = true;
      if (selectedGoalName !== 'all') {
        const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
        matchesGoalName = allGoals.some(goal => goal.name === selectedGoalName);
      }
      
      return matchesSearch && matchesSector && matchesStatus && matchesGoalStatus && matchesGoalName;
    });
  }, [employees, searchTerm, selectedSector, selectedStatus, selectedGoalStatus, selectedGoalName]);

  const handleAddEmployee = async (newEmployee: Employee) => {
    const success = await saveEmployee(newEmployee);
    if (success) {
      setEditingEmployee(undefined);
      // Update selected employee if it was edited
      if (selectedEmployee?.id === newEmployee.id) {
        setSelectedEmployee(newEmployee);
      }
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    if (!canEdit) {
      toast.error('Sem permissão', {
        description: isAdmin 
          ? 'Este mês está fechado e não pode ser editado.'
          : 'Apenas administradores podem editar colaboradores.',
      });
      return;
    }
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!canEdit) {
      toast.error('Sem permissão', {
        description: isAdmin 
          ? 'Este mês está fechado e não pode ser editado.'
          : 'Apenas administradores podem excluir colaboradores.',
      });
      return;
    }
    const success = await deleteEmployee(employeeId);
    if (success && selectedEmployee?.id === employeeId) {
      setSelectedEmployee(null);
    }
  };

  const handleUpdateGoal = async (employeeId: string, goalType: 'macro' | 'sectoral', goalId: string, updates: Partial<Goal>) => {
    const success = await updateGoal(employeeId, goalId, updates);
    if (success && selectedEmployee?.id === employeeId) {
      const goalsKey = goalType === 'macro' ? 'macroGoals' : 'sectoralGoals';
      setSelectedEmployee({
        ...selectedEmployee,
        [goalsKey]: selectedEmployee[goalsKey].map(goal =>
          goal.id === goalId ? { ...goal, ...updates } : goal
        ),
      });
    }
  };

  const handleUpdateBonus = async (employeeId: string, bonus: number, description?: string) => {
    const success = await updateBonus(employeeId, bonus, description);
    if (success && selectedEmployee?.id === employeeId) {
      setSelectedEmployee({
        ...selectedEmployee,
        performanceBonus: bonus,
        bonusDescription: description,
      });
    }
  };

  const handleOpenModal = () => {
    if (!canEdit) {
      toast.error('Sem permissão', {
        description: isAdmin 
          ? 'Este mês está fechado e não pode ser editado.'
          : 'Apenas administradores podem cadastrar colaboradores.',
      });
      return;
    }
    setEditingEmployee(undefined);
    setIsModalOpen(true);
  };

  const activeEmployeesCount = employees.filter(emp => emp.status === 'active').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <Header
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          totalEmployees={activeEmployeesCount}
          isPublished={isMonthPublished(selectedMonth)}
          onPublish={() => publishMonth(selectedMonth)}
          onUnpublish={() => unpublishMonth(selectedMonth)}
          isAdmin={isAdmin}
        />

        {/* Role and Month Status Badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge 
            variant={isAdmin ? 'default' : 'secondary'} 
            className="gap-1"
          >
            {isAdmin ? (
              <>
                <Shield className="w-3 h-3" />
                Modo Administrador
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Modo Visualização
              </>
            )}
          </Badge>
          
          {/* Month edit status */}
          {!isMonthEditable(activeMonth) && (
            <Badge variant="outline" className="gap-1 border-muted-foreground/50">
              <Lock className="w-3 h-3" />
              Mês fechado para edição
            </Badge>
          )}
          
          {!isAdmin && (
            <span className="text-sm text-muted-foreground">
              Você pode visualizar dados, mas não pode editá-los.
            </span>
          )}
        </div>

        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Colaboradores
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboards
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <MainStatsCards employees={employees} />

            <EmployeeFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              selectedGoalStatus={selectedGoalStatus}
              onGoalStatusChange={setSelectedGoalStatus}
              selectedGoalName={selectedGoalName}
              onGoalNameChange={setSelectedGoalName}
              onAddEmployee={handleOpenModal}
              availableSectors={sectors}
              availableGoalNames={availableGoalNames}
              canEdit={canEdit}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <RankingTable
                  employees={filteredEmployees}
                  onSelectEmployee={setSelectedEmployee}
                  selectedGoalName={selectedGoalName}
                />
              </div>

              <div className="lg:col-span-2">
                {selectedEmployee ? (
                  <EmployeeProfile
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    onUpdateGoal={handleUpdateGoal}
                    onUpdateBonus={handleUpdateBonus}
                    onEditEmployee={handleEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    canEdit={canEdit}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-card rounded-xl border border-dashed border-border p-8 text-center min-h-[400px]">
                    <div>
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground mb-2">
                        Selecione um colaborador no ranking
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        para visualizar detalhes e editar metas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* List Tab - Colaboradores Ativos com busca */}
          <TabsContent value="list" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <EmployeesList
                  employees={employees.filter(e => e.status === 'active')}
                  onSelectEmployee={setSelectedEmployee}
                  selectedEmployeeId={selectedEmployee?.id}
                />
              </div>

              <div className="lg:col-span-2">
                {selectedEmployee ? (
                  <EmployeeProfile
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    onUpdateGoal={handleUpdateGoal}
                    onUpdateBonus={handleUpdateBonus}
                    onEditEmployee={handleEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    canEdit={canEdit}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-card rounded-xl border border-dashed border-border p-8 text-center min-h-[400px]">
                    <div>
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground mb-2">
                        Selecione um colaborador na lista
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        para visualizar detalhes e editar metas
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <MainStatsCards employees={employees} />
            <DashboardStatsCards employees={employees} />
            <PerformanceCharts employees={employees} />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <ExportTab employees={employees} />
          </TabsContent>
        </Tabs>

        <EmployeeModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingEmployee(undefined);
          }}
          onSave={handleAddEmployee}
          employee={editingEmployee}
        />
      </div>
    </div>
  );
};

export default Index;
