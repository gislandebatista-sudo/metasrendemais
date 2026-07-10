import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar, Filter, User, AlertTriangle, TrendingUp, Award, Target, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Employee,
  calculateTotalPerformance,
  calculateGoalsPerformance,
  getGoalStatus,
  getStatusLabel,
  getDelayedGoalsCount,
  getNotDeliveredGoalsCount,
  getTotalGoalsWeight,
} from '@/types/employee';
import { formatDateBR } from '@/lib/utils';
import {
  rankEmployees,
  computeExecutiveSummary,
  computeSectorSummaries,
  computeAlerts,
  getOverallStatus,
  getPerformanceBand,
  OVERALL_STATUS_LABEL,
  PERFORMANCE_BAND_LABEL,
  PERFORMANCE_BAND_COLOR,
  PERFORMANCE_BAND_DESCRIPTION,
  PerformanceBand,
  OverallStatus,
  formatSmartPercent,
  formatMaybe,
  countGoals,
  allEmployeeGoals,
  getPunctualityRate,
} from '@/lib/reporting';
import { generateManagerialPDF } from '@/lib/pdf/managerialReport';
import { generateIndividualPDF } from '@/lib/pdf/individualReport';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ExportTabProps {
  employees: Employee[];
}

const MONTHS = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

type StatusFilter = 'all' | 'active' | 'inactive';
type BandFilter = 'all' | PerformanceBand;
type GoalStatusFilter = 'all' | 'early' | 'on_time' | 'late' | 'not_delivered';

type SortKey = 'position' | 'performance' | 'sector' | 'late' | 'notDelivered';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Apenas Ativos',
  inactive: 'Apenas Inativos',
};

const BAND_LABELS: Record<BandFilter, string> = {
  all: 'Todas as Faixas',
  excellent: 'Excelente (≥100%)',
  satisfactory: 'Satisfatório (95–99,99%)',
  attention: 'Atenção (90–94,99%)',
  critical: 'Crítico (<90%)',
};

const OVERALL_STATUS_BADGE: Record<OverallStatus, string> = {
  excellent: 'bg-green-500/15 text-green-500 border-green-500/30',
  satisfactory: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  attention: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-500 border-red-500/30',
};

