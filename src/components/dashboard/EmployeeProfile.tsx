import { useState } from 'react';
import { X, Briefcase, Building2, Target, TrendingUp, Gift, Clock, CheckCircle2, AlertCircle, XCircle, Pencil, Trash2, Save, MessageSquare, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { 
  Employee, 
  Goal, 
  calculateTotalPerformance, 
  calculateGoalsPerformance,
  getPerformanceLevel,
  getPerformanceLevelLabel,
  getGoalStatus,
  getStatusLabel,
  getStatusColor,
  getTotalGoalsWeight,
  getUnifiedTotalWeight
} from '@/types/employee';
import { cn, formatDateBR, formatPercent } from '@/lib/utils';
import { GoalObservationsModal } from './GoalObservationsModal';
import { GoalCriteriaModal } from './GoalCriteriaModal';
import { ModificationHistory } from './ModificationHistory';
import { usePercentageVisibility } from '@/hooks/usePercentageVisibility';

interface EmployeeProfileProps {
  employee: Employee;
  onClose: () => void;
  onUpdateGoal: (employeeId: string, goalType: 'macro' | 'sectoral', goalId: string, updates: Partial<Goal>) => void;
  onUpdateBonus: (employeeId: string, bonus: number, description?: string) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
  canEdit?: boolean;
}

export function EmployeeProfile({ employee, onClose, onUpdateGoal, onUpdateBonus, onEditEmployee, onDeleteEmployee, canEdit = true }: EmployeeProfileProps) {
  const { hidePercentages } = usePercentageVisibility();
  const [editingBonus, setEditingBonus] = useState(false);
  const [bonusValue, setBonusValue] = useState(employee.performanceBonus);
  const [bonusDescription, setBonusDescription] = useState(employee.bonusDescription || '');
  const [observationsModal, setObservationsModal] = useState<{
    open: boolean;
    goal: Goal | null;
    goalType: 'macro' | 'sectoral';
  }>({ open: false, goal: null, goalType: 'macro' });
  const [criteriaModal, setCriteriaModal] = useState<{
    open: boolean;
    goal: Goal | null;
  }>({ open: false, goal: null });
  const [editingGoalName, setEditingGoalName] = useState<string | null>(null);
  const [goalNameDraft, setGoalNameDraft] = useState('');

  const totalPerformance = calculateTotalPerformance(employee);
  const macroPerformance = calculateGoalsPerformance(employee.macroGoals);
  const sectoralPerformance = calculateGoalsPerformance(employee.sectoralGoals);
  const macroWeight = getTotalGoalsWeight(employee.macroGoals);
  const sectoralWeight = getTotalGoalsWeight(employee.sectoralGoals);
  const unifiedWeight = getUnifiedTotalWeight(employee);
  const level = getPerformanceLevel(totalPerformance);

  const getPerformanceColorClass = (level: string) => {
    switch (level) {
      case 'low': return 'bg-performance-low';
      case 'medium': return 'bg-performance-medium';
      case 'high': return 'bg-performance-high';
      case 'excellent': return 'bg-performance-excellent';
      default: return 'bg-muted';
    }
  };

  const getProgressColor = (achieved: number) => {
    if (achieved < 80) return 'bg-performance-low';
    if (achieved < 100) return 'bg-performance-medium';
    if (achieved === 100) return 'bg-performance-high';
    return 'bg-performance-excellent';
  };

  const getStatusIcon = (status: ReturnType<typeof getGoalStatus>) => {
    switch (status) {
      case 'early': return <CheckCircle2 className="w-4 h-4" />;
      case 'on_time': return <Clock className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      case 'not_delivered': return <XCircle className="w-4 h-4" />;
    }
  };

  const handleAchievedChange = (goalType: 'macro' | 'sectoral', goalId: string, goalWeight: number, value: string) => {
    // Cap achieved at the goal's weight (not 100%)
    const numValue = Math.max(0, parseFloat(value) || 0);
    const cappedValue = Math.min(numValue, goalWeight);
    const roundedValue = Math.round(cappedValue * 10000) / 10000; // Round to 0.0001
    
    // Warn if trying to exceed the goal's weight limit
    if (numValue > goalWeight) {
      toast.warning(`O percentual realizado foi limitado a ${goalWeight}%`, {
        description: `Esta meta tem peso máximo de ${goalWeight}%. O valor foi ajustado automaticamente.`,
      });
    }
    
    onUpdateGoal(employee.id, goalType, goalId, { achieved: roundedValue });
  };

  const handleDeliveryDateChange = (goalType: 'macro' | 'sectoral', goalId: string, value: string) => {
    onUpdateGoal(employee.id, goalType, goalId, { deliveryDate: value || undefined });
  };

  const handleSaveBonus = () => {
    onUpdateBonus(employee.id, bonusValue, bonusDescription);
    setEditingBonus(false);
  };

  const handleOpenObservations = (goal: Goal, goalType: 'macro' | 'sectoral') => {
    setObservationsModal({ open: true, goal, goalType });
  };

  const handleSaveObservations = (observations: string) => {
    if (observationsModal.goal) {
      onUpdateGoal(employee.id, observationsModal.goalType, observationsModal.goal.id, { observations });
      toast.success('Observações salvas com sucesso!');
    }
  };

  const handleStartEditGoalName = (goalId: string, currentName: string) => {
    setEditingGoalName(goalId);
    setGoalNameDraft(currentName);
  };

  const handleSaveGoalName = (goalType: 'macro' | 'sectoral', goalId: string) => {
    const trimmed = goalNameDraft.trim();
    if (trimmed) {
      onUpdateGoal(employee.id, goalType, goalId, { name: trimmed });
    }
    setEditingGoalName(null);
    setGoalNameDraft('');
  };

  const handleCancelEditGoalName = () => {
    setEditingGoalName(null);
    setGoalNameDraft('');
  };

  const renderGoalsList = (goals: Goal[], type: 'macro' | 'sectoral') => {
    const categoryWeight = getTotalGoalsWeight(goals);
    
    return (
      <div className="space-y-4">
        {/* Category Weight Info */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Peso desta categoria</span>
            <span className="font-medium">{categoryWeight}%</span>
          </div>
          <Progress value={Math.min(categoryWeight, 100)} className="h-2" />
        </div>

        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhuma meta cadastrada</p>
        ) : (
          goals.map((goal) => {
            // The achieved value is the direct contribution (capped at goal weight)
            const status = getGoalStatus(goal.deadline, goal.deliveryDate);
            
            return (
              <div key={goal.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {canEdit && editingGoalName === goal.id ? (
                        <Input
                          autoFocus
                          value={goalNameDraft}
                          onChange={(e) => setGoalNameDraft(e.target.value)}
                          onBlur={() => handleSaveGoalName(type, goal.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveGoalName(type, goal.id);
                            if (e.key === 'Escape') handleCancelEditGoalName();
                          }}
                          className="h-7 text-sm font-medium w-full max-w-xs"
                          data-testid={`input-goal-name-${goal.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <h5 className="font-medium">{goal.name}</h5>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEditGoalName(goal.id, goal.name)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                              data-testid={`button-edit-goal-name-${goal.id}`}
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      )}
                      <Badge variant="outline" className={cn("text-xs shrink-0", getStatusColor(status))}>
                        {getStatusIcon(status)}
                        <span className="ml-1">{getStatusLabel(status)}</span>
                      </Badge>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded shrink-0">
                    Peso: {goal.weight}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Prazo:</span>
                    <span className="ml-2 font-medium">{formatDateBR(goal.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Entrega:</span>
                    {canEdit ? (
                      <Input
                        type="date"
                        value={goal.deliveryDate || ''}
                        onChange={(e) => handleDeliveryDateChange(type, goal.id, e.target.value)}
                        className="h-7 text-sm w-36"
                      />
                    ) : (
                      <span className="font-medium">{goal.deliveryDate ? formatDateBR(goal.deliveryDate) : '-'}</span>
                    )}
                  </div>
                </div>

                {/* Progress - Achieved limited to goal weight */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Realizado (máx: {goal.weight}%)</span>
                      <span className="font-medium">{hidePercentages ? '•••' : `${formatPercent(goal.achieved)}%`}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", getProgressColor((goal.achieved / goal.weight) * 100))}
                        style={{ width: `${Math.min(100, (goal.achieved / goal.weight) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {canEdit ? (
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        max={goal.weight}
                        step="0.0001"
                        value={goal.achieved}
                        onChange={(e) => handleAchievedChange(type, goal.id, goal.weight, e.target.value)}
                        className="text-center font-medium h-8"
                      />
                    </div>
                  ) : (
                    <div className="w-24 text-right">
                      <span className="font-medium">{hidePercentages ? '•••' : `${formatPercent(goal.achieved)}%`}</span>
                    </div>
                  )}
                </div>

                {/* Contribution and Observations */}
                <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Contribuição para o Ranking</span>
                  <span className="font-semibold text-primary">{hidePercentages ? '•••' : `${formatPercent(goal.achieved)}%`}</span>
                </div>

                {/* Observations & Criteria Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenObservations(goal, type)}
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {goal.observations ? 'Ver/Editar Observações' : 'Adicionar Observações'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCriteriaModal({ open: true, goal })}
                      className="gap-2"
                    >
                      <ListChecks className="w-4 h-4" />
                      Composição
                    </Button>
                  </div>
                  {goal.observations && (
                    <Badge variant="secondary" className="text-xs">
                      Tem observações
                    </Badge>
                  )}
                </div>

                {/* Preview of observations if exists */}
                {goal.observations && (
                  <div className="p-2 bg-background/50 rounded border text-sm text-muted-foreground">
                    <p className="line-clamp-2">{goal.observations}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Perfil do Colaborador
          </CardTitle>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => onEditEmployee(employee)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir este colaborador?')) {
                      onDeleteEmployee(employee.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Employee Info */}
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
            <AvatarImage src={employee.photo} alt={employee.name} />
            <AvatarFallback className="text-xl">{employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{employee.name}</h3>
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                {employee.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {employee.role}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {employee.sector}
              </span>
            </div>
            {/* Modification History */}
            <ModificationHistory 
              updatedAt={employee.updatedAt} 
              lastModifiedBy={employee.lastModifiedBy}
              className="mt-2"
            />
          </div>
        </div>

        {/* Unified Total Weight */}
        <div className={cn(
          "p-3 rounded-lg border-2",
          unifiedWeight === 100 ? "border-performance-high bg-performance-high/10" :
          unifiedWeight > 100 ? "border-performance-low bg-performance-low/10" :
          "border-muted bg-muted/30"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Peso Total das Metas (Macro + Setoriais)</span>
            <span className={cn(
              "text-lg font-bold",
              unifiedWeight === 100 ? "text-performance-high" :
              unifiedWeight > 100 ? "text-performance-low" :
              "text-muted-foreground"
            )}>
              {unifiedWeight}%
            </span>
          </div>
          <Progress value={Math.min(unifiedWeight, 100)} className="h-2 mt-2" />
          {unifiedWeight !== 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unifiedWeight > 100 ? "⚠️ O peso total excede 100%" : `Faltam ${100 - unifiedWeight}% para completar`}
            </p>
          )}
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={cn(
            "p-4 rounded-xl text-primary-foreground",
            getPerformanceColorClass(level)
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Total Ranking</span>
              </div>
              <span className="text-2xl font-bold">{hidePercentages ? '•••' : `${formatPercent(totalPerformance)}%`}</span>
            </div>
            <p className="text-sm opacity-80 mt-1">{getPerformanceLevelLabel(level)} (Metas + Bônus)</p>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Target className="w-5 h-5" />
                <span className="font-medium">Metas Macro</span>
              </div>
              <span className="text-2xl font-bold text-primary">{hidePercentages ? '•••' : `${formatPercent(macroPerformance)}%`}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{employee.macroGoals.length} metas ({macroWeight}% peso)</p>
          </div>

          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-foreground">
                <Briefcase className="w-5 h-5" />
                <span className="font-medium">Metas Setoriais</span>
              </div>
              <span className="text-2xl font-bold">{hidePercentages ? '•••' : `${formatPercent(sectoralPerformance)}%`}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{employee.sectoralGoals.length} metas ({sectoralWeight}% peso)</p>
          </div>
        </div>

        {/* Bonus Section - Separated Bar */}
        <div className="p-4 rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <span className="font-semibold">Bônus de Performance</span>
            </div>
            {canEdit && (
              !editingBonus ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingBonus(true)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleSaveBonus}>
                  <Save className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
              )
            )}
          </div>
          
          {editingBonus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0">Percentual:</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.0001"
                  value={bonusValue}
                  onChange={(e) => setBonusValue(Math.min(5, parseFloat(e.target.value) || 0))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">% (máx. 5%)</span>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Descrição/Motivo:</Label>
                <Textarea
                  value={bonusDescription}
                  onChange={(e) => setBonusDescription(e.target.value)}
                  placeholder="Descreva o motivo do bônus..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-accent">{hidePercentages ? '•••' : `+${employee.performanceBonus}%`}</span>
                <div className="flex-1">
                  <Progress value={employee.performanceBonus * 20} className="h-3 [&>div]:bg-accent" />
                </div>
              </div>
              {employee.bonusDescription && (
                <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded">
                  <strong>Motivo:</strong> {employee.bonusDescription}
                </p>
              )}
              {!employee.bonusDescription && employee.performanceBonus === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum bônus cadastrado. Clique em "Editar" para adicionar.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Goals Tabs */}
        <Tabs defaultValue="macro" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="macro" className="gap-2">
              <Target className="w-4 h-4" />
              Metas Macro ({employee.macroGoals.length})
            </TabsTrigger>
            <TabsTrigger value="sectoral" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Metas Setoriais ({employee.sectoralGoals.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="macro" className="mt-4">
            {renderGoalsList(employee.macroGoals, 'macro')}
          </TabsContent>
          
          <TabsContent value="sectoral" className="mt-4">
            {renderGoalsList(employee.sectoralGoals, 'sectoral')}
          </TabsContent>
        </Tabs>

        {/* Observations Modal */}
        {observationsModal.goal && (
          <GoalObservationsModal
            open={observationsModal.open}
            onOpenChange={(open) => setObservationsModal({ ...observationsModal, open })}
            goal={observationsModal.goal}
            goalType={observationsModal.goalType}
            onSave={handleSaveObservations}
          />
        )}

        {/* Criteria Modal */}
        {criteriaModal.goal && (
          <GoalCriteriaModal
            open={criteriaModal.open}
            onOpenChange={(open) => setCriteriaModal({ ...criteriaModal, open })}
            goalName={criteriaModal.goal.name}
            goalAchieved={criteriaModal.goal.achieved}
            goalWeight={criteriaModal.goal.weight}
            monthlyProgressId={criteriaModal.goal.monthlyProgressId}
            readOnly={!canEdit}
          />
        )}
      </CardContent>
    </Card>
  );
}
