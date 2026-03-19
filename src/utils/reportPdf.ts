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

export type ReportPdfConfig = {
  fileName: string;
  title: string;
  subtitle?: string;
  generatedAt: string;
  filters: ReportPdfFilter[];
  summary: ReportPdfSummaryMetric[];
  charts: ReportPdfChart[];
  table: ReportPdfTable;
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

function buildHtml(config: ReportPdfConfig): string {
  const filtersHtml = config.filters.length
    ? config.filters
        .map(
          (filter) =>
            `<li><strong>${escapeHtml(filter.label)}:</strong> ${escapeHtml(filter.value)}</li>`
        )
        .join('')
    : '<li>Nenhum filtro adicional aplicado.</li>';

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
            <div class="chart-row">
              <div class="chart-head">
                <span>${escapeHtml(point.label)}</span>
                <strong>${escapeHtml(formattedValue)}</strong>
              </div>
              <div class="chart-track">
                <div class="chart-bar" style="width:${widthPercent}%;background:${escapeHtml(color)};"></div>
              </div>
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

  const headHtml = config.table.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('');
  const bodyHtml = config.table.body
    .map(
      (row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
      `
    )
    .join('');

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
          .chart-row { margin-bottom: 10px; }
          .chart-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; font-size: 12px; }
          .chart-track { height: 10px; background: #EFE1D3; border-radius: 999px; overflow: hidden; }
          .chart-bar { height: 100%; border-radius: 999px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #9C5B17; color: #FFFFFF; text-align: left; padding: 8px; }
          td { border-bottom: 1px solid #E1D4C9; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(config.title)}</h1>
        <h2>${escapeHtml(config.subtitle ?? '')}</h2>
        <p class="meta">Gerado em: ${escapeHtml(config.generatedAt)}</p>
        <section class="filters">
          <h3>Filtros aplicados</h3>
          <ul>${filtersHtml}</ul>
        </section>
        <section class="summary-grid">${summaryHtml}</section>
        <section class="chart-grid">${chartsHtml}</section>
        <section>
          <h3>Resultados</h3>
          <table>
            <thead><tr>${headHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </section>
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
  pdfDocument.text(`Gerado em: ${config.generatedAt}`, 40, cursorY);
  cursorY += 22;

  ensureSpace(64);
  pdfDocument.setFont('helvetica', 'bold');
  pdfDocument.setFontSize(12);
  pdfDocument.setTextColor(156, 91, 23);
  pdfDocument.text('Filtros aplicados', 40, cursorY);
  cursorY += 12;

  pdfDocument.setFont('helvetica', 'normal');
  pdfDocument.setFontSize(10);
  pdfDocument.setTextColor(42, 28, 17);
  const filters = config.filters.length
    ? config.filters.map((filter) => `${filter.label}: ${filter.value}`)
    : ['Nenhum filtro adicional aplicado.'];

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

  config.charts.forEach((chart) => {
    const points = clampChartPoints(chart.points);
    if (points.length === 0) {
      return;
    }

    ensureSpace(40 + points.length * 26);
    pdfDocument.setFont('helvetica', 'bold');
    pdfDocument.setFontSize(12);
    pdfDocument.setTextColor(156, 91, 23);
    pdfDocument.text(chart.title, 40, cursorY);
    cursorY += 18;

    const maxValue = Math.max(...points.map((point) => point.value), 1);

    points.forEach((point) => {
      ensureSpace(24);
      const barColor = point.color ?? '#9C5B17';
      const normalizedValue = Math.max(point.value / maxValue, 0.04);
      const barWidth = (pageWidth - 220) * normalizedValue;
      const [red, green, blue] = hexToRgb(barColor);

      pdfDocument.setFont('helvetica', 'normal');
      pdfDocument.setFontSize(10);
      pdfDocument.setTextColor(42, 28, 17);
      pdfDocument.text(point.label, 40, cursorY + 8);
      pdfDocument.text(point.formattedValue ?? String(point.value), pageWidth - 40, cursorY + 8, {
        align: 'right',
      });
      pdfDocument.setFillColor(239, 225, 211);
      pdfDocument.roundedRect(150, cursorY, pageWidth - 220, 10, 4, 4, 'F');
      pdfDocument.setFillColor(red, green, blue);
      pdfDocument.roundedRect(150, cursorY, barWidth, 10, 4, 4, 'F');
      cursorY += 24;
    });
  });

  autoTable(pdfDocument, {
    startY: cursorY + 4,
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
