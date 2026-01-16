import { useState, useEffect } from 'react';
import { X, Plus, Trash2, UserPlus, Target, Briefcase, Gift, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Employee, Goal, getTotalGoalsWeight } from '@/types/employee';
import { sectors, months } from '@/data/mockEmployees';

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (employee: Employee) => void;
  employee?: Employee;
}

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

export function EmployeeModal({ open, onOpenChange, onSave, employee }: EmployeeModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    photo: '',
    role: '',
    sector: '',
    admissionDate: '',
    referenceMonth: `${currentYear}-${currentMonth}`,
    status: 'active',
    macroGoals: [],
    sectoralGoals: [],
    performanceBonus: 0,
  });

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        name: '',
        photo: '',
        role: '',
        sector: '',
        admissionDate: '',
        referenceMonth: `${currentYear}-${currentMonth}`,
        status: 'active',
        macroGoals: [],
        sectoralGoals: [],
        performanceBonus: 0,
      });
    }
  }, [employee, open]);

  const [newMacroGoal, setNewMacroGoal] = useState<Partial<Goal>>({
    name: '',
    description: '',
    weight: 0,
    achieved: 0,
    deadline: '',
    deliveryDate: '',
  });

  const [newSectoralGoal, setNewSectoralGoal] = useState<Partial<Goal>>({
    name: '',
    description: '',
    weight: 0,
    achieved: 0,
    deadline: '',
    deliveryDate: '',
  });

  const handleAddGoal = (type: 'macro' | 'sectoral') => {
    const goalData = type === 'macro' ? newMacroGoal : newSectoralGoal;
    const goalsKey = type === 'macro' ? 'macroGoals' : 'sectoralGoals';
    const currentGoals = formData[goalsKey] || [];
    const maxGoals = type === 'macro' ? 5 : 10;

    if (goalData.name && goalData.weight && goalData.deadline && currentGoals.length < maxGoals) {
      const goal: Goal = {
        id: `${type.charAt(0)}g${Date.now()}`,
        name: goalData.name || '',
        description: goalData.description,
        weight: goalData.weight || 0,
        achieved: goalData.achieved || 0,
        deadline: goalData.deadline || '',
        deliveryDate: goalData.deliveryDate || undefined,
      };
      setFormData({
        ...formData,
        [goalsKey]: [...currentGoals, goal],
      });
      
      if (type === 'macro') {
        setNewMacroGoal({ name: '', description: '', weight: 0, achieved: 0, deadline: '', deliveryDate: '' });
      } else {
        setNewSectoralGoal({ name: '', description: '', weight: 0, achieved: 0, deadline: '', deliveryDate: '' });
      }
    }
  };

  const handleRemoveGoal = (type: 'macro' | 'sectoral', goalId: string) => {
    const goalsKey = type === 'macro' ? 'macroGoals' : 'sectoralGoals';
    setFormData({
      ...formData,
      [goalsKey]: (formData[goalsKey] || []).filter(g => g.id !== goalId),
    });
  };

  const handleSubmit = () => {
    if (formData.name && formData.role && formData.sector) {
      const employeeData: Employee = {
        id: employee?.id || `emp${Date.now()}`,
        name: formData.name,
        photo: formData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=1e3a5f&color=fff&size=150`,
        role: formData.role,
        sector: formData.sector,
        admissionDate: formData.admissionDate,
        referenceMonth: formData.referenceMonth || `${currentYear}-${currentMonth}`,
        status: formData.status || 'active',
        macroGoals: formData.macroGoals || [],
        sectoralGoals: formData.sectoralGoals || [],
        performanceBonus: formData.performanceBonus || 0,
      };
      onSave(employeeData);
      onOpenChange(false);
    }
  };

  const macroWeight = getTotalGoalsWeight(formData.macroGoals || []);
  const sectoralWeight = getTotalGoalsWeight(formData.sectoralGoals || []);

  const renderGoalForm = (
    type: 'macro' | 'sectoral',
    goalData: Partial<Goal>,
    setGoalData: (data: Partial<Goal>) => void
  ) => {
    const goals = type === 'macro' ? formData.macroGoals : formData.sectoralGoals;
    const maxGoals = type === 'macro' ? 5 : 10;
    const totalWeight = type === 'macro' ? macroWeight : sectoralWeight;
    const canAdd = (goals?.length || 0) < maxGoals;

    return (
      <div className="space-y-4">
        {/* Weight indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {goals?.length || 0}/{maxGoals} metas
          </span>
          <span className={`font-medium ${totalWeight === 100 ? 'text-performance-high' : totalWeight > 100 ? 'text-performance-low' : 'text-muted-foreground'}`}>
            Peso Total: {totalWeight}%
          </span>
        </div>

        {/* Existing Goals */}
        {goals && goals.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded shrink-0">
                  {goal.weight}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGoal(type, goal.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Goal Form */}
        {canAdd && (
          <div className="p-4 border border-dashed rounded-lg space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Adicionar Nova Meta</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Nome da meta"
                value={goalData.name || ''}
                onChange={(e) => setGoalData({ ...goalData, name: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Peso %"
                min="0"
                max="100"
                value={goalData.weight || ''}
                onChange={(e) => setGoalData({ ...goalData, weight: parseInt(e.target.value) || 0 })}
              />
            </div>

            <Input
              placeholder="Descrição (opcional)"
              value={goalData.description || ''}
              onChange={(e) => setGoalData({ ...goalData, description: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Limite</Label>
                <Input
                  type="date"
                  value={goalData.deadline || ''}
                  onChange={(e) => setGoalData({ ...goalData, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de Entrega (opcional)</Label>
                <Input
                  type="date"
                  value={goalData.deliveryDate || ''}
                  onChange={(e) => setGoalData({ ...goalData, deliveryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">% Realizado</Label>
                <Input
                  type="number"
                  placeholder="0-105"
                  min="0"
                  max="105"
                  value={goalData.achieved || ''}
                  onChange={(e) => setGoalData({ ...goalData, achieved: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button 
                onClick={() => handleAddGoal(type)} 
                disabled={!goalData.name || !goalData.weight || !goalData.deadline}
                className="self-end"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {employee ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João da Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">URL da Foto</Label>
              <Input
                id="photo"
                value={formData.photo || ''}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Input
                id="role"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Analista de Vendas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Setor *</Label>
              <Select
                value={formData.sector || ''}
                onValueChange={(value) => setFormData({ ...formData, sector: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionDate">Data de Admissão</Label>
              <Input
                id="admissionDate"
                type="date"
                value={formData.admissionDate || ''}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.referenceMonth?.split('-')[1] || currentMonth}
                  onValueChange={(value) => {
                    const year = formData.referenceMonth?.split('-')[0] || String(currentYear);
                    setFormData({ ...formData, referenceMonth: `${year}-${value}` });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="2020"
                  max="2030"
                  className="w-24"
                  value={formData.referenceMonth?.split('-')[0] || currentYear}
                  onChange={(e) => {
                    const month = formData.referenceMonth?.split('-')[1] || currentMonth;
                    setFormData({ ...formData, referenceMonth: `${e.target.value}-${month}` });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonus" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Bônus Extra (até 5%)
              </Label>
              <Input
                id="bonus"
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={formData.performanceBonus || 0}
                onChange={(e) => setFormData({ ...formData, performanceBonus: Math.min(5, parseFloat(e.target.value) || 0) })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                />
                <span className={formData.status === 'active' ? 'text-performance-high' : 'text-muted-foreground'}>
                  {formData.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Goals Section with Tabs */}
          <Tabs defaultValue="macro" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="macro" className="gap-2">
                <Target className="w-4 h-4" />
                Metas Macro ({formData.macroGoals?.length || 0}/5)
              </TabsTrigger>
              <TabsTrigger value="sectoral" className="gap-2">
                <Briefcase className="w-4 h-4" />
                Metas Setoriais ({formData.sectoralGoals?.length || 0}/10)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="macro" className="mt-4">
              {renderGoalForm('macro', newMacroGoal, setNewMacroGoal)}
            </TabsContent>
            
            <TabsContent value="sectoral" className="mt-4">
              {renderGoalForm('sectoral', newSectoralGoal, setNewSectoralGoal)}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.role || !formData.sector}
            >
              {employee ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
