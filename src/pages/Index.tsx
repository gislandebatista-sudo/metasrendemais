import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { EmployeeFilter } from '@/components/dashboard/EmployeeFilter';
import { RankingTable } from '@/components/dashboard/RankingTable';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { mockEmployees } from '@/data/mockEmployees';
import { Employee, Goal, getGoalStatus, GoalStatus } from '@/types/employee';

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                onEditEmployee={handleEditEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-card rounded-xl border border-dashed border-border p-8 text-center">
                <div>
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

        <PerformanceCharts employees={employees} />

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
