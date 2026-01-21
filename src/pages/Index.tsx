import { useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { EmployeeFilter } from '@/components/dashboard/EmployeeFilter';
import { RankingTable } from '@/components/dashboard/RankingTable';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { ExportTab } from '@/components/dashboard/ExportTab';
import { mockEmployees } from '@/data/mockEmployees';
import { Employee, Goal, getGoalStatus } from '@/types/employee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BarChart3, Save, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Index = () => {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [selectedGoalStatus, setSelectedGoalStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'all' || emp.sector === selectedSector;
      const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus;
      const matchesMonth = selectedMonth === 'all' || emp.referenceMonth.endsWith(`-${selectedMonth}`);
      
      // Filter by goal status
      let matchesGoalStatus = true;
      if (selectedGoalStatus !== 'all') {
        const allGoals = [...emp.macroGoals, ...emp.sectoralGoals];
        matchesGoalStatus = allGoals.some(goal => 
          getGoalStatus(goal.deadline, goal.deliveryDate) === selectedGoalStatus
        );
      }
      
      return matchesSearch && matchesSector && matchesStatus && matchesMonth && matchesGoalStatus;
    });
  }, [employees, searchTerm, selectedSector, selectedStatus, selectedMonth, selectedGoalStatus]);

  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setHasUnsavedChanges(false);
    setIsSaving(false);
    toast.success('Alterações salvas com sucesso!', {
      description: 'Todas as informações foram atualizadas.',
      icon: <Check className="w-4 h-4" />,
    });
  }, []);

  const handleAddEmployee = (newEmployee: Employee) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployees(employees.map(emp => 
        emp.id === newEmployee.id ? newEmployee : emp
      ));
      if (selectedEmployee?.id === newEmployee.id) {
        setSelectedEmployee(newEmployee);
      }
    } else {
      // Add new employee
      setEmployees([...employees, newEmployee]);
    }
    setEditingEmployee(undefined);
    setHasUnsavedChanges(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees(employees.filter(emp => emp.id !== employeeId));
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee(null);
    }
    setHasUnsavedChanges(true);
  };

  const handleUpdateGoal = (employeeId: string, goalType: 'macro' | 'sectoral', goalId: string, updates: Partial<Goal>) => {
    setEmployees(employees.map(emp => {
      if (emp.id === employeeId) {
        const goalsKey = goalType === 'macro' ? 'macroGoals' : 'sectoralGoals';
        return {
          ...emp,
          [goalsKey]: emp[goalsKey].map(goal => 
            goal.id === goalId ? { ...goal, ...updates } : goal
          ),
        };
      }
      return emp;
    }));

    // Update selected employee if it's the one being edited
    if (selectedEmployee?.id === employeeId) {
      const goalsKey = goalType === 'macro' ? 'macroGoals' : 'sectoralGoals';
      setSelectedEmployee({
        ...selectedEmployee,
        [goalsKey]: selectedEmployee[goalsKey].map(goal =>
          goal.id === goalId ? { ...goal, ...updates } : goal
        ),
      });
    }
    setHasUnsavedChanges(true);
  };

  const handleUpdateBonus = (employeeId: string, bonus: number, description?: string) => {
    setEmployees(employees.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          performanceBonus: bonus,
          bonusDescription: description,
        };
      }
      return emp;
    }));

    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee({
        ...selectedEmployee,
        performanceBonus: bonus,
        bonusDescription: description,
      });
    }
    setHasUnsavedChanges(true);
  };

  const handleOpenModal = () => {
    setEditingEmployee(undefined);
    setIsModalOpen(true);
  };

  const activeEmployeesCount = employees.filter(emp => emp.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <Header
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          totalEmployees={activeEmployeesCount}
        />

        {/* Save Button - Fixed position */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              size="lg"
              className="shadow-lg gap-2"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        )}

        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="employees" className="gap-2">
              <Users className="w-4 h-4" />
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
            <StatsCards employees={employees} />

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
              onAddEmployee={handleOpenModal}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <RankingTable
                  employees={filteredEmployees}
                  onSelectEmployee={setSelectedEmployee}
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

          <TabsContent value="analytics" className="space-y-6">
            <StatsCards employees={employees} />
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
