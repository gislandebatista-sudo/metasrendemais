import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, UserPlus, Target, Briefcase, Gift, Calendar, Upload, AlertTriangle, Image, KeyRound, Loader2, UserX, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Employee, Goal, getTotalGoalsWeight } from '@/types/employee';
import { months } from '@/data/mockEmployees';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (employee: Employee) => void;
  employee?: Employee;
}

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

export function EmployeeModal({ open, onOpenChange, onSave, employee }: EmployeeModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    photo: '',
    role: '',
    sector: '',
    referenceMonth: `${currentYear}-${currentMonth}`,
    status: 'active',
    macroGoals: [],
    sectoralGoals: [],
    performanceBonus: 0,
    bonusDescription: '',
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
        referenceMonth: `${currentYear}-${currentMonth}`,
        status: 'active',
        macroGoals: [],
        sectoralGoals: [],
        performanceBonus: 0,
        bonusDescription: '',
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is JPG
    if (!file.type.includes('jpeg') && !file.name.toLowerCase().endsWith('.jpg') && !file.name.toLowerCase().endsWith('.jpeg')) {
      toast.error('Formato inválido', {
        description: 'Por favor, envie uma imagem no formato JPG.',
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo permitido é 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData({ ...formData, photo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleAddGoal = (type: 'macro' | 'sectoral') => {
    const goalData = type === 'macro' ? newMacroGoal : newSectoralGoal;
    const goalsKey = type === 'macro' ? 'macroGoals' : 'sectoralGoals';
    const currentGoals = formData[goalsKey] || [];
    const maxGoals = type === 'macro' ? 5 : 10;
    const currentWeight = getTotalGoalsWeight(currentGoals);
    const newTotalWeight = currentWeight + (goalData.weight || 0);

    // Only validate weight if it's > 0 (weight is optional now)
    if ((goalData.weight || 0) > 0 && newTotalWeight > 100) {
      toast.error('Peso total excede 100%', {
        description: `Peso máximo disponível: ${100 - currentWeight}%`,
      });
      return;
    }

    // Name and deadline are required, but weight is optional (can be 0)
    if (goalData.name && goalData.deadline && currentGoals.length < maxGoals) {
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
        referenceMonth: formData.referenceMonth || `${currentYear}-${currentMonth}`,
        status: formData.status || 'active',
        macroGoals: formData.macroGoals || [],
        sectoralGoals: formData.sectoralGoals || [],
        performanceBonus: formData.performanceBonus || 0,
        bonusDescription: formData.bonusDescription || '',
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
    const goalsKey = type === 'macro' ? 'macroGoals' : 'sectoralGoals';
    const goals = formData[goalsKey] || [];
    const maxGoals = type === 'macro' ? 5 : 10;
    const totalWeight = type === 'macro' ? macroWeight : sectoralWeight;
    const canAdd = (goals?.length || 0) < maxGoals;
    const remainingWeight = 100 - totalWeight;
    const isWeightExceeded = totalWeight > 100;

    return (
      <div className="space-y-4">
        {/* Weight Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {goals?.length || 0}/{maxGoals} metas
            </span>
            <span className={cn(
              "font-medium",
              totalWeight === 100 ? 'text-performance-high' : 
              isWeightExceeded ? 'text-performance-low' : 
              'text-muted-foreground'
            )}>
              Peso Total: {totalWeight}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(totalWeight, 100)} 
              className={cn(
                "h-3",
                isWeightExceeded && "[&>div]:bg-performance-low"
              )}
            />
            {isWeightExceeded && (
              <div className="flex items-center gap-1 mt-1 text-xs text-performance-low">
                <AlertTriangle className="w-3 h-3" />
                O peso total ultrapassa 100%. Remova metas ou ajuste os pesos.
              </div>
            )}
          </div>
          {!isWeightExceeded && totalWeight < 100 && (
            <p className="text-xs text-muted-foreground">
              Peso disponível: {remainingWeight}%
            </p>
          )}
        </div>

        {/* Existing Goals */}
        {goals && goals.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {goals.map((goal) => (
              <div key={goal.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{goal.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveGoal(type, goal.id)}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Editable fields */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Peso %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.0001"
                      value={goal.weight === 0 ? '' : goal.weight}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value || '0');
                        const updatedGoals = (formData[goalsKey] || []).map(g => 
                          g.id === goal.id ? { ...g, weight: Math.max(0, value) } : g
                        );
                        setFormData({ ...formData, [goalsKey]: updatedGoals });
                      }}
                      className="h-8"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Realizado %</Label>
                    <Input
                      type="number"
                      min="0"
                      max={goal.weight || 100}
                      step="0.0001"
                      value={goal.achieved === 0 ? '' : goal.achieved}
                      onChange={(e) => {
                        const maxVal = goal.weight || 100;
                        const value = Math.min(maxVal, Math.max(0, parseFloat(e.target.value || '0')));
                        const updatedGoals = (formData[goalsKey] || []).map(g => 
                          g.id === goal.id ? { ...g, achieved: value } : g
                        );
                        setFormData({ ...formData, [goalsKey]: updatedGoals });
                      }}
                      className="h-8"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prazo</Label>
                    <Input
                      type="date"
                      value={goal.deadline}
                      onChange={(e) => {
                        const updatedGoals = (formData[goalsKey] || []).map(g => 
                          g.id === goal.id ? { ...g, deadline: e.target.value } : g
                        );
                        setFormData({ ...formData, [goalsKey]: updatedGoals });
                      }}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Entrega</Label>
                    <Input
                      type="date"
                      value={goal.deliveryDate || ''}
                      onChange={(e) => {
                        const updatedGoals = (formData[goalsKey] || []).map(g => 
                          g.id === goal.id ? { ...g, deliveryDate: e.target.value || undefined } : g
                        );
                        setFormData({ ...formData, [goalsKey]: updatedGoals });
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
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
                placeholder={`Peso % (opcional, max: ${remainingWeight}%)`}
                min="0"
                max={remainingWeight}
                step="0.0001"
                value={goalData.weight === 0 ? '' : goalData.weight || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setGoalData({ ...goalData, weight: Math.min(value, remainingWeight) });
                }}
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
                <Label className="text-xs">% Realizado (máx. peso definido)</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  min="0"
                  max={goalData.weight || 100}
                  step="0.0001"
                  value={goalData.achieved === 0 ? '' : goalData.achieved || ''}
                  onChange={(e) => {
                    const maxVal = goalData.weight || 100;
                    const value = Math.min(maxVal, parseFloat(e.target.value) || 0);
                    setGoalData({ ...goalData, achieved: value });
                  }}
                />
              </div>
              <Button 
                onClick={() => handleAddGoal(type)} 
                disabled={!goalData.name || !goalData.deadline}
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
              <Label>Foto do Colaborador (JPG)</Label>
              <div className="flex items-center gap-3">
                {formData.photo ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                    <img 
                      src={formData.photo} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload JPG
                  </Button>
                </div>
              </div>
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
              <Input
                id="sector"
                value={formData.sector || ''}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                placeholder="Ex: Comercial, Financeiro, TI..."
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

          {/* Bonus Section - Separated */}
          <div className="p-4 border rounded-lg bg-accent/5 space-y-4">
            <div className="flex items-center gap-2 text-accent-foreground">
              <Gift className="w-5 h-5" />
              <Label className="text-base font-semibold">Bônus de Performance</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Percentual (até 5%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.0001"
                    value={formData.performanceBonus || 0}
                    onChange={(e) => setFormData({ ...formData, performanceBonus: Math.min(5, parseFloat(e.target.value) || 0) })}
                    className="w-24"
                  />
                  <div className="flex-1">
                    <Progress value={(formData.performanceBonus || 0) * 20} className="h-2" />
                  </div>
                  <span className="text-sm font-medium text-accent-foreground w-12">
                    {formData.performanceBonus || 0}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Descrição/Motivo do Bônus</Label>
                <Textarea
                  placeholder="Ex: Superou metas de vendas por 3 meses consecutivos..."
                  value={formData.bonusDescription || ''}
                  onChange={(e) => setFormData({ ...formData, bonusDescription: e.target.value })}
                  className="min-h-[60px] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Access Management Section - Only for editing existing employees */}
          {employee && <EmployeeAccessSection employeeId={employee.id} employeeName={employee.name} />}

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