export function ExportTab({ employees }: ExportTabProps) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('active');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedBand, setSelectedBand] = useState<BandFilter>('all');
  const [selectedGoalStatus, setSelectedGoalStatus] = useState<GoalStatusFilter>('all');
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [isExporting, setIsExporting] = useState(false);
  const [individualOpen, setIndividualOpen] = useState(false);
  const [individualTarget, setIndividualTarget] = useState<string>('all');

  const availableSectors = useMemo(
    () => Array.from(new Set(employees.map((e) => e.sector).filter(Boolean))).sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedMonth !== 'all' && !emp.referenceMonth.endsWith(`-${selectedMonth}`)) return false;
      if (selectedStatus !== 'all' && emp.status !== selectedStatus) return false;
      if (selectedSector !== 'all' && emp.sector !== selectedSector) return false;
      if (employeeQuery && !emp.name.toLowerCase().includes(employeeQuery.toLowerCase())) return false;
      if (selectedBand !== 'all' && getPerformanceBand(calculateTotalPerformance(emp)) !== selectedBand) return false;
      if (selectedGoalStatus !== 'all') {
        const goals = [...emp.macroGoals, ...emp.sectoralGoals];
        const has = goals.some((g) => getGoalStatus(g.deadline, g.deliveryDate) === selectedGoalStatus);
        if (!has) return false;
      }
      return true;
    });
  }, [employees, selectedMonth, selectedStatus, selectedSector, employeeQuery, selectedBand, selectedGoalStatus]);

  const summary = useMemo(() => computeExecutiveSummary(filtered), [filtered]);
  const ranked = useMemo(() => rankEmployees(filtered), [filtered]);
  const sectors = useMemo(() => computeSectorSummaries(filtered), [filtered]);
  const alerts = useMemo(() => computeAlerts(filtered), [filtered]);

  const sortedRanking = useMemo(() => {
    const copy = [...ranked];
    switch (sortKey) {
      case 'performance':
        copy.sort((a, b) => b.totalPerformance - a.totalPerformance || a.employee.name.localeCompare(b.employee.name, 'pt-BR'));
        break;
      case 'sector':
        copy.sort((a, b) => a.employee.sector.localeCompare(b.employee.sector, 'pt-BR') || a.position - b.position);
        break;
      case 'late':
        copy.sort((a, b) => b.counts.late - a.counts.late || a.position - b.position);
        break;
      case 'notDelivered':
        copy.sort((a, b) => b.counts.notDelivered - a.counts.notDelivered || a.position - b.position);
        break;
      default:
        copy.sort((a, b) => a.position - b.position);
    }
    return copy;
  }, [ranked, sortKey]);

  const alertsByLevel = useMemo(() => {
    return {
      critical: alerts.filter((a) => a.level === 'critical'),
      attention: alerts.filter((a) => a.level === 'attention'),
      info: alerts.filter((a) => a.level === 'info'),
    };
  }, [alerts]);

  const getMonthLabel = (m: string) => MONTHS.find((x) => x.value === m)?.label || m;

  const filtersDescription = {
    period: getMonthLabel(selectedMonth),
    status: STATUS_LABELS[selectedStatus],
    sector: selectedSector === 'all' ? 'Todos' : selectedSector,
    band: BAND_LABELS[selectedBand],
  };

  const distinctMonthsInDataset = useMemo(
    () => Array.from(new Set(filtered.map((e) => e.referenceMonth))).sort(),
    [filtered],
  );

  // Simple historical block (requires 2+ months in current dataset)
  const historical = useMemo(() => {
    if (distinctMonthsInDataset.length < 2) {
      return { currentAvg: null, previousAvg: null, variation: null, trend: 'no-data' as const };
    }
    const [prev, curr] = [distinctMonthsInDataset[distinctMonthsInDataset.length - 2], distinctMonthsInDataset[distinctMonthsInDataset.length - 1]];
    const currList = filtered.filter((e) => e.referenceMonth === curr).map((e) => calculateTotalPerformance(e));
    const prevList = filtered.filter((e) => e.referenceMonth === prev).map((e) => calculateTotalPerformance(e));
    const currAvg = currList.length ? currList.reduce((a, b) => a + b, 0) / currList.length : null;
    const prevAvg = prevList.length ? prevList.reduce((a, b) => a + b, 0) / prevList.length : null;
    if (currAvg === null || prevAvg === null) return { currentAvg: currAvg, previousAvg: prevAvg, variation: null, trend: 'no-data' as const };
    const variation = currAvg - prevAvg;
    const trend: 'up' | 'down' | 'stable' = Math.abs(variation) < 0.01 ? 'stable' : variation > 0 ? 'up' : 'down';
    return { currentAvg: currAvg, previousAvg: prevAvg, variation, trend };
  }, [filtered, distinctMonthsInDataset]);

  const bandChartData = (Object.keys(summary.bandCounts) as PerformanceBand[]).map((b) => ({
    name: PERFORMANCE_BAND_LABEL[b],
    value: summary.bandCounts[b],
    color: PERFORMANCE_BAND_COLOR[b],
  }));

  const sectorChartData = sectors.map((s) => ({
    sector: s.sector,
    media: s.averagePerformance ?? 0,
    pontualidade: s.punctuality ?? 0,
  }));

  const exportManagerialPDF = async () => {
    setIsExporting(true);
    try {
      const doc = generateManagerialPDF({
        employees: filtered,
        ranked,
        summary,
        sectors,
        alerts,
        filters: filtersDescription,
        historical,
      });
      doc.save(`rende-mais-painel-gerencial-${selectedMonth}-${selectedStatus}.pdf`);
      toast.success('PDF gerencial exportado com sucesso');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar PDF gerencial');
    } finally {
      setIsExporting(false);
    }
  };

  const exportIndividualPDF = async () => {
    setIsExporting(true);
    try {
      const targets = individualTarget === 'all' ? filtered : filtered.filter((e) => e.id === individualTarget);
      if (targets.length === 0) {
        toast.error('Nenhum colaborador para exportar');
        return;
      }
      const doc = generateIndividualPDF({
        employees: targets,
        ranked,
        period: filtersDescription.period,
      });
      const suffix = individualTarget === 'all' ? 'todos' : (targets[0]?.name.replace(/\s+/g, '-').toLowerCase() ?? 'colab');
      doc.save(`rende-mais-relatorio-individual-${suffix}.pdf`);
      toast.success('Relatório individual exportado');
      setIndividualOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar relatório individual');
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: summary
      const summaryRows = [
        ['Rende + | Painel Gerencial'],
        ['Período', filtersDescription.period],
        ['Status', filtersDescription.status],
        ['Setor', filtersDescription.sector],
        ['Faixa', filtersDescription.band],
        ['Gerado em', new Date().toLocaleString('pt-BR')],
        [''],
        ['Colaboradores ativos', summary.activeEmployees],
        ['Média de desempenho', formatMaybe(summary.averagePerformance, '%')],
        ['Melhor resultado', formatMaybe(summary.bestPerformance, '%')],
        ['Menor resultado', formatMaybe(summary.worstPerformance, '%')],
        ['Total de metas', summary.totalGoals],
        ['Antecipadas', summary.earlyGoals],
        ['No prazo', summary.onTimeGoals],
        ['Com atraso', summary.lateGoals],
        ['Não entregues', summary.notDeliveredGoals],
        ['Taxa geral de pontualidade', formatMaybe(summary.overallPunctuality, '%')],
        ['Taxa geral de cumprimento', formatMaybe(summary.overallFulfillment, '%')],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws1['!cols'] = [{ wch: 32 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

      // Sheet 2: ranking
      const rankingRows = [
        ['Posição', 'Nome', 'Cargo', 'Setor', 'Total (%)', 'Macro (%)', 'Setorial (%)', 'Atrasadas', 'Não entregues', 'Bônus (%)', 'Status'],
        ...ranked.map((r) => [
          r.position,
          r.employee.name,
          r.employee.role,
          r.employee.sector,
          formatSmartPercent(r.totalPerformance),
          formatSmartPercent(r.macroPerformance),
          formatSmartPercent(r.sectoralPerformance),
          r.counts.late,
          r.counts.notDelivered,
          formatSmartPercent(r.employee.performanceBonus),
          OVERALL_STATUS_LABEL[r.status],
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(rankingRows);
      ws2['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Ranking');

      // Sheet 3: sectors
      const sectorRows = [
        ['Setor', 'Colaboradores', 'Média (%)', 'Melhor (%)', 'Menor (%)', 'Macro Média (%)', 'Setorial Média (%)', 'Atrasadas', 'Não entregues', 'Pontualidade (%)', 'Status'],
        ...sectors.map((s) => [
          s.sector,
          s.employeeCount,
          formatMaybe(s.averagePerformance),
          formatMaybe(s.bestPerformance),
          formatMaybe(s.worstPerformance),
          formatMaybe(s.averageMacro),
          formatMaybe(s.averageSectoral),
          s.delayedGoals,
          s.notDeliveredGoals,
          formatMaybe(s.punctuality),
          OVERALL_STATUS_LABEL[s.status],
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(sectorRows);
      ws3['!cols'] = [{ wch: 20 }, { wch: 14 }, ...Array(8).fill({ wch: 16 })];
      XLSX.utils.book_append_sheet(wb, ws3, 'Setores');

      // Sheet 4: alerts
      const alertRows = [
        ['Nível', 'Categoria', 'Colaborador', 'Mensagem'],
        ...alerts.map((a) => [
          a.level === 'critical' ? 'Crítico' : a.level === 'attention' ? 'Atenção' : 'Informativo',
          a.category,
          a.employee ?? '',
          a.message,
        ]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(alertRows);
      ws4['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 25 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Alertas');

      // Sheet 5: goals detail
      const goalRows: (string | number)[][] = [
        ['Colaborador', 'Setor', 'Tipo', 'Meta', 'Peso (%)', 'Realizado (%)', 'Δ (Realizado - Peso)', 'Prazo', 'Entrega', 'Status', 'Observação'],
      ];
      for (const emp of filtered) {
        const all = [
          ...emp.macroGoals.map((g) => ({ g, tipo: 'Macro' })),
          ...emp.sectoralGoals.map((g) => ({ g, tipo: 'Setorial' })),
        ];
        for (const { g, tipo } of all) {
          const st = getGoalStatus(g.deadline, g.deliveryDate);
          goalRows.push([
            emp.name,
            emp.sector,
            tipo,
            g.name,
            formatSmartPercent(g.weight),
            formatSmartPercent(g.achieved),
            formatSmartPercent(g.achieved - g.weight),
            formatDateBR(g.deadline),
            g.deliveryDate ? formatDateBR(g.deliveryDate) : '',
            getStatusLabel(st),
            g.observations ?? '',
          ]);
        }
      }
      const ws5 = XLSX.utils.aoa_to_sheet(goalRows);
      ws5['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 30 }, ...Array(4).fill({ wch: 14 }), { wch: 12 }, { wch: 16 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws5, 'Metas');

      XLSX.writeFile(wb, `rende-mais-painel-${selectedMonth}-${selectedStatus}.xlsx`);
      toast.success('Excel exportado com sucesso');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters + Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Painel Gerencial de Desempenho
          </CardTitle>
          <CardDescription>
            Visão executiva com resumo, ranking, indicadores de prazo, comparativo por setor, evolução, consistência e alertas. Todos os cálculos respeitam os filtros aplicados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status do colaborador</Label>
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as StatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((k) => (
                    <SelectItem key={k} value={k}>{STATUS_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Setor</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableSectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Faixa de desempenho</Label>
              <Select value={selectedBand} onValueChange={(v) => setSelectedBand(v as BandFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BAND_LABELS) as BandFilter[]).map((k) => (
                    <SelectItem key={k} value={k}>{BAND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status das metas</Label>
              <Select value={selectedGoalStatus} onValueChange={(v) => setSelectedGoalStatus(v as GoalStatusFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="early">Entregues antes</SelectItem>
                  <SelectItem value="on_time">No prazo</SelectItem>
                  <SelectItem value="late">Com atraso</SelectItem>
                  <SelectItem value="not_delivered">Não entregues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colaborador</Label>
              <Input placeholder="Buscar por nome" value={employeeQuery} onChange={(e) => setEmployeeQuery(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={exportManagerialPDF} disabled={isExporting} className="gap-2">
              <FileText className="w-4 h-4" /> Exportar PDF Gerencial
            </Button>
            <Button onClick={() => { setIndividualTarget('all'); setIndividualOpen(true); }} disabled={isExporting} variant="secondary" className="gap-2">
              <User className="w-4 h-4" /> Relatório Individual
            </Button>
            <Button onClick={exportExcel} disabled={isExporting} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 1. Executive summary */}
      <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title="1. Resumo Executivo" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Ativos" value={String(summary.activeEmployees)} tone="neutral" />
        <MetricCard label="Média" value={formatMaybe(summary.averagePerformance, '%')} tone={toneFor(summary.averagePerformance)} />
        <MetricCard label="Melhor" value={formatMaybe(summary.bestPerformance, '%')} tone="positive" />
        <MetricCard label="Menor" value={formatMaybe(summary.worstPerformance, '%')} tone={toneFor(summary.worstPerformance)} />
        <MetricCard label="Total de metas" value={String(summary.totalGoals)} tone="neutral" />
        <MetricCard label="Pontualidade" value={formatMaybe(summary.overallPunctuality, '%')} tone={toneFor(summary.overallPunctuality)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="≥ 100%" value={`${summary.bandCounts.excellent} (${formatSmartPercent(summary.bandPercents.excellent)}%)`} tone="positive" />
        <MetricCard label="95 – 99,99%" value={`${summary.bandCounts.satisfactory} (${formatSmartPercent(summary.bandPercents.satisfactory)}%)`} tone="neutral" />
        <MetricCard label="90 – 94,99%" value={`${summary.bandCounts.attention} (${formatSmartPercent(summary.bandPercents.attention)}%)`} tone="warning" />
        <MetricCard label="< 90%" value={`${summary.bandCounts.critical} (${formatSmartPercent(summary.bandPercents.critical)}%)`} tone="critical" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Antecipadas" value={String(summary.earlyGoals)} tone="positive" />
        <MetricCard label="No prazo" value={String(summary.onTimeGoals)} tone="neutral" />
        <MetricCard label="Atrasadas" value={String(summary.lateGoals)} tone="warning" />
        <MetricCard label="Não entregues" value={String(summary.notDeliveredGoals)} tone="critical" />
      </div>

      {/* 2. Band distribution */}
      <SectionTitle icon={<Target className="w-4 h-4" />} title="2. Distribuição por Faixa de Desempenho" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bandChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                    {bandChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Colaboradores</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(summary.bandCounts) as PerformanceBand[]).map((b) => (
                  <TableRow key={b}>
                    <TableCell><span style={{ color: PERFORMANCE_BAND_COLOR[b] }} className="font-semibold">{PERFORMANCE_BAND_LABEL[b]}</span></TableCell>
                    <TableCell className="text-muted-foreground">{PERFORMANCE_BAND_DESCRIPTION[b]}</TableCell>
                    <TableCell className="text-right tabular-nums">{summary.bandCounts[b]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSmartPercent(summary.bandPercents[b])}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 3. General ranking */}
      <SectionTitle icon={<Award className="w-4 h-4" />} title="3. Ranking Geral" action={
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="position">Ordenar por posição</SelectItem>
            <SelectItem value="performance">Ordenar por desempenho</SelectItem>
            <SelectItem value="sector">Ordenar por setor</SelectItem>
            <SelectItem value="late">Ordenar por atrasos</SelectItem>
            <SelectItem value="notDelivered">Ordenar por não entregues</SelectItem>
          </SelectContent>
        </Select>
      } />
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Macro</TableHead>
                <TableHead className="text-right">Setorial</TableHead>
                <TableHead className="text-center">Atr.</TableHead>
                <TableHead className="text-center">N.Ent.</TableHead>
                <TableHead className="text-right">Bônus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRanking.map((r) => (
                <TableRow key={r.employee.id} className={r.position <= 3 ? 'bg-orange-500/5' : undefined}>
                  <TableCell className={r.position <= 3 ? 'font-bold text-primary' : ''}>{r.position}</TableCell>
                  <TableCell className="font-medium">{r.employee.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.employee.role}</TableCell>
                  <TableCell className="text-sm">{r.employee.sector}</TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${r.totalPerformance >= 100 ? 'text-green-500' : ''}`}>
                    {formatSmartPercent(r.totalPerformance)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatSmartPercent(r.macroPerformance)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatSmartPercent(r.sectoralPerformance)}%</TableCell>
                  <TableCell className={`text-center tabular-nums ${r.counts.late > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>{r.counts.late}</TableCell>
                  <TableCell className={`text-center tabular-nums ${r.counts.notDelivered > 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>{r.counts.notDelivered}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatSmartPercent(r.employee.performanceBonus)}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={OVERALL_STATUS_BADGE[r.status]}>{OVERALL_STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {sortedRanking.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum colaborador com os filtros aplicados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. Deadline indicators */}
      <SectionTitle icon={<CheckCircle2 className="w-4 h-4" />} title="4. Indicadores de Prazo" />
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className="text-center">Antecip.</TableHead>
                <TableHead className="text-center">Prazo</TableHead>
                <TableHead className="text-center">Atraso</TableHead>
                <TableHead className="text-center">N.Ent.</TableHead>
                <TableHead className="text-right">Pontualidade</TableHead>
                <TableHead className="text-right">Cumprimento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r) => (
                <TableRow key={r.employee.id}>
                  <TableCell className="font-medium">{r.employee.name}</TableCell>
                  <TableCell className="text-sm">{r.employee.sector}</TableCell>
                  <TableCell className="text-center tabular-nums text-green-500">{r.counts.early}</TableCell>
                  <TableCell className="text-center tabular-nums text-blue-500">{r.counts.onTime}</TableCell>
                  <TableCell className="text-center tabular-nums text-amber-500">{r.counts.late}</TableCell>
                  <TableCell className="text-center tabular-nums text-red-500">{r.counts.notDelivered}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMaybe(r.punctuality, '%')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMaybe(r.fulfillment, '%')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Sector comparison */}
      <SectionTitle icon={<Users className="w-4 h-4" />} title="5. Comparativo por Setor" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="sector" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="media" name="Média (%)" fill="#f97316" />
                  <Bar dataKey="pontualidade" name="Pontualidade (%)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-center">Colab.</TableHead>
                  <TableHead className="text-right">Média</TableHead>
                  <TableHead className="text-center">Atr.</TableHead>
                  <TableHead className="text-center">N.Ent.</TableHead>
                  <TableHead className="text-right">Pont.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((s) => (
                  <TableRow key={s.sector}>
                    <TableCell className="font-medium">{s.sector}</TableCell>
                    <TableCell className="text-center tabular-nums">{s.employeeCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMaybe(s.averagePerformance, '%')}</TableCell>
                    <TableCell className={`text-center tabular-nums ${s.delayedGoals > 0 ? 'text-amber-500' : ''}`}>{s.delayedGoals}</TableCell>
                    <TableCell className={`text-center tabular-nums ${s.notDeliveredGoals > 0 ? 'text-red-500' : ''}`}>{s.notDeliveredGoals}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMaybe(s.punctuality, '%')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={OVERALL_STATUS_BADGE[s.status]}>{OVERALL_STATUS_LABEL[s.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 6. Historical */}
      <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title="6. Evolução Mensal e Comparação Histórica" />
      <Card>
        <CardContent className="p-6">
          {historical.trend === 'no-data' ? (
            <p className="text-sm text-muted-foreground">Não há dados históricos suficientes para realizar a comparação.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Média atual" value={formatMaybe(historical.currentAvg, '%')} tone="neutral" />
              <MetricCard label="Período anterior" value={formatMaybe(historical.previousAvg, '%')} tone="neutral" />
              <MetricCard
                label="Variação"
                value={`${(historical.variation ?? 0) >= 0 ? '+' : ''}${formatSmartPercent(historical.variation)} p.p.`}
                tone={historical.trend === 'up' ? 'positive' : historical.trend === 'down' ? 'critical' : 'neutral'}
              />
              <MetricCard
                label="Tendência"
                value={historical.trend === 'up' ? 'Crescimento' : historical.trend === 'down' ? 'Queda' : 'Estabilidade'}
                tone={historical.trend === 'up' ? 'positive' : historical.trend === 'down' ? 'critical' : 'neutral'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Consistency (limited to current dataset) */}
      <SectionTitle icon={<Award className="w-4 h-4" />} title="7. Indicadores de Consistência" />
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <p><strong>Top 3 do período:</strong> {ranked.slice(0, 3).map((r) => r.employee.name).join(', ') || '—'}</p>
          <p><strong>Média acumulada do período:</strong> {formatMaybe(summary.averagePerformance, '%')}</p>
          <p><strong>Colaboradores ≥ 100%:</strong> {summary.bandCounts.excellent}</p>
          <p className="text-xs text-muted-foreground pt-2">
            Indicadores de evolução, queda e atrasos recorrentes exigem histórico multi-mensal. Selecione um período consolidado (todos os meses) para exibir tendências.
          </p>
        </CardContent>
      </Card>

      {/* 8. Alerts */}
      <SectionTitle icon={<AlertTriangle className="w-4 h-4" />} title="8. Alertas e Validações" />
      <div className="grid md:grid-cols-3 gap-3">
        <MetricCard label="Críticos" value={String(alertsByLevel.critical.length)} tone="critical" />
        <MetricCard label="Atenção" value={String(alertsByLevel.attention.length)} tone="warning" />
        <MetricCard label="Informativos" value={String(alertsByLevel.info.length)} tone="neutral" />
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Nível</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum alerta identificado.</TableCell></TableRow>
              )}
              {alerts.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="outline" className={
                      a.level === 'critical' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                      a.level === 'attention' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                      'bg-blue-500/15 text-blue-500 border-blue-500/30'
                    }>
                      {a.level === 'critical' ? 'Crítico' : a.level === 'attention' ? 'Atenção' : 'Informativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell className="text-sm">{a.employee ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Individual report dialog */}
      <Dialog open={individualOpen} onOpenChange={setIndividualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório Individual</DialogTitle>
            <DialogDescription>
              Selecione um colaborador ou gere para todos os colaboradores do filtro atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={individualTarget} onValueChange={setIndividualTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os colaboradores ({filtered.length})</SelectItem>
                {filtered.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndividualOpen(false)}>Cancelar</Button>
            <Button onClick={exportIndividualPDF} disabled={isExporting}>
              <FileText className="w-4 h-4 mr-1" /> Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h3>
      {action}
    </div>
  );
}

type Tone = 'positive' | 'neutral' | 'warning' | 'critical';

function toneFor(value: number | null | undefined): Tone {
  if (value === null || value === undefined) return 'neutral';
  if (value >= 100) return 'positive';
  if (value >= 95) return 'neutral';
  if (value >= 90) return 'warning';
  return 'critical';
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const toneClass =
    tone === 'positive' ? 'border-green-500/30 bg-green-500/5' :
    tone === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
    tone === 'critical' ? 'border-red-500/30 bg-red-500/5' :
    'border-border bg-card';
  const valueColor =
    tone === 'positive' ? 'text-green-500' :
    tone === 'warning' ? 'text-amber-500' :
    tone === 'critical' ? 'text-red-500' :
    'text-foreground';
  return (
    <Card className={toneClass}>
      <CardContent className="p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className={`text-lg font-semibold tabular-nums mt-1 ${valueColor}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
