import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type ReportPdfFilter = {
  label: string;
  value: string;
};

export type ReportPdfSummaryMetric = {
  label: string;
  value: string;
};

export type ReportPdfChartPoint = {
  label: string;
  value: number;
  formattedValue?: string;
  color?: string | null;
};

export type ReportPdfChart = {
  title: string;
  points: ReportPdfChartPoint[];
};

export type ReportPdfTable = {
  head: string[];
  body: string[][];
};

export type ReportPdfSection = {
  title: string;
  description?: string;
  table: ReportPdfTable;
};

export type ReportPdfConfig = {
  fileName: string;
  title: string;
  subtitle?: string;
  generatedAt: string;
  filters: ReportPdfFilter[];
  summary: ReportPdfSummaryMetric[];
  charts: ReportPdfChart[];
  sections?: ReportPdfSection[];
  tableTitle?: string;
  table: ReportPdfTable;
  notes?: string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clampChartPoints(points: ReportPdfChartPoint[]): ReportPdfChartPoint[] {
  return points.filter((point) => point.value > 0).slice(0, 6);
}

const REPORT_TEXT = {
  noAdditionalFilter: 'Nenhum filtro adicional aplicado.',
  noChartData: 'Sem dados para este gr\u00E1fico.',
  notesTitle: 'Observa\u00E7\u00F5es',
  generatedAt: 'Gerado em',
  filtersTitle: 'Filtros aplicados',
  resultsTitle: 'Resultados',
  pageLabel: 'P\u00E1gina',
} as const;

function buildHtml(config: ReportPdfConfig): string {
  const filtersHtml = config.filters.length
    ? config.filters
        .map(
          (filter) =>
            `<li><strong>${escapeHtml(filter.label)}:</strong> ${escapeHtml(filter.value)}</li>`
        )
        .join('')
    : `<li>${REPORT_TEXT.noAdditionalFilter}</li>`;

  const summaryHtml = config.summary
    .map(
      (metric) => `
        <div class="metric-card">
          <div class="metric-label">${escapeHtml(metric.label)}</div>
          <div class="metric-value">${escapeHtml(metric.value)}</div>
        </div>
      `
    )
    .join('');

  const chartsHtml = config.charts
    .map((chart) => {
      const points = clampChartPoints(chart.points);
      const maxValue = Math.max(...points.map((point) => point.value), 1);

      const rowsHtml = points
        .map((point) => {
          const widthPercent = Math.max((point.value / maxValue) * 100, 4);
          const color = point.color ?? '#9C5B17';
          const formattedValue = point.formattedValue ?? String(point.value);

          return `
            <div class="bar-row">
              <div class="bar-label">${escapeHtml(point.label)}</div>
              <div class="bar-wrapper">
                <div class="progress-container">
                  <div class="progress-bar" style="width:${widthPercent}%;background:${escapeHtml(color)};"></div>
                </div>
              </div>
              <div class="bar-value">${escapeHtml(formattedValue)}</div>
            </div>
          `;
        })
        .join('');

      return `
        <section class="chart-card">
          <h3>${escapeHtml(chart.title)}</h3>
          ${rowsHtml || '<p>Sem dados para este gráfico.</p>'}
        </section>
      `;
    })
    .join('');

  const sectionsHtml = (config.sections ?? [])
    .map((section) => {
      const headHtml = section.table.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
      const bodyHtml = section.table.body
        .map(
          (row) => `
            <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
          `
        )
        .join('');

      return `
        <section class="section-card">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ''}
          <table>
            <thead><tr>${headHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </section>
      `;
    })
    .join('');

  const headHtml = config.table.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
  const bodyHtml = config.table.body
    .map(
      (row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
      `
    )
    .join('');

  const notesHtml = config.notes?.length
    ? `
        <section class="notes-card">
          <h3>${REPORT_TEXT.notesTitle}</h3>
          <ul>${config.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
        </section>
      `
    : '';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #2A1C11; padding: 28px; }
          h1 { color: #9C5B17; margin: 0 0 8px; }
          h2 { color: #6B5A4B; margin: 0 0 20px; font-size: 14px; font-weight: 600; }
          h3 { color: #9C5B17; margin: 0 0 12px; font-size: 16px; }
          .meta { margin: 0 0 20px; font-size: 12px; color: #6B5A4B; }
          .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
          .metric-card { flex: 1 1 180px; border: 1px solid #D6C6B9; border-radius: 14px; padding: 12px; background: #FFF7EE; }
          .metric-label { font-size: 11px; text-transform: uppercase; color: #6B5A4B; margin-bottom: 6px; }
          .metric-value { font-size: 20px; font-weight: bold; color: #2A1C11; }
          .filters { border: 1px solid #D6C6B9; border-radius: 14px; padding: 12px 16px; background: #FFF7EE; margin-bottom: 20px; }
          .filters ul { margin: 8px 0 0; padding-left: 18px; }
          .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px; }
          .chart-card { border: 1px solid #D6C6B9; border-radius: 14px; padding: 14px; background: #FFF7EE; }
          .section-card { margin-bottom: 20px; }
          .section-description { margin: 0 0 10px; color: #6B5A4B; font-size: 12px; }
          .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
          .bar-label { flex: 0 0 220px; width: 220px; font-weight: 500; font-size: 12px; color: #2A1C11; }
          .bar-wrapper { flex: 1; max-width: 400px; }
          .bar-value { flex: 0 0 60px; width: 60px; text-align: right; font-size: 12px; font-weight: 600; color: #2A1C11; }
          .progress-container { height: 6px; background-color: #EFE6DD; border-radius: 4px; overflow: hidden; }
          .progress-bar { height: 6px; border-radius: 4px; min-width: 8px; background-color: #2E7D32; }
          .notes-card { border: 1px solid #D6C6B9; border-radius: 14px; padding: 14px 16px; background: #FFF7EE; margin-top: 20px; }
          .notes-card ul { margin: 8px 0 0; padding-left: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #9C5B17; color: #FFFFFF; text-align: left; padding: 8px; }
          td { border-bottom: 1px solid #E1D4C9; padding: 8px; vertical-align: top; }
          @media (max-width: 720px) {
            .bar-row { flex-wrap: wrap; align-items: flex-start; }
            .bar-label { flex: 0 0 100%; width: 100%; }
            .bar-wrapper { flex: 1 1 auto; max-width: none; min-width: 0; }
          }
          @media print {
            .progress-container { height: 5px; }
            .progress-bar { height: 5px; }
            .bar-label { font-size: 11px; }
            .bar-value { font-size: 11px; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(config.title)}</h1>
        <h2>${escapeHtml(config.subtitle ?? '')}</h2>
        <p class="meta">${REPORT_TEXT.generatedAt}: ${escapeHtml(config.generatedAt)}</p>
        <section class="filters">
          <h3>${REPORT_TEXT.filtersTitle}</h3>
          <ul>${filtersHtml}</ul>
        </section>
        <section class="summary-grid">${summaryHtml}</section>
        <section class="chart-grid">${chartsHtml}</section>
        ${sectionsHtml}
        <section>
          <h3>${escapeHtml(config.tableTitle ?? REPORT_TEXT.resultsTitle)}</h3>
          <table>
            <thead><tr>${headHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </section>
        ${notesHtml}
      </body>
    </html>
  `;
}

async function exportPdfOnWeb(config: ReportPdfConfig): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const pdfDocument = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdfDocument.internal.pageSize.getWidth();
  const pageHeight = pdfDocument.internal.pageSize.getHeight();
  let cursorY = 44;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - 40) {
      return;
    }

    pdfDocument.addPage();
    cursorY = 40;
  };

  pdfDocument.setProperties({
    title: config.title,
    subject: config.subtitle ?? config.title,
    author: 'WESTER',
    creator: 'WESTER',
  });

  pdfDocument.setFont('helvetica', 'bold');
  pdfDocument.setFontSize(18);
  pdfDocument.setTextColor(42, 28, 17);
  pdfDocument.text(config.title, 40, cursorY);
  cursorY += 18;

  if (config.subtitle) {
    pdfDocument.setFont('helvetica', 'normal');
    pdfDocument.setFontSize(11);
    pdfDocument.setTextColor(107, 90, 75);
    pdfDocument.text(config.subtitle, 40, cursorY);
    cursorY += 18;
  }

  pdfDocument.setFont('helvetica', 'normal');
  pdfDocument.setFontSize(10);
  pdfDocument.setTextColor(107, 90, 75);
  pdfDocument.text(`${REPORT_TEXT.generatedAt}: ${config.generatedAt}`, 40, cursorY);
  cursorY += 22;

  ensureSpace(64);
  pdfDocument.setFont('helvetica', 'bold');
  pdfDocument.setFontSize(12);
  pdfDocument.setTextColor(156, 91, 23);
  pdfDocument.text(REPORT_TEXT.filtersTitle, 40, cursorY);
  cursorY += 12;

  pdfDocument.setFont('helvetica', 'normal');
  pdfDocument.setFontSize(10);
  pdfDocument.setTextColor(42, 28, 17);
  const filters = config.filters.length
    ? config.filters.map((filter) => `${filter.label}: ${filter.value}`)
    : [REPORT_TEXT.noAdditionalFilter];

  for (const filter of filters) {
    const lines = pdfDocument.splitTextToSize(filter, pageWidth - 80);
    ensureSpace(lines.length * 12 + 4);
    pdfDocument.text(lines, 40, cursorY);
    cursorY += lines.length * 12 + 2;
  }

  cursorY += 10;
  ensureSpace(80);
  pdfDocument.setFont('helvetica', 'bold');
  pdfDocument.setFontSize(12);
  pdfDocument.setTextColor(156, 91, 23);
  pdfDocument.text('Indicadores consolidados', 40, cursorY);
  cursorY += 16;

  const metricWidth = (pageWidth - 96) / 2;
  config.summary.forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const boxX = 40 + column * (metricWidth + 16);
    const boxY = cursorY + row * 54;

    ensureSpace(58);
    pdfDocument.setDrawColor(214, 198, 185);
    pdfDocument.setFillColor(255, 247, 238);
    pdfDocument.roundedRect(boxX, boxY, metricWidth, 44, 10, 10, 'FD');
    pdfDocument.setFont('helvetica', 'normal');
    pdfDocument.setFontSize(9);
    pdfDocument.setTextColor(107, 90, 75);
    pdfDocument.text(metric.label.toUpperCase(), boxX + 10, boxY + 14);
    pdfDocument.setFont('helvetica', 'bold');
    pdfDocument.setFontSize(14);
    pdfDocument.setTextColor(42, 28, 17);
    pdfDocument.text(metric.value, boxX + 10, boxY + 32);
  });

  cursorY += Math.ceil(config.summary.length / 2) * 54 + 8;

  const chartLabelWidth = Math.min(220, Math.max(170, pageWidth * 0.34));
  const chartValueWidth = 60;
  const chartGap = 10;
  const chartTrackHeight = 6;
  const chartRowHeight = 18;
  const chartLeftX = 40;
  const chartRightMargin = 40;
  const chartTrackX = chartLeftX + chartLabelWidth + chartGap;
  const availableTrackWidth =
    pageWidth -
    chartLeftX -
    chartRightMargin -
    chartLabelWidth -
    chartValueWidth -
    chartGap * 2;
  const chartTrackWidth = Math.min(400, Math.max(140, availableTrackWidth));
  const chartValueX = chartTrackX + chartTrackWidth + chartGap + chartValueWidth;

  config.charts.forEach((chart) => {
    const points = clampChartPoints(chart.points);
    if (points.length === 0) {
      return;
    }

    ensureSpace(34 + points.length * chartRowHeight);
    pdfDocument.setFont('helvetica', 'bold');
    pdfDocument.setFontSize(12);
    pdfDocument.setTextColor(156, 91, 23);
    pdfDocument.text(chart.title, 40, cursorY);
    cursorY += 18;

    const maxValue = Math.max(...points.map((point) => point.value), 1);

    points.forEach((point) => {
      ensureSpace(chartRowHeight);
      const barColor = point.color ?? '#8B5E34';
      const normalizedValue = Math.max(point.value / maxValue, 0.04);
      const barWidth = chartTrackWidth * normalizedValue;
      const [red, green, blue] = hexToRgb(barColor);
      const labelLines = pdfDocument.splitTextToSize(point.label, chartLabelWidth);
      const labelText = labelLines[0] ?? point.label;
      const barY = cursorY + 2;

      pdfDocument.setFont('helvetica', 'normal');
      pdfDocument.setFontSize(10);
      pdfDocument.setTextColor(42, 28, 17);
      pdfDocument.text(labelText, chartLeftX, cursorY + 8, { maxWidth: chartLabelWidth });
      pdfDocument.text(point.formattedValue ?? String(point.value), chartValueX, cursorY + 8, {
        align: 'right',
      });
      pdfDocument.setFillColor(239, 230, 221);
      pdfDocument.roundedRect(chartTrackX, barY, chartTrackWidth, chartTrackHeight, 3, 3, 'F');
      pdfDocument.setFillColor(red, green, blue);
      pdfDocument.roundedRect(chartTrackX, barY, barWidth, chartTrackHeight, 3, 3, 'F');
      cursorY += chartRowHeight;
    });
  });

  for (const section of config.sections ?? []) {
    ensureSpace(32);
    pdfDocument.setFont('helvetica', 'bold');
    pdfDocument.setFontSize(12);
    pdfDocument.setTextColor(156, 91, 23);
    pdfDocument.text(section.title, 40, cursorY);
    cursorY += 18;

    if (section.description) {
      pdfDocument.setFont('helvetica', 'normal');
      pdfDocument.setFontSize(10);
      pdfDocument.setTextColor(107, 90, 75);
      const descriptionLines = pdfDocument.splitTextToSize(section.description, pageWidth - 80);
      ensureSpace(descriptionLines.length * 12 + 6);
      pdfDocument.text(descriptionLines, 40, cursorY);
      cursorY += descriptionLines.length * 12 + 6;
    }

    autoTable(pdfDocument, {
      startY: cursorY,
      margin: { left: 32, right: 32, top: 24, bottom: 24 },
      head: [section.table.head],
      body: section.table.body,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        textColor: [42, 28, 17],
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [156, 91, 23],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [251, 244, 235],
      },
    });

    const pdfDocumentWithTables = pdfDocument as typeof pdfDocument & {
      lastAutoTable?: { finalY: number };
    };
    cursorY = (pdfDocumentWithTables.lastAutoTable?.finalY ?? cursorY) + 20;
  }

  ensureSpace(32);
  pdfDocument.setFont('helvetica', 'bold');
  pdfDocument.setFontSize(12);
  pdfDocument.setTextColor(156, 91, 23);
  pdfDocument.text(config.tableTitle ?? REPORT_TEXT.resultsTitle, 40, cursorY);
  cursorY += 16;

  autoTable(pdfDocument, {
    startY: cursorY,
    margin: { left: 32, right: 32, top: 24, bottom: 24 },
    head: [config.table.head],
    body: config.table.body,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [42, 28, 17],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [156, 91, 23],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [251, 244, 235],
    },
  });

  const pdfDocumentWithTables = pdfDocument as typeof pdfDocument & {
    lastAutoTable?: { finalY: number };
  };
  cursorY = (pdfDocumentWithTables.lastAutoTable?.finalY ?? cursorY) + 18;

  if (config.notes?.length) {
    ensureSpace(24);
    pdfDocument.setFont('helvetica', 'bold');
    pdfDocument.setFontSize(12);
    pdfDocument.setTextColor(156, 91, 23);
    pdfDocument.text(REPORT_TEXT.notesTitle, 40, cursorY);
    cursorY += 16;

    pdfDocument.setFont('helvetica', 'normal');
    pdfDocument.setFontSize(10);
    pdfDocument.setTextColor(42, 28, 17);

    for (const note of config.notes) {
      const noteLines = pdfDocument.splitTextToSize(`- ${note}`, pageWidth - 80);
      ensureSpace(noteLines.length * 12 + 4);
      pdfDocument.text(noteLines, 40, cursorY);
      cursorY += noteLines.length * 12 + 2;
    }
  }

  const pageCount = pdfDocument.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdfDocument.setPage(page);
    pdfDocument.setFontSize(9);
    pdfDocument.setTextColor(100);
    pdfDocument.text(`Página ${page}/${pageCount}`, pageWidth - 40, pageHeight - 18, {
      align: 'right',
    });
  }

  const pdfBlob = pdfDocument.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const reportWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

  if (!reportWindow && typeof document !== 'undefined') {
    const browserDocument = document;
    const link = browserDocument.createElement('a');
    link.href = pdfUrl;
    link.download = config.fileName;
    browserDocument.body.appendChild(link);
    link.click();
    browserDocument.body.removeChild(link);
  }

  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 120000);
}

function hexToRgb(color: string): [number, number, number] {
  const normalized = color.replace('#', '');
  const full = normalized.length === 3
    ? normalized
        .split('')
        .map((chunk) => `${chunk}${chunk}`)
        .join('')
    : normalized;

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return [
    Number.isFinite(red) ? red : 156,
    Number.isFinite(green) ? green : 91,
    Number.isFinite(blue) ? blue : 23,
  ];
}

async function exportPdfOnNative(config: ReportPdfConfig): Promise<void> {
  const html = buildHtml(config);
  const file = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: config.title,
    });
  }
}

export async function exportReportPdf(config: ReportPdfConfig): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    await exportPdfOnWeb(config);
    return;
  }

  await exportPdfOnNative(config);
}
