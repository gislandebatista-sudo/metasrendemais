import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Employee, calculateTotalPerformance, calculateGoalsPerformance, getTotalGoalsWeight } from '@/types/employee';
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

  const prepareExportData = () => {
    return filteredEmployees.map(emp => {
      const macroGoals = emp.macroGoals.map(g => ({
        name: g.name,
        weight: g.weight,
        achieved: g.achieved,
      }));
      const sectoralGoals = emp.sectoralGoals.map(g => ({
        name: g.name,
        weight: g.weight,
        achieved: g.achieved,
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
      };
    });
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(249, 115, 22); // Orange color
      doc.text('Rende + | Extrato de Desempenho', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Período: ${getMonthLabel(selectedMonth)}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 37, { align: 'center' });

      let yPos = 50;

      data.forEach((emp, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Employee Header
        doc.setFillColor(249, 115, 22);
        doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${emp.name}`, 15, yPos + 2);
        doc.text(`${emp.totalPerf.toFixed(1)}%`, pageWidth - 25, yPos + 2);
        yPos += 15;

        // Employee Info
        doc.setTextColor(60);
        doc.setFontSize(10);
        doc.text(`Cargo: ${emp.role} | Setor: ${emp.sector} | Status: ${emp.status}`, 15, yPos);
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
            doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${goal.achieved.toFixed(1)}%`, 15, yPos);
            yPos += 5;
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
            doc.text(`  • ${goal.name}: Peso ${goal.weight}% | Realizado ${goal.achieved.toFixed(1)}%`, 15, yPos);
            yPos += 5;
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

      doc.save(`rende-mais-extrato-${selectedMonth === 'all' ? 'todos' : selectedMonth}.pdf`);
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
      
      // Create detailed rows for each employee
      const rows: Record<string, string | number>[] = [];
      
      data.forEach(emp => {
        // Employee summary row
        const baseRow = {
          'Colaborador': emp.name,
          'Cargo': emp.role,
          'Setor': emp.sector,
          'Mês Referência': emp.referenceMonth,
          'Status': emp.status,
        };

        // Add macro goals
        emp.macroGoals.forEach((goal, i) => {
          (baseRow as Record<string, string | number>)[`Meta Macro ${i + 1}`] = goal.name;
          (baseRow as Record<string, string | number>)[`Peso Macro ${i + 1} (%)`] = goal.weight;
          (baseRow as Record<string, string | number>)[`Realizado Macro ${i + 1} (%)`] = goal.achieved;
        });

        // Add sectoral goals
        emp.sectoralGoals.forEach((goal, i) => {
          (baseRow as Record<string, string | number>)[`Meta Setorial ${i + 1}`] = goal.name;
          (baseRow as Record<string, string | number>)[`Peso Setorial ${i + 1} (%)`] = goal.weight;
          (baseRow as Record<string, string | number>)[`Realizado Setorial ${i + 1} (%)`] = goal.achieved;
        });

        // Add totals
        (baseRow as Record<string, string | number>)['Peso Total Metas (%)'] = emp.totalWeight;
        (baseRow as Record<string, string | number>)['Resultado Macro (%)'] = emp.macroPerf;
        (baseRow as Record<string, string | number>)['Resultado Setorial (%)'] = emp.sectoralPerf;
        (baseRow as Record<string, string | number>)['Bônus (%)'] = emp.bonus;
        (baseRow as Record<string, string | number>)['Descrição Bônus'] = emp.bonusDescription;
        (baseRow as Record<string, string | number>)['TOTAL RANKING (%)'] = emp.totalPerf;

        rows.push(baseRow);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Extrato de Desempenho');

      // Export
      XLSX.writeFile(wb, `rende-mais-extrato-${selectedMonth === 'all' ? 'todos' : selectedMonth}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Extrato Mensal
          </CardTitle>
          <CardDescription>
            Baixe o comprovante de desempenho dos colaboradores em PDF ou Excel
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

          {/* Preview Info */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{filteredEmployees.length}</strong> colaborador(es) encontrado(s) para exportação
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={exportToPDF} 
              disabled={isExporting || filteredEmployees.length === 0}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              disabled={isExporting || filteredEmployees.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel (.xlsx)
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
            <CardTitle className="text-base">Prévia dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Colaborador</th>
                    <th className="text-center p-2 font-medium">Metas Macro</th>
                    <th className="text-center p-2 font-medium">Metas Setoriais</th>
                    <th className="text-center p-2 font-medium">Peso Total</th>
                    <th className="text-center p-2 font-medium">Bônus</th>
                    <th className="text-center p-2 font-medium text-primary">Total Ranking</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const macroPerf = calculateGoalsPerformance(emp.macroGoals);
                    const sectoralPerf = calculateGoalsPerformance(emp.sectoralGoals);
                    const totalWeight = getTotalGoalsWeight(emp.macroGoals) + getTotalGoalsWeight(emp.sectoralGoals);
                    const totalPerf = calculateTotalPerformance(emp);
                    
                    return (
                      <tr key={emp.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                          </div>
                        </td>
                        <td className="text-center p-2">{macroPerf.toFixed(1)}%</td>
                        <td className="text-center p-2">{sectoralPerf.toFixed(1)}%</td>
                        <td className="text-center p-2">{totalWeight}%</td>
                        <td className="text-center p-2">+{emp.performanceBonus}%</td>
                        <td className="text-center p-2 font-bold text-primary">{totalPerf.toFixed(1)}%</td>
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
