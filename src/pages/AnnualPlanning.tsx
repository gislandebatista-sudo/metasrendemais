import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  History,
  Loader2,
} from 'lucide-react';

interface AnnualGoal {
  id: string;
  year: number;
  month: number;
  name: string;
  responsible: string | null;
  deadline: string | null;
  weight: number;
  progress: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const MONTH_NAMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL',
  'MAIO', 'JUNHO', 'JULHO', 'AGOSTO',
  'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const PROGRESS_OPTIONS = [
  { value: 0, label: '0% — Planejada' },
  { value: 25, label: '25% — Em andamento' },
  { value: 50, label: '50% — Metade' },
  { value: 75, label: '75% — Quase concluída' },
  { value: 100, label: '100% — Concluída' },
];

export default function AnnualPlanning() {
  const { isAdmin } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  const fetchGoals = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('annual_macro_goals' as any)
      .select('*')
      .eq('year', selectedYear)
      .order('month', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error(error);
      toast.error('Erro ao carregar metas anuais');
    } else {
      setGoals((data as any) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const goalsByMonth = useMemo(() => {
    const map = new Map<number, AnnualGoal[]>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    goals.forEach((g) => {
      map.get(g.month)?.push(g);
    });
    return map;
  }, [goals]);

  const annualProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const sum = goals.reduce((acc, g) => acc + (g.progress || 0), 0);
    return Math.round(sum / goals.length);
  }, [goals]);

  const monthProgress = (m: number) => {
    const list = goalsByMonth.get(m) || [];
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, g) => acc + (g.progress || 0), 0);
    return Math.round(sum / list.length);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowHistory(true)}
          >
            <History className="w-4 h-4" />
            Histórico
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="font-mono-accent text-primary text-xs md:text-sm tracking-widest mb-2">
              PAINEL ANUAL · {selectedYear}
            </p>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none">
              ESCOLHA O <span className="text-primary">MÊS</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Clique em um mês para incluir ou acompanhar suas metas.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground tracking-wider">ANO</span>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
              >
                <SelectTrigger className="h-7 w-24 border-0 bg-transparent focus:ring-0 font-mono-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
                {annualProgress}%
              </span>
              <div className="text-xs text-muted-foreground tracking-widest leading-tight">
                PROGRESSO<br />ANUAL
              </div>
            </div>
          </div>
        </div>

        {/* Months grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MONTH_NAMES.map((label, i) => {
              const month = i + 1;
              const list = goalsByMonth.get(month) || [];
              const prog = monthProgress(month);
              return (
                <button
                  key={month}
                  onClick={() => setOpenMonth(month)}
                  className="group relative bg-card border border-border rounded-xl h-40 md:h-44 p-5 text-left overflow-hidden transition-all hover:border-primary/60 hover:shadow-glow-primary"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex flex-col justify-between h-full">
                    <span className="text-2xl md:text-3xl font-bold text-primary tracking-tight leading-none">
                      {label}
                    </span>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground tracking-widest mb-1">
                          METAS
                        </p>
                        <p className="text-2xl font-bold tabular-nums">
                          {list.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground tracking-widest mb-1">
                          PROGRESSO
                        </p>
                        <p className="text-2xl font-bold text-primary tabular-nums">
                          {prog}%
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openMonth !== null && (
        <MonthModal
          open={openMonth !== null}
          onOpenChange={(v) => !v && setOpenMonth(null)}
          year={selectedYear}
          month={openMonth}
          goals={goalsByMonth.get(openMonth) || []}
          onChanged={fetchGoals}
        />
      )}

      <HistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        goals={goals}
        year={selectedYear}
      />
    </div>
  );
}

/* ─────── Month Modal ─────── */

interface MonthModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  year: number;
  month: number;
  goals: AnnualGoal[];
  onChanged: () => void;
}

