import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Employee, 
  calculateTotalPerformance, 
  calculateGoalsPerformance, 
  getTotalGoalsWeight,
  getGoalStatus,
  getStatusLabel,
  getDelayedGoalsCount,
  getNotDeliveredGoalsCount
} from '@/types/employee';
import { formatDateBR } from '@/lib/utils';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface ExportTabProps {
  employees: Employee[];
}

const MONTHS = [
  { value: 'all', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function ExportTab({ employees }: ExportTabProps) {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredEmployees = employees.filter(emp => {
    if (selectedMonth === 'all') return true;
    return emp.referenceMonth.endsWith(`-${selectedMonth}`);
  });

  const getMonthLabel = (month: string) => {
    return MONTHS.find(m => m.value === month)?.label || month;
  };

  // Calculate dashboard stats
  const calculateStats = () => {
    const activeEmployees = filteredEmployees.filter(emp => emp.status === 'active');
    const performances = activeEmployees.map(emp => calculateTotalPerformance(emp));
    
    const averagePerformance = performances.length > 0 
      ? performances.reduce((a, b) => a + b, 0) / performances.length 
      : 0;
    
    const above100Count = performances.filter(p => p >= 100).length;
    const topPerformance = Math.max(...performances, 0);
    const totalDelayedGoals = filteredEmployees.reduce((sum, emp) => sum + getDelayedGoalsCount(emp), 0);
    const totalNotDelivered = filteredEmployees.reduce((sum, emp) => sum + getNotDeliveredGoalsCount(emp), 0);

    return {
      totalEmployees: filteredEmployees.length,
      activeEmployees: activeEmployees.length,
      averagePerformance,
      above100Count,
      topPerformance,
      totalDelayedGoals,
      totalNotDelivered,
    };
  };

  // Sort employees by performance for ranking
  const getRankedEmployees = () => {
    return [...filteredEmployees]
      .map(emp => ({
        ...emp,
        totalPerf: calculateTotalPerformance(emp),
      }))
      .sort((a, b) => b.totalPerf - a.totalPerf);
  };

  const prepareExportData = () => {
    return filteredEmployees.map(emp => {
      const macroGoals = emp.macroGoals.map(g => ({
        name: g.name,
        weight: g.weight,
        achieved: g.achieved,
        deadline: g.deadline,
        deliveryDate: g.deliveryDate,
        status: getStatusLabel(getGoalStatus(g.deadline, g.deliveryDate)),
        observations: g.observations || '',
      }));
      const sectoralGoals = emp.sectoralGoals.map(g => ({
        name: g.name,
        weight: g.weight,
        achieved: g.achieved,
        deadline: g.deadline,
        deliveryDate: g.deliveryDate,
        status: getStatusLabel(getGoalStatus(g.deadline, g.deliveryDate)),
        observations: g.observations || '',
      }));
      
      const macroWeight = getTotalGoalsWeight(emp.macroGoals);
      const sectoralWeight = getTotalGoalsWeight(emp.sectoralGoals);
      const macroPerf = calculateGoalsPerformance(emp.macroGoals);
      const sectoralPerf = calculateGoalsPerformance(emp.sectoralGoals);
      const totalPerf = calculateTotalPerformance(emp);
      
      return {
        name: emp.name,
        role: emp.role,
        sector: emp.sector,
        referenceMonth: emp.referenceMonth,
        status: emp.status === 'active' ? 'Ativo' : 'Inativo',
        macroGoals,
        sectoralGoals,
        macroWeight,
        sectoralWeight,
        totalWeight: macroWeight + sectoralWeight,
        macroPerf,
        sectoralPerf,
        bonus: emp.performanceBonus,
        bonusDescription: emp.bonusDescription || '',
        totalPerf,
        delayedGoals: getDelayedGoalsCount(emp),
        notDelivered: getNotDeliveredGoalsCount(emp),
      };
    });
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const stats = calculateStats();
      const rankedEmployees = getRankedEmployees();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(249, 115, 22);
      doc.text('Rende + | Relatório Completo de Desempenho', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Período: ${getMonthLabel(selectedMonth)}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 37, { align: 'center' });

      let yPos = 50;

      // Dashboard Stats Summary
      doc.setFillColor(249, 115, 22);
      doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('INDICADORES DO DASHBOARD', 15, yPos + 2);
      yPos += 15;

      doc.setTextColor(60);
      doc.setFontSize(10);
      doc.text(`Total de Colaboradores: ${stats.totalEmployees} (${stats.activeEmployees} ativos)`, 15, yPos);
      yPos += 6;
      doc.text(`Média de Desempenho: ${stats.averagePerformance.toFixed(1)}%`, 15, yPos);
      yPos += 6;
      doc.text(`Melhor Resultado: ${stats.topPerformance.toFixed(1)}%`, 15, yPos);
      yPos += 6;
      doc.text(`Colaboradores acima de 100%: ${stats.above100Count}`, 15, yPos);
      yPos += 6;
      doc.text(`Metas em Atraso: ${stats.totalDelayedGoals}`, 15, yPos);
      yPos += 6;
      doc.text(`Metas Não Entregues: ${stats.totalNotDelivered}`, 15, yPos);
      yPos += 15;

      // Ranking Section
      doc.setFillColor(249, 115, 22);
      doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('RANKING DE DESEMPENHO', 15, yPos + 2);
      yPos += 15;

      doc.setFontSize(9);
      rankedEmployees.forEach((emp, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const rankBadge = index < 3 ? '🏆' : index < 10 ? '⭐' : '';
        doc.setTextColor(index < 3 ? 249 : 60, index < 3 ? 115 : 60, index < 3 ? 22 : 60);
        doc.text(`${index + 1}º ${rankBadge} ${emp.name} - ${emp.sector}`, 15, yPos);
        doc.setTextColor(60);
        doc.text(`${emp.totalPerf.toFixed(1)}%`, pageWidth - 30, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Detailed Employee Data
      data.forEach((emp, index) => {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        // Employee Header
        const ranking = rankedEmployees.findIndex(r => r.name === emp.name) + 1;
        doc.setFillColor(249, 115, 22);
        doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(`${ranking}º | ${emp.name}`, 15, yPos + 2);
        doc.text(`${emp.totalPerf.toFixed(1)}%`, pageWidth - 25, yPos + 2);
        yPos += 15;

        // Employee Info
        doc.setTextColor(60);
        doc.setFontSize(10);
        doc.text(`Cargo: ${emp.role} | Setor: ${emp.sector} | Status: ${emp.status}`, 15, yPos);
        yPos += 6;
        doc.text(`Metas em Atraso: ${emp.delayedGoals} | Não Entregues: ${emp.notDelivered}`, 15, yPos);
        yPos += 8;

        // Macro Goals
        doc.setFontSize(11);
        doc.setTextColor(249, 115, 22);
        doc.text('Metas Macro:', 15, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setTextColor(80);
        
        if (emp.macroGoals.length === 0) {
          doc.text('  Nenhuma meta cadastrada', 15, yPos);
          yPos += 5;
        } else {
          emp.macroGoals.forEach(goal => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${goal.achieved.toFixed(1)}% | ${goal.status}`, 15, yPos);
            yPos += 5;
            if (goal.observations) {
              doc.setTextColor(120);
              const obsText = `    Obs: ${goal.observations.substring(0, 80)}${goal.observations.length > 80 ? '...' : ''}`;
              doc.text(obsText, 15, yPos);
              doc.setTextColor(80);
              yPos += 5;
            }
          });
        }
        doc.text(`  Subtotal Macro: ${emp.macroPerf.toFixed(1)}%`, 15, yPos);
        yPos += 8;

        // Sectoral Goals
        doc.setFontSize(11);
        doc.setTextColor(249, 115, 22);
        doc.text('Metas Setoriais:', 15, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setTextColor(80);
        
        if (emp.sectoralGoals.length === 0) {
          doc.text('  Nenhuma meta cadastrada', 15, yPos);
          yPos += 5;
        } else {
          emp.sectoralGoals.forEach(goal => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${goal.achieved.toFixed(1)}% | ${goal.status}`, 15, yPos);
            yPos += 5;
            if (goal.observations) {
              doc.setTextColor(120);
              const obsText = `    Obs: ${goal.observations.substring(0, 80)}${goal.observations.length > 80 ? '...' : ''}`;
              doc.text(obsText, 15, yPos);
              doc.setTextColor(80);
              yPos += 5;
            }
          });
        }
        doc.text(`  Subtotal Setorial: ${emp.sectoralPerf.toFixed(1)}%`, 15, yPos);
        yPos += 8;

        // Summary
        doc.setFillColor(245, 245, 245);
        doc.rect(10, yPos - 3, pageWidth - 20, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Peso Total das Metas: ${emp.totalWeight}%`, 15, yPos + 3);
        doc.text(`Bônus: +${emp.bonus}%${emp.bonusDescription ? ` (${emp.bonusDescription})` : ''}`, 15, yPos + 10);
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`TOTAL NO RANKING: ${emp.totalPerf.toFixed(1)}%`, pageWidth - 60, yPos + 7);
        yPos += 30;
      });

      doc.save(`rende-mais-relatorio-completo-${selectedMonth === 'all' ? 'todos' : selectedMonth}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const stats = calculateStats();
      const rankedEmployees = getRankedEmployees();
      
      const wb = XLSX.utils.book_new();

      // Sheet 1: Dashboard Summary
      const summaryData = [
        ['INDICADORES DO DASHBOARD', ''],
        ['Período', getMonthLabel(selectedMonth)],
        ['Data de Geração', new Date().toLocaleDateString('pt-BR')],
        ['', ''],
        ['Total de Colaboradores', stats.totalEmployees],
        ['Colaboradores Ativos', stats.activeEmployees],
        ['Média de Desempenho (%)', stats.averagePerformance.toFixed(1)],
        ['Melhor Resultado (%)', stats.topPerformance.toFixed(1)],
        ['Colaboradores Acima de 100%', stats.above100Count],
        ['Metas em Atraso', stats.totalDelayedGoals],
        ['Metas Não Entregues', stats.totalNotDelivered],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Indicadores');

      // Sheet 2: Ranking
      const rankingData = [
        ['Posição', 'Destaque', 'Colaborador', 'Setor', 'Cargo', 'Status', 'Desempenho (%)'],
        ...rankedEmployees.map((emp, index) => [
          index + 1,
          index < 3 ? 'Top 3' : index < 10 ? 'Top 10' : '',
          emp.name,
          emp.sector,
          emp.role,
          emp.status === 'active' ? 'Ativo' : 'Inativo',
          emp.totalPerf.toFixed(1),
        ])
      ];
      const wsRanking = XLSX.utils.aoa_to_sheet(rankingData);
      wsRanking['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

      // Sheet 3: Detailed Data with Goals
      const detailedRows: Record<string, string | number>[] = [];
      
      data.forEach((emp, empIndex) => {
        const ranking = rankedEmployees.findIndex(r => r.name === emp.name) + 1;
        const baseRow: Record<string, string | number> = {
          'Ranking': ranking,
          'Colaborador': emp.name,
          'Cargo': emp.role,
          'Setor': emp.sector,
          'Mês Referência': emp.referenceMonth,
          'Status': emp.status,
          'Metas em Atraso': emp.delayedGoals,
          'Não Entregues': emp.notDelivered,
        };

        // Add macro goals
        emp.macroGoals.forEach((goal, i) => {
          baseRow[`Meta Macro ${i + 1}`] = goal.name;
          baseRow[`Peso Macro ${i + 1} (%)`] = goal.weight;
          baseRow[`Realizado Macro ${i + 1} (%)`] = goal.achieved;
          baseRow[`Status Macro ${i + 1}`] = goal.status;
          baseRow[`Prazo Macro ${i + 1}`] = goal.deadline ? formatDateBR(goal.deadline) : '';
          baseRow[`Entrega Macro ${i + 1}`] = goal.deliveryDate ? formatDateBR(goal.deliveryDate) : '';
          baseRow[`Obs Macro ${i + 1}`] = goal.observations;
        });

        // Add sectoral goals
        emp.sectoralGoals.forEach((goal, i) => {
          baseRow[`Meta Setorial ${i + 1}`] = goal.name;
          baseRow[`Peso Setorial ${i + 1} (%)`] = goal.weight;
          baseRow[`Realizado Setorial ${i + 1} (%)`] = goal.achieved;
          baseRow[`Status Setorial ${i + 1}`] = goal.status;
          baseRow[`Prazo Setorial ${i + 1}`] = goal.deadline ? formatDateBR(goal.deadline) : '';
          baseRow[`Entrega Setorial ${i + 1}`] = goal.deliveryDate ? formatDateBR(goal.deliveryDate) : '';
          baseRow[`Obs Setorial ${i + 1}`] = goal.observations;
        });

        // Add totals
        baseRow['Peso Total Metas (%)'] = emp.totalWeight;
        baseRow['Resultado Macro (%)'] = emp.macroPerf;
        baseRow['Resultado Setorial (%)'] = emp.sectoralPerf;
        baseRow['Bônus (%)'] = emp.bonus;
        baseRow['Descrição Bônus'] = emp.bonusDescription;
        baseRow['TOTAL RANKING (%)'] = emp.totalPerf;

        detailedRows.push(baseRow);
      });

      const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);
      const colWidths = Object.keys(detailedRows[0] || {}).map(() => ({ wch: 18 }));
      wsDetailed['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsDetailed, 'Dados Detalhados');

      // Export
      XLSX.writeFile(wb, `rende-mais-relatorio-completo-${selectedMonth === 'all' ? 'todos' : selectedMonth}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = calculateStats();
  const rankedEmployees = getRankedEmployees();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Relatório Completo
          </CardTitle>
          <CardDescription>
            Baixe o relatório completo com ranking, indicadores, status das metas e dados de desempenho
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Mês de Referência
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.activeEmployees}</p>
              <p className="text-xs text-muted-foreground">Colaboradores Ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.averagePerformance.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Média Desempenho</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.above100Count}</p>
              <p className="text-xs text-muted-foreground">Acima de 100%</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{stats.totalDelayedGoals}</p>
              <p className="text-xs text-muted-foreground">Metas Atrasadas</p>
            </div>
          </div>

          {/* Top 3 Preview */}
          {rankedEmployees.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Top 3 do Ranking</span>
              </div>
              <div className="space-y-2">
                {rankedEmployees.slice(0, 3).map((emp, index) => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-primary">{index + 1}º</span>
                      <span>{emp.name}</span>
                    </span>
                    <span className="font-semibold">{emp.totalPerf.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || filteredEmployees.length === 0}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF Completo
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={isExporting || filteredEmployees.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel Completo
            </Button>
          </div>

          {filteredEmployees.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Nenhum colaborador encontrado para o período selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Table */}
      {filteredEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Prévia do Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Colaborador</th>
                    <th className="text-center p-2 font-medium">Macro</th>
                    <th className="text-center p-2 font-medium">Setorial</th>
                    <th className="text-center p-2 font-medium">Bônus</th>
                    <th className="text-center p-2 font-medium">Atrasos</th>
                    <th className="text-center p-2 font-medium text-primary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedEmployees.map((emp, index) => {
                    const macroPerf = calculateGoalsPerformance(emp.macroGoals);
                    const sectoralPerf = calculateGoalsPerformance(emp.sectoralGoals);
                    const delayed = getDelayedGoalsCount(emp);
                    
                    return (
                      <tr 
                        key={emp.id} 
                        className={`border-b hover:bg-muted/30 ${index < 3 ? 'bg-primary/5' : ''}`}
                      >
                        <td className="p-2 font-bold text-primary">
                          {index + 1}º {index < 3 && '🏆'}
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.role} • {emp.sector}</p>
                          </div>
                        </td>
                        <td className="text-center p-2">{macroPerf.toFixed(1)}%</td>
                        <td className="text-center p-2">{sectoralPerf.toFixed(1)}%</td>
                        <td className="text-center p-2">+{emp.performanceBonus}%</td>
                        <td className="text-center p-2">
                          {delayed > 0 ? (
                            <span className="text-destructive font-medium">{delayed}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="text-center p-2 font-bold text-primary">{emp.totalPerf.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
