import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { EmployeeFilter } from '@/components/dashboard/EmployeeFilter';
import { RankingTable } from '@/components/dashboard/RankingTable';
import { EmployeeProfile } from '@/components/dashboard/EmployeeProfile';
import { PerformanceCharts } from '@/components/dashboard/PerformanceCharts';
import { EmployeeModal } from '@/components/dashboard/EmployeeModal';
import { mockEmployees } from '@/data/mockEmployees';
import { Employee } from '@/types/employee';

const Index = () => {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'all' || emp.sector === selectedSector;
      return matchesSearch && matchesSector;
    });
  }, [employees, searchTerm, selectedSector]);

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees([...employees, newEmployee]);
  };

  const handleUpdateGoal = (employeeId: string, goalId: string, achieved: number) => {
    setEmployees(employees.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          goals: emp.goals.map(goal => 
            goal.id === goalId ? { ...goal, achieved } : goal
          ),
        };
      }
      return emp;
    }));

    // Update selected employee if it's the one being edited
    if (selectedEmployee?.id === employeeId) {
      setSelectedEmployee({
        ...selectedEmployee,
        goals: selectedEmployee.goals.map(goal =>
          goal.id === goalId ? { ...goal, achieved } : goal
        ),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <Header
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          totalEmployees={employees.length}
        />

        <StatsCards employees={employees} />

        <EmployeeFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedSector={selectedSector}
          onSectorChange={setSelectedSector}
          onAddEmployee={() => setIsModalOpen(true)}
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
          onOpenChange={setIsModalOpen}
          onSave={handleAddEmployee}
        />
      </div>
    </div>
  );
};

export default Index;
