import { useState } from 'react';
import { X, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee, Goal } from '@/types/employee';
import { sectors } from '@/data/mockEmployees';

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (employee: Employee) => void;
  employee?: Employee;
}

export function EmployeeModal({ open, onOpenChange, onSave, employee }: EmployeeModalProps) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    employee || {
      name: '',
      photo: '',
      role: '',
      sector: '',
      admissionDate: '',
      goals: [],
    }
  );

  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    description: '',
    weight: 0,
    achieved: 0,
  });

  const handleAddGoal = () => {
    if (newGoal.name && newGoal.weight) {
      const goal: Goal = {
        id: `g${Date.now()}`,
        name: newGoal.name || '',
        description: newGoal.description,
        weight: newGoal.weight || 0,
        achieved: newGoal.achieved || 0,
      };
      setFormData({
        ...formData,
        goals: [...(formData.goals || []), goal],
      });
      setNewGoal({ name: '', description: '', weight: 0, achieved: 0 });
    }
  };

  const handleRemoveGoal = (goalId: string) => {
    setFormData({
      ...formData,
      goals: formData.goals?.filter(g => g.id !== goalId) || [],
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
        goals: formData.goals || [],
      };
      onSave(employeeData);
      onOpenChange(false);
    }
  };

  const totalWeight = formData.goals?.reduce((sum, g) => sum + g.weight, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          </div>

          {/* Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Metas Mensais</Label>
              <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-performance-high' : totalWeight > 100 ? 'text-performance-low' : 'text-muted-foreground'}`}>
                Peso Total: {totalWeight}%
              </span>
            </div>

            {/* Existing Goals */}
            {formData.goals && formData.goals.length > 0 && (
              <div className="space-y-2">
                {formData.goals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{goal.name}</p>
                      {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                    </div>
                    <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                      {goal.weight}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Goal */}
            <div className="p-4 border border-dashed rounded-lg space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Adicionar Nova Meta</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Nome da meta"
                    value={newGoal.name || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Peso %"
                    min="0"
                    max="100"
                    value={newGoal.weight || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, weight: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleAddGoal} disabled={!newGoal.name || !newGoal.weight}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <Input
                placeholder="Descrição (opcional)"
                value={newGoal.description || ''}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              />
            </div>
          </div>

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
