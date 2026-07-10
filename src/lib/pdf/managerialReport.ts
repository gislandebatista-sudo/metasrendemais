import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Employee,
} from '@/types/employee';
import {
  RankedEmployee,
  ExecutiveSummary,
  SectorSummary,
  ReportAlert,
  OVERALL_STATUS_LABEL,
  OVERALL_STATUS_COLOR,
  PERFORMANCE_BAND_LABEL,
  PERFORMANCE_BAND_COLOR,
  PERFORMANCE_BAND_DESCRIPTION,
  PerformanceBand,
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

interface ManagerialReportInput {
  employees: Employee[];
  ranked: RankedEmployee[];
  summary: ExecutiveSummary;
  sectors: SectorSummary[];
  alerts: ReportAlert[];
  filters: {
    period: string;
    status: string;
    sector: string;
    band: string;
  };
  historical?: {
    currentAvg: number | null;
    previousAvg: number | null;
    variation: number | null;
    trend: 'up' | 'down' | 'stable' | 'no-data';
  };
}

export function generateManagerialPDF(input: ManagerialReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 32;

  const drawHeader = () => {
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, pageWidth, 44, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rende + | Painel Gerencial de Desempenho', marginX, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Período: ${input.filters.period}  |  Status: ${input.filters.status}  |  Setor: ${input.filters.sector}  |  Faixa: ${input.filters.band}`,
      marginX,
      34,
    );
  };

  const drawFooter = (data: { pageNumber: number }) => {
    doc.setFontSize(8);
    doc.setTextColor(120);
    const generated = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(generated, marginX, doc.internal.pageSize.getHeight() - 16);
    doc.text(`Página ${data.pageNumber}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
  };

  const sectionTitle = (text: string, y: number): number => {
    doc.setFillColor(...ORANGE);
    doc.rect(marginX, y, pageWidth - marginX * 2, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, marginX + 8, y + 12);
    return y + 26;
  };

  drawHeader();
  let y = 60;

  // ============ 1. Resumo executivo ============
  y = sectionTitle('1. RESUMO EXECUTIVO', y);
  const s = input.summary;
  const summaryRows: [string, string][] = [
    ['Colaboradores ativos', String(s.activeEmployees)],
    ['Média geral de desempenho', formatMaybe(s.averagePerformance, '%')],
    ['Melhor resultado', formatMaybe(s.bestPerformance, '%')],
    ['Menor resultado', formatMaybe(s.worstPerformance, '%')],
    ['Total de metas avaliadas', String(s.totalGoals)],
    ['Metas antecipadas', `${s.earlyGoals}`],
    ['Metas no prazo', `${s.onTimeGoals}`],
    ['Metas com atraso', `${s.lateGoals}`],
    ['Metas não entregues', `${s.notDeliveredGoals}`],
    ['Taxa geral de pontualidade', formatMaybe(s.overallPunctuality, '%')],
    ['Taxa geral de cumprimento', formatMaybe(s.overallFulfillment, '%')],
  ];
  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ============ 2. Distribuição por faixa ============
  y = sectionTitle('2. DISTRIBUIÇÃO POR FAIXA DE DESEMPENHO', y);
  const bands: PerformanceBand[] = ['excellent', 'satisfactory', 'attention', 'critical'];
  autoTable(doc, {
    startY: y,
    head: [['Faixa', 'Descrição', 'Colaboradores', '% do total']],
    body: bands.map((b) => [
      PERFORMANCE_BAND_LABEL[b],
      PERFORMANCE_BAND_DESCRIPTION[b],
      String(s.bandCounts[b]),
      `${formatSmartPercent(s.bandPercents[b])}%`,
    ]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const band = bands[data.row.index];
        data.cell.styles.textColor = hexToRgb(PERFORMANCE_BAND_COLOR[band]);
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ============ 3. Ranking geral ============
  y = sectionTitle('3. RANKING GERAL', y);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Nome', 'Cargo', 'Setor', 'Total', 'Macro', 'Setorial', 'Atr.', 'N.Ent.', 'Bônus', 'Status']],
    body: input.ranked.map((r) => [
      String(r.position),
      r.employee.name,
      r.employee.role,
      r.employee.sector,
      `${formatSmartPercent(r.totalPerformance)}%`,
      `${formatSmartPercent(r.macroPerformance)}%`,
      `${formatSmartPercent(r.sectoralPerformance)}%`,
      String(r.counts.late),
      String(r.counts.notDelivered),
      `${formatSmartPercent(r.employee.performanceBonus)}%`,
      OVERALL_STATUS_LABEL[r.status],
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: ORANGE, textColor: 255, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const r = input.ranked[data.row.index];
        if (data.column.index === 0 && r.position <= 3) {
          data.cell.styles.fillColor = [255, 237, 213];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 4 && r.totalPerformance >= 100) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 7 && r.counts.late > 0) {
          data.cell.styles.textColor = [245, 158, 11];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 8 && r.counts.notDelivered > 0) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 10) {
          data.cell.styles.textColor = hexToRgb(OVERALL_STATUS_COLOR[r.status]);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: marginX, right: marginX },
    rowPageBreak: 'avoid',
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ============ 4. Indicadores de prazo (por colaborador) ============
  if (y > 700) { doc.addPage(); drawHeader(); y = 60; }
  y = sectionTitle('4. INDICADORES DE PRAZO', y);
  autoTable(doc, {
    startY: y,
    head: [['Colaborador', 'Setor', 'Antecip.', 'Prazo', 'Atraso', 'N.Ent.', 'Pontualidade', 'Cumprimento']],
    body: input.ranked.map((r) => [
      r.employee.name,
      r.employee.sector,
      String(r.counts.early),
      String(r.counts.onTime),
      String(r.counts.late),
      String(r.counts.notDelivered),
      formatMaybe(r.punctuality, '%'),
      formatMaybe(r.fulfillment, '%'),
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    margin: { left: marginX, right: marginX },
    rowPageBreak: 'avoid',
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ============ 5. Comparativo por setor ============
  if (y > 700) { doc.addPage(); drawHeader(); y = 60; }
  y = sectionTitle('5. COMPARATIVO POR SETOR', y);
  autoTable(doc, {
    startY: y,
    head: [['Setor', 'Colab.', 'Média', 'Melhor', 'Menor', 'Macro Méd.', 'Set. Méd.', 'Atr.', 'N.Ent.', 'Pont.', 'Status']],
    body: input.sectors.map((sec) => [
      sec.sector,
      String(sec.employeeCount),
      formatMaybe(sec.averagePerformance, '%'),
      formatMaybe(sec.bestPerformance, '%'),
      formatMaybe(sec.worstPerformance, '%'),
      formatMaybe(sec.averageMacro, '%'),
      formatMaybe(sec.averageSectoral, '%'),
      String(sec.delayedGoals),
      String(sec.notDeliveredGoals),
      formatMaybe(sec.punctuality, '%'),
      OVERALL_STATUS_LABEL[sec.status],
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: ORANGE, textColor: 255 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 10) {
        const sec = input.sectors[data.row.index];
        data.cell.styles.textColor = hexToRgb(OVERALL_STATUS_COLOR[sec.status]);
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: marginX, right: marginX },
    rowPageBreak: 'avoid',
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // ============ 6. Evolução mensal ============
  if (y > 720) { doc.addPage(); drawHeader(); y = 60; }
  y = sectionTitle('6. EVOLUÇÃO MENSAL E COMPARAÇÃO HISTÓRICA', y);
  doc.setTextColor(60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (input.historical && input.historical.trend !== 'no-data' && input.historical.previousAvg !== null && input.historical.currentAvg !== null) {
    const h = input.historical;
    const trendLabel = h.trend === 'up' ? 'Crescimento' : h.trend === 'down' ? 'Queda' : 'Estabilidade';
    autoTable(doc, {
      startY: y,
      body: [
        ['Média atual', formatMaybe(h.currentAvg, '%')],
        ['Média do período anterior', formatMaybe(h.previousAvg, '%')],
        ['Variação', `${(h.variation ?? 0) >= 0 ? '+' : ''}${formatSmartPercent(h.variation)} p.p.`],
        ['Tendência', trendLabel],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
      margin: { left: marginX, right: marginX },
    });
    y = (doc as any).lastAutoTable.finalY + 14;
  } else {
    doc.text('Não há dados históricos suficientes para realizar a comparação.', marginX, y + 4);
    y += 20;
  }

  // ============ 7. Alertas ============
  if (y > 700) { doc.addPage(); drawHeader(); y = 60; }
  y = sectionTitle('7. ALERTAS E VALIDAÇÕES', y);
  if (input.alerts.length === 0) {
    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.text('Nenhum alerta identificado.', marginX, y + 4);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Nível', 'Categoria', 'Colaborador', 'Mensagem']],
      body: input.alerts.map((a) => [
        a.level === 'critical' ? 'Crítico' : a.level === 'attention' ? 'Atenção' : 'Informativo',
        a.category,
        a.employee ?? '—',
        a.message,
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: ORANGE, textColor: 255 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const a = input.alerts[data.row.index];
          const color = a.level === 'critical' ? [220, 38, 38] : a.level === 'attention' ? [245, 158, 11] : [59, 130, 246];
          data.cell.styles.textColor = color as [number, number, number];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX },
      rowPageBreak: 'avoid',
    });
  }

  // Footer on every page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter({ pageNumber: i });
  }

  return doc;
}