function MonthModal({ open, onOpenChange, year, month, goals, onChanged }: MonthModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const monthLabel = MONTH_NAMES[month - 1];
  const progress =
    goals.length === 0
      ? 0
      : Math.round(goals.reduce((a, g) => a + (g.progress || 0), 0) / goals.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <p className="font-mono-accent text-primary text-xs tracking-widest">
            MÊS {String(month).padStart(2, '0')} · {year}
          </p>
          <DialogTitle className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            {monthLabel}
          </DialogTitle>
          <DialogDescription>
            Gerencie as metas macro e acompanhe a evolução do mês.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="bg-secondary/60 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground tracking-widest">
              PROGRESSO DO MÊS
            </span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* List header */}
        <div className="flex items-center justify-between mt-2">
          <h3 className="text-lg font-semibold">
            METAS DO MÊS{' '}
            <span className="text-primary tabular-nums ml-1">{goals.length}</span>
          </h3>
          {!isAdding && (
            <Button size="sm" className="gap-1.5" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4" />
              NOVA META
            </Button>
          )}
        </div>

        {/* Add form */}
        {isAdding && (
          <GoalForm
            year={year}
            month={month}
            onCancel={() => setIsAdding(false)}
            onSaved={() => {
              setIsAdding(false);
              onChanged();
            }}
          />
        )}

        {/* Goals */}
        {goals.length === 0 && !isAdding ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center">
            <Plus className="w-6 h-6 text-primary mx-auto mb-3" />
            <h4 className="font-bold tracking-wide mb-1">NENHUMA META CADASTRADA</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione a primeira meta planejada para {monthLabel}.
            </p>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              ADICIONAR META
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((g) =>
              editingId === g.id ? (
                <GoalForm
                  key={g.id}
                  year={year}
                  month={month}
                  goal={g}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    onChanged();
                  }}
                />
              ) : (
                <GoalRow
                  key={g.id}
                  goal={g}
                  onEdit={() => setEditingId(g.id)}
                  onDeleted={onChanged}
                />
              )
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────── Goal row ─────── */

function GoalRow({
  goal,
  onEdit,
  onDeleted,
}: {
  goal: AnnualGoal;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Excluir a meta "${goal.name}"?`)) return;
    setDeleting(true);
    const { error } = await supabase
      .from('annual_macro_goals' as any)
      .delete()
      .eq('id', goal.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    toast.success('Meta excluída');
    onDeleted();
  };

  return (
    <div className="border border-border rounded-lg bg-secondary/30">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{goal.name}</p>
            <p className="text-xs text-muted-foreground">
              {goal.responsible || 'Sem responsável'}
              {goal.deadline && ` · Prazo: ${goal.deadline}`}
              {goal.weight > 0 && ` · Peso ${goal.weight}%`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary tabular-nums leading-none">
              {goal.progress}%
            </p>
          </div>
        </button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {expanded && goal.notes && (
        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {goal.notes}
        </div>
      )}
    </div>
  );
}

/* ─────── Goal form ─────── */

function GoalForm({
  year,
  month,
  goal,
  onCancel,
  onSaved,
}: {
  year: number;
  month: number;
  goal?: AnnualGoal;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [responsible, setResponsible] = useState(goal?.responsible ?? '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [weight, setWeight] = useState<string>(goal ? String(goal.weight) : '20');
  const [progress, setProgress] = useState<number>(goal?.progress ?? 0);
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Informe a meta planejada');
      return;
    }
    setSaving(true);
    const payload = {
      year,
      month,
      name: name.trim(),
      responsible: responsible.trim() || null,
      deadline: deadline.trim() || null,
      weight: parseFloat(weight) || 0,
      progress,
      status: progress >= 100 ? 'concluida' : progress > 0 ? 'em_andamento' : 'planejada',
      notes: notes.trim() || null,
    };

    const { error } = goal
      ? await supabase
          .from('annual_macro_goals' as any)
          .update(payload)
          .eq('id', goal.id)
      : await supabase.from('annual_macro_goals' as any).insert(payload);

    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Erro ao salvar meta');
      return;
    }
    toast.success(goal ? 'Meta atualizada' : 'Meta cadastrada');
    onSaved();
  };

  return (
    <div className="border border-border rounded-lg bg-secondary/30 p-4 space-y-3">
      <div>
        <Label className="text-[10px] tracking-widest text-muted-foreground">
          META MACRO
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite a meta planejada"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] tracking-widest text-muted-foreground">
            RESPONSÁVEL
          </Label>
          <Input
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            placeholder="Nome ou setor"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] tracking-widest text-muted-foreground">
            PRAZO
          </Label>
          <Input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Ex.: 30/04"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] tracking-widest text-muted-foreground">
            PESO (%)
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] tracking-widest text-muted-foreground">
            PROGRESSO
          </Label>
          <Select
            value={String(progress)}
            onValueChange={(v) => setProgress(parseInt(v, 10))}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROGRESS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] tracking-widest text-muted-foreground">
          OBSERVAÇÕES
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas, contexto, links..."
          className="mt-1 min-h-[70px]"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          CANCELAR
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'SALVANDO...' : 'SALVAR META'}
        </Button>
      </div>
    </div>
  );
}

/* ─────── History dialog ─────── */

function HistoryDialog({
  open,
  onOpenChange,
  goals,
  year,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goals: AnnualGoal[];
  year: number;
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, AnnualGoal[]>();
    goals.forEach((g) => {
      if (!map.has(g.month)) map.set(g.month, []);
      map.get(g.month)!.push(g);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [goals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Histórico de metas anuais — {year}
          </DialogTitle>
          <DialogDescription>
            Consulta completa das metas macro cadastradas no ano.
          </DialogDescription>
        </DialogHeader>

        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            Nenhuma meta cadastrada em {year}.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([month, list]) => (
              <div key={month}>
                <h3 className="font-mono-accent text-primary text-xs tracking-widest mb-2">
                  {MONTH_NAMES[month - 1]}
                </h3>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {list.map((g) => (
                    <div key={g.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.responsible || '—'}
                          {g.deadline && ` · ${g.deadline}`}
                          {g.weight > 0 && ` · Peso ${g.weight}%`}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary tabular-nums">
                        {g.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
