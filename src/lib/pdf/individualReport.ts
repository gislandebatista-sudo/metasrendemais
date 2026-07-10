import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, getGoalStatus, getStatusLabel, calculateGoalsPerformance, calculateTotalPerformance } from '@/types/employee';
import { formatDateBR } from '@/lib/utils';
import {
  RankedEmployee,
  countGoals,
  allEmployeeGoals,
  getPunctualityRate,
  getOverallStatus,
  OVERALL_STATUS_LABEL,
  OVERALL_STATUS_COLOR,
  formatSmartPercent,
  formatMaybe,
} from '@/lib/reporting';

const ORANGE: [number, number, number] = [249, 115, 22];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

export interface IndividualReportInput {
  employees: Employee[]; // one or many
  ranked: RankedEmployee[]; // full ranking to look up positions
  period: string;
  previousMonthEmployees?: Employee[]; // for historical comparison
  previousRanking?: RankedEmployee[];
}

export function generateIndividualPDF(input: IndividualReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 32;

  const drawHeader = () => {
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Rende + | Relatório Individual', marginX, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${input.period}`, marginX, 32);
  };

  const drawFooter = (page: number) => {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, marginX, doc.internal.pageSize.getHeight() - 16);
    doc.text(`Página ${page}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
  };

  input.employees.forEach((emp, idx) => {
    if (idx > 0) doc.addPage();
    drawHeader();
    let y = 56;

    const ranked = input.ranked.find((r) => r.employee.id === emp.id);
    const position = ranked?.position ?? '—';
    const totalPerf = calculateTotalPerformance(emp);
    const macroPerf = calculateGoalsPerformance(emp.macroGoals);
    const sectPerf = calculateGoalsPerformance(emp.sectoralGoals);
    const counts = countGoals(allEmployeeGoals(emp));
    const punctuality = getPunctualityRate(counts);
    const status = getOverallStatus(emp);

    // Employee title
    doc.setFillColor(...ORANGE);
    doc.rect(marginX, y, pageWidth - marginX * 2, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${position}º | ${emp.name}`, marginX + 8, y + 15);
    doc.text(`${formatSmartPercent(totalPerf)}%`, pageWidth - marginX - 8, y + 15, { align: 'right' });
    y += 32;

    // Info table
    const previousEmp = input.previousMonthEmployees?.find((p) => p.id === emp.id || p.name === emp.name);
    const previousRank = input.previousRanking?.find((r) => r.employee.id === emp.id || r.employee.name === emp.name);
    const previousPerf = previousEmp ? calculateTotalPerformance(previousEmp) : null;
    const variation = previousPerf !== null ? totalPerf - previousPerf : null;

    const infoRows: [string, string][] = [
      ['Cargo', emp.role || 'Não informado'],
      ['Setor', emp.sector || 'Não informado'],
      ['Status do colaborador', emp.status === 'active' ? 'Ativo' : 'Inativo'],
      ['Status geral', OVERALL_STATUS_LABEL[status]],
      ['Desempenho total', `${formatSmartPercent(totalPerf)}%`],
      ['Resultado metas macro', `${formatSmartPercent(macroPerf)}%`],
      ['Resultado metas setoriais', `${formatSmartPercent(sectPerf)}%`],
      ['Bônus', `${formatSmartPercent(emp.performanceBonus)}%`],
      ['Motivo do bônus', emp.bonusDescription || 'Não informado'],
      ['Metas antecipadas', String(counts.early)],
      ['Metas no prazo', String(counts.onTime)],
      ['Metas com atraso', String(counts.late)],
      ['Metas não entregues', String(counts.notDelivered)],
      ['Taxa de pontualidade', formatMaybe(punctuality, '%')],
    ];
    if (previousPerf !== null && previousRank) {
      infoRows.push(['Posição período anterior', `${previousRank.position}º`]);
      infoRows.push(['Desempenho período anterior', `${formatSmartPercent(previousPerf)}%`]);
      infoRows.push(['Variação vs. período anterior', `${(variation ?? 0) >= 0 ? '+' : ''}${formatSmartPercent(variation)} p.p.`]);
    } else {
      infoRows.push(['Comparação histórica', 'Não há dados históricos suficientes']);
    }

    autoTable(doc, {
      startY: y,
      body: infoRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 } },
      margin: { left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === 3 && data.column.index === 1) {
          data.cell.styles.textColor = hexToRgb(OVERALL_STATUS_COLOR[status]);
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Goals table
    const goals = [
      ...emp.macroGoals.map((g) => ({ ...g, tipo: 'Macro' })),
      ...emp.sectoralGoals.map((g) => ({ ...g, tipo: 'Setorial' })),
    ];

    autoTable(doc, {
      startY: y,
      head: [['Meta', 'Tipo', 'Peso', 'Realiz.', 'Δ', 'Prazo', 'Entrega', 'Status', 'Observação']],
      body: goals.map((g) => {
        const st = getGoalStatus(g.deadline, g.deliveryDate);
        const obs = g.observations ? (g.observations.length > 120 ? g.observations.substring(0, 120) + '…' : g.observations) : '';
        return [
          g.name,
          g.tipo,
          `${formatSmartPercent(g.weight)}%`,
          `${formatSmartPercent(g.achieved)}%`,
          `${formatSmartPercent(g.achieved - g.weight)}`,
          formatDateBR(g.deadline),
          g.deliveryDate ? formatDateBR(g.deliveryDate) : '—',
          getStatusLabel(st),
          obs,
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: ORANGE, textColor: 255 },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 40 },
        2: { cellWidth: 34, halign: 'right' },
        3: { cellWidth: 38, halign: 'right' },
        4: { cellWidth: 34, halign: 'right' },
        5: { cellWidth: 52 },
        6: { cellWidth: 52 },
        7: { cellWidth: 58 },
        8: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const g = goals[data.row.index];
          if (g.weight === 0) data.cell.styles.fillColor = [245, 245, 245];
          if (data.column.index === 7) {
            const st = getGoalStatus(g.deadline, g.deliveryDate);
            const color: [number, number, number] =
              st === 'early' ? [22, 163, 74] : st === 'on_time' ? [59, 130, 246] : st === 'late' ? [245, 158, 11] : [220, 38, 38];
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: marginX, right: marginX },
      rowPageBreak: 'avoid',
    });
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i);
  }

  return doc;
}
