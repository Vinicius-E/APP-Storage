// DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, TextInput } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import DashboardQuickActions from '../components/DashboardQuickActions';
import FilterSelect from '../components/FilterSelect';
import ModalFrame from '../components/warehouse2d/modals/ModalFrame';
import { useAreaContext } from '../areas/AreaContext';
import { API_STATE_MESSAGES, getApiEmptyCopy } from '../constants/apiStateMessages';
import { useAppScreenScrollableLayout } from '../hooks/useAppScreenScrollableLayout';
import { listAllStockItems, listStockItems, type StockItemDTO } from '../services/stockItemApi';
import { useThemeContext } from '../theme/ThemeContext';
import { getUserFacingErrorMessage } from '../utils/userFacingError';

type DashboardSortColumn = 'produto' | 'quantidade' | 'status';

type StockRow = {
  id: string;
  itemEstoqueId: number;
  areaId: number | null;
  areaNome: string;
  produto: string;
  fileira: string;
  grade: string;
  nivel: string;
  status: 'Disponível' | 'Reservado' | 'Baixo';
  quantidade: number;
  codigoSistemaWester: string;
  cor: string;
  descricao: string;
};

type StockReportSummary = {
  areas: number;
  fileiras: number;
  grades: number;
  niveis: number;
  itens: number;
  linhas: number;
  vazios: number;
};

type StockCardVariant = 'compact' | 'full';

const STATUS_COLOR: Record<StockRow['status'], string> = {
  Disponível: '#2E7D32',
  Reservado: '#E67E22',
  Baixo: '#C62828',
};

function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const expanded = color.replace(
      /^#(.)(.)(.)$/i,
      (_match, r: string, g: string, b: string) => `#${r}${r}${g}${g}${b}${b}`
    );
    return `${expanded}${hexAlpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${hexAlpha}`;
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}

function StockStatusBadge({ status }: { status: StockRow['status'] }) {
  const accent = STATUS_COLOR[status];

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: withAlpha(accent, 0.1),
          borderColor: withAlpha(accent, 0.24),
        },
      ]}
    >
      <Text style={[styles.statusBadgeLabel, { color: accent }]}>{status}</Text>
    </View>
  );
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = String(value ?? '').trim();
    if (normalized !== '') {
      return normalized;
    }
  }
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeText(value: string | null | undefined, fallback = '-'): string {
  const normalized = String(value ?? '').trim();
  return normalized !== '' ? normalized : fallback;
}

function computeStatus(quantidade: number): StockRow['status'] {
  if (quantidade <= 10) {
    return 'Baixo';
  }

  return 'Dispon\u00edvel' as StockRow['status'];
}

function buildLocationLabel(
  row: Pick<StockRow, 'areaNome' | 'fileira' | 'grade' | 'nivel'>
): string {
  const areaPrefix = row.areaNome ? `Setor ${row.areaNome} / ` : '';
  return `${areaPrefix}Fileira ${row.fileira} / Grade ${row.grade} / Nível ${row.nivel}`;
}

function normalizeLocationSegment(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();

  if (!normalized || normalized === '-') {
    return '';
  }

  return normalized;
}

function buildCompactLocationLabel(
  row: Pick<StockRow, 'areaNome' | 'fileira' | 'grade' | 'nivel'>
): string {
  const areaName = normalizeLocationSegment(row.areaNome);
  const shelfRow = normalizeLocationSegment(row.fileira);
  const grid = normalizeLocationSegment(row.grade);
  const level = normalizeLocationSegment(row.nivel);
  const locationSegments: string[] = [];

  if (areaName) {
    locationSegments.push(areaName);
  }

  if (shelfRow || grid || level) {
    const locationCode = [shelfRow && `F${shelfRow}`, grid && `G${grid}`, level && `N${level}`]
      .filter(Boolean)
      .join(' / ');

    if (locationCode) {
      locationSegments.push(locationCode);
    }
  }

  return locationSegments.join(' | ');
}

function compareStockRows(
  left: StockRow,
  right: StockRow,
  sortBy: DashboardSortColumn,
  sortDirection: 'asc' | 'desc'
): number {
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'quantidade') {
    return (left.quantidade - right.quantidade) * direction;
  }

  const leftValue = sortBy === 'status' ? left.status : left.produto;
  const rightValue = sortBy === 'status' ? right.status : right.produto;

  return leftValue.localeCompare(rightValue, 'pt-BR') * direction;
}

function buildSortParam(sortBy: DashboardSortColumn, sortDirection: 'asc' | 'desc'): string {
  const field = sortBy === 'quantidade' || sortBy === 'status' ? 'quantidade' : 'nomeModelo';
  return `${field},${sortDirection}`;
}

function mapStockItemToRow(item: StockItemDTO): StockRow {
  const produto = firstNonEmpty(item.nomeModelo, item.codigoSistemaWester, 'Sem produto');

  return {
    id: String(item.itemEstoqueId),
    itemEstoqueId: item.itemEstoqueId,
    areaId: item.areaId,
    areaNome: normalizeText(item.areaNome, ''),
    produto,
    fileira: normalizeText(item.fileiraIdentificador),
    grade: normalizeText(item.gradeIdentificador),
    nivel: normalizeText(item.nivelIdentificador),
    status: computeStatus(item.quantidade),
    quantidade: item.quantidade,
    codigoSistemaWester: normalizeText(item.codigoSistemaWester, ''),
    cor: normalizeText(item.cor, ''),
    descricao: normalizeText(item.descricao, ''),
  };
}

function StockItemCard({
  row,
  variant,
}: {
  row: StockRow;
  variant: StockCardVariant;
}) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.text;
  const compactLocationLabel = buildCompactLocationLabel(row);
  const productCode = row.codigoSistemaWester || 'Não informado';

  if (variant === 'full') {
    return (
      <View style={styles.stockDesktopRow}>
        <View style={styles.tableColStatus}>
          <StockStatusBadge status={row.status} />
        </View>

        <View style={styles.tableColProduct}>
          <Text style={[styles.stockTitle, { color: theme.colors.text }]}>{row.produto}</Text>
        </View>

        <View style={styles.tableCol}>
          <Text style={[styles.stockMeta, { color: textSecondary }]}>{buildLocationLabel(row)}</Text>
        </View>

        <View style={styles.tableColQty}>
          <Text style={[styles.stockQtyDesktop, { color: theme.colors.text }]}>
            {row.quantidade}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stockCompactContent}>
      <View style={styles.stockCompactHeader}>
        <View style={styles.stockCompactProductBlock}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.stockTitle, styles.stockCompactTitle, { color: theme.colors.text }]}
          >
            {row.produto}
          </Text>

          {compactLocationLabel ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.stockSubtitle, styles.stockCompactLocation, { color: textSecondary }]}
            >
              {compactLocationLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.stockCompactQuantityBlock}>
          <Text style={[styles.stockCompactQuantityLabel, { color: textSecondary }]}>
            Quantidade
          </Text>
          <Text
            style={[
              styles.stockQty,
              styles.stockCompactQuantityValue,
              { color: theme.colors.text },
            ]}
          >
            {row.quantidade}
          </Text>
        </View>
      </View>

      <View style={styles.stockCompactFooter}>
        <View
          style={[
            styles.stockCompactCodeChip,
            {
              backgroundColor: withAlpha(theme.colors.primary, 0.08),
              borderColor: withAlpha(theme.colors.primary, 0.22),
            },
          ]}
        >
          <Text style={[styles.stockCompactCodeLabel, { color: theme.colors.primary }]}>
            CDG_WESTER
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.stockCompactCodeValue, { color: theme.colors.text }]}
          >
            {productCode}
          </Text>
        </View>

        <View style={styles.stockCompactStatusWrap}>
          <StockStatusBadge status={row.status} />
        </View>
      </View>
    </View>
  );
}

function buildReportSummary(rows: StockRow[]): StockReportSummary {
  const areaKeys = new Set<string>();
  const fileiraKeys = new Set<string>();
  const gradeKeys = new Set<string>();
  const nivelKeys = new Set<string>();
  let itens = 0;

  for (const row of rows) {
    const areaKey = row.areaId != null ? String(row.areaId) : row.areaNome || 'sem-area';
    const fileiraKey = `${areaKey}__${row.fileira}`;
    const gradeKey = `${fileiraKey}__${row.grade}`;
    const nivelKey = `${gradeKey}__${row.nivel}`;

    if (row.areaNome) {
      areaKeys.add(areaKey);
    }

    fileiraKeys.add(fileiraKey);
    gradeKeys.add(gradeKey);
    nivelKeys.add(nivelKey);
    itens += row.quantidade;
  }

  return {
    areas: areaKeys.size,
    fileiras: fileiraKeys.size,
    grades: gradeKeys.size,
    niveis: nivelKeys.size,
    itens,
    linhas: rows.length,
    vazios: 0,
  };
}

function buildStockReportHtml(
  reportRows: StockRow[],
  generatedAt: string,
  summary: StockReportSummary
): string {
  const rowsHtml = reportRows
    .map((row, index) => {
      const rowBg = index % 2 === 0 ? '#FBF4EB' : '#FFF9F2';
      return `
        <tr style="background:${rowBg};">
          <td>${escapeHtml(row.produto)}</td>
          <td>${escapeHtml(buildLocationLabel(row))}</td>
          <td>${escapeHtml(row.status)}</td>
          <td style="text-align:right;font-weight:700;">${row.quantidade}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>WESTER - Relatório de Estoque</title>
        <style>
          body { font-family: Arial, sans-serif; color: #2A1C11; margin: 28px; }
          h1 { margin: 0 0 6px 0; color: #9C5B17; font-size: 22px; }
          p { margin: 4px 0; }
          .meta { margin-bottom: 14px; }
          .cards { margin: 8px 0 16px 0; }
          .cards span {
            display: inline-block;
            background: #F3DFC4;
            color: #5E3B14;
            border-radius: 999px;
            padding: 6px 10px;
            margin: 0 6px 6px 0;
            font-size: 12px;
            font-weight: 700;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td {
            border: 1px solid #D6C6B9;
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: top;
          }
          th {
            background: #EED9BC;
            color: #5E3B14;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
        </style>
      </head>
      <body>
        <h1>WESTER - Relatório de Estoque</h1>
        <p class="meta">Gerado em: ${escapeHtml(generatedAt)}</p>
        <div class="cards">
          <span>Fileiras: ${summary.fileiras}</span>
          <span>Grades: ${summary.grades}</span>
          <span>Níveis: ${summary.niveis}</span>
          <span>Itens: ${summary.itens}</span>
          <span>Vazios: ${summary.vazios}</span>
          <span>Total de linhas: ${reportRows.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Localização</th>
              <th>Status</th>
              <th style="text-align:right;">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export default function DashboardScreen() {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const dashboardScrollableLayout = useAppScreenScrollableLayout(24);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { areas } = useAreaContext();

  const [filter, setFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<DashboardSortColumn>('produto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isPdfHovered, setIsPdfHovered] = useState(false);
  const [hoveredSortColumn, setHoveredSortColumn] = useState<DashboardSortColumn | null>(null);
  const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [summary, setSummary] = useState({
    fileiras: 0,
    grades: 0,
    niveis: 0,
    itens: 0,
    vazios: 0,
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const isTabletOrDesktop = width >= 900;
  const stockCardVariant: StockCardVariant = isTabletOrDesktop ? 'full' : 'compact';

  const areaOptions = useMemo(
    () => [
      {
        value: '',
        label: 'Todos os setores',
      },
      ...[...areas]
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
        .map((area) => ({
          value: String(area.id),
          label: area.active === false ? `${area.name} (inativo)` : area.name,
        })),
    ],
    [areas]
  );

  const selectedAreaValue = selectedAreaFilter == null ? '' : String(selectedAreaFilter);
  const selectedAreaLabel =
    areaOptions.find((option) => option.value === selectedAreaValue)?.label ?? 'Todos os setores';

  const hasDashboardFilters = appliedFilter.trim() !== '' || selectedAreaFilter != null;
  const dashboardEmptyCopy = getApiEmptyCopy('dashboard', hasDashboardFilters);
  const rangeStart = totalItems === 0 ? 0 : page * itemsPerPage + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(page * itemsPerPage + rows.length, totalItems);

  const loadDashboard = useCallback(
    async (targetPage: number, isRefresh: boolean) => {
      setLoadErrorMessage('');

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await listStockItems({
          page: targetPage,
          size: itemsPerPage,
          areaId: selectedAreaFilter,
          filtro: appliedFilter || undefined,
          sort: buildSortParam(sortBy, sortDirection),
        });

        const mappedRows = response.content
          .map(mapStockItemToRow)
          .sort((left, right) => compareStockRows(left, right, sortBy, sortDirection));

        const fileiraKeys = new Set<string>();
        const gradeKeys = new Set<string>();
        const nivelKeys = new Set<string>();
        let itens = 0;

        mappedRows.forEach((row) => {
          const areaKey = row.areaId != null ? String(row.areaId) : row.areaNome || 'sem-area';
          fileiraKeys.add(`${areaKey}__${row.fileira}`);
          gradeKeys.add(`${areaKey}__${row.fileira}__${row.grade}`);
          nivelKeys.add(`${areaKey}__${row.fileira}__${row.grade}__${row.nivel}`);
          itens += row.quantidade;
        });

        setRows(mappedRows);
        setPage((currentPage) => (currentPage === response.page ? currentPage : response.page));
        setTotalItems(Math.max(response.totalElements, 0));
        setTotalPages(Math.max(response.totalPages, 0));
        setSummary({
          fileiras: fileiraKeys.size,
          grades: gradeKeys.size,
          niveis: nivelKeys.size,
          itens,
          vazios: 0,
        });
      } catch (error) {
        setRows([]);
        setTotalItems(0);
        setTotalPages(0);
        setSummary({ fileiras: 0, grades: 0, niveis: 0, itens: 0, vazios: 0 });
        setLoadErrorMessage(
          getUserFacingErrorMessage(error, API_STATE_MESSAGES.dashboard.error.description)
        );
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [appliedFilter, itemsPerPage, selectedAreaFilter, sortBy, sortDirection]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextFilter = filter.trim();
      setAppliedFilter((currentFilter) =>
        currentFilter === nextFilter ? currentFilter : nextFilter
      );
      setPage((currentPage) => (currentPage === 0 ? currentPage : 0));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filter]);

  useEffect(() => {
    void loadDashboard(page, false);
  }, [loadDashboard, page]);

  const onRefresh = useCallback(() => {
    void loadDashboard(page, true);
  }, [loadDashboard, page]);

  const handleSort = (column: DashboardSortColumn) => {
    setPage(0);

    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortDirection('asc');
  };
  const handleGenerateReport = useCallback(async () => {
    if (totalItems === 0) {
      Alert.alert('Gerar relatório', 'Não há itens de estoque para exportar no momento.');
      return;
    }

    setGeneratingReport(true);
    try {
      const reportRows = (
        await listAllStockItems({
          areaId: selectedAreaFilter,
          filtro: appliedFilter || undefined,
          sort: buildSortParam(sortBy, sortDirection),
          size: Math.max(itemsPerPage, 100),
        })
      )
        .map(mapStockItemToRow)
        .sort((left, right) => compareStockRows(left, right, sortBy, sortDirection));

      if (reportRows.length === 0) {
        Alert.alert('Gerar relatório', 'Não há itens de estoque para exportar no momento.');
        return;
      }

      const generatedAt = new Date().toLocaleString('pt-BR');
      const orderedRows = reportRows;
      const reportSummary = {
        ...buildReportSummary(reportRows),
        vazios: 0,
      };
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4',
        });
        const title = 'WESTER - Relatório de Estoque';
        doc.setProperties({
          title,
          subject: 'Relatório completo de estoque',
          author: 'WESTER',
          creator: 'WESTER',
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(title, 40, 46);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Gerado em: ${generatedAt}`, 40, 66);
        const summaryLine =
          `Fileiras: ${reportSummary.fileiras}  |  Grades: ${reportSummary.grades}  |  ` +
          `Níveis: ${reportSummary.niveis}  |  Itens: ${reportSummary.itens}  |  Vazios: ${reportSummary.vazios}`;
        doc.text(summaryLine, 40, 84);

        const tableRows = orderedRows.map((row) => [
          row.produto,
          buildLocationLabel(row),
          row.status,
          String(row.quantidade),
        ]);

        const pageWidth = doc.internal.pageSize.getWidth();
        const tableMarginX = 32;
        const usableTableWidth = pageWidth - tableMarginX * 2;
        const productColWidth = Math.floor(usableTableWidth * 0.28);
        const locationColWidth = Math.floor(usableTableWidth * 0.44);
        const statusColWidth = Math.floor(usableTableWidth * 0.14);
        const qtyColWidth = usableTableWidth - productColWidth - locationColWidth - statusColWidth;

        autoTable(doc, {
          startY: 100,
          margin: { left: tableMarginX, right: tableMarginX, top: 24, bottom: 24 },
          head: [['Produto', 'Localização', 'Status', 'Quantidade']],
          body: tableRows,
          theme: 'grid',
          styles: {
            fontSize: 10,
            cellPadding: 6,
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
          columnStyles: {
            0: { cellWidth: productColWidth },
            1: { cellWidth: locationColWidth },
            2: { cellWidth: statusColWidth },
            3: { cellWidth: qtyColWidth, halign: 'right' },
          },
        });

        const pageCount = doc.getNumberOfPages();
        for (let page = 1; page <= pageCount; page += 1) {
          doc.setPage(page);
          const footerPageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Página ${page}/${pageCount}`, footerPageWidth - 40, pageHeight - 18, {
            align: 'right',
          });
        }

        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const reportWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

        if (!reportWindow && typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = 'WESTER-relatorio-de-estoque.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 120000);
        return;
      }

      const html = buildStockReportHtml(orderedRows, generatedAt, reportSummary);
      const file = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Relatório de estoque',
        });
      } else {
        Alert.alert('Relatório gerado', `PDF salvo em:\n${file.uri}`);
      }
    } catch (error) {
      console.error('Falha ao gerar relatório PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório PDF.');
    } finally {
      setGeneratingReport(false);
    }
  }, [appliedFilter, itemsPerPage, selectedAreaFilter, sortBy, sortDirection, totalItems]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: pageBackground },
        dashboardScrollableLayout.contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      {...dashboardScrollableLayout.scrollViewProps}
    >
      <DashboardQuickActions navigation={navigation} isWide={isTabletOrDesktop} />

      <View
        style={[
          styles.tableCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        ]}
      >
        <View style={styles.tableHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Itens de estoque
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              {totalItems} itens no total
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="action-dashboard-generate-report"
            onPress={() => {
              if (loading || refreshing || generatingReport) {
                return;
              }
              void handleGenerateReport();
            }}
            disabled={loading || refreshing || generatingReport}
            onHoverIn={Platform.OS === 'web' ? () => setIsPdfHovered(true) : undefined}
            onHoverOut={Platform.OS === 'web' ? () => setIsPdfHovered(false) : undefined}
            style={({ pressed }) => [
              styles.pdfActionButton,
              Platform.OS === 'web' && styles.sortActionButtonWeb,
              {
                backgroundColor: pressed
                  ? withAlpha(theme.colors.primary, 0.18)
                  : isPdfHovered
                    ? withAlpha(theme.colors.primary, 0.12)
                    : theme.colors.surfaceVariant,
                borderColor:
                  isPdfHovered || pressed
                    ? withAlpha(theme.colors.primary, 0.7)
                    : theme.colors.outline,
                shadowColor: theme.colors.primary,
                shadowOpacity: isPdfHovered ? 0.2 : 0.12,
                shadowRadius: isPdfHovered ? 14 : 10,
                shadowOffset: { width: 0, height: isPdfHovered ? 8 : 4 },
                elevation: isPdfHovered ? 3 : 1,
                opacity: loading || refreshing || generatingReport ? 0.5 : pressed ? 0.96 : 1,
                transform: [{ translateY: isPdfHovered ? -1 : 0 }],
              },
            ]}
          >
            {generatingReport ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name="file-document-outline"
                size={20}
                color={theme.colors.primary}
              />
            )}
            <Text style={[styles.pdfActionLabel, { color: theme.colors.text }]}>Gerar PDF</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.filtersRow,
            !isTabletOrDesktop && styles.filtersRowMobile,
            isAreaFilterOpen && styles.filtersRowOpen,
          ]}
        >
          <AppTextInput
            label="Filtrar por produto, fileira, grade, nível"
            value={filter}
            onChangeText={(value) => {
              setFilter(value);
              setPage(0);
            }}
            style={[styles.filterInput, !isTabletOrDesktop && styles.filterInputMobile]}
            left={<TextInput.Icon icon="magnify" />}
          />

          <FilterSelect
            label="Setor"
            value={selectedAreaValue}
            valueLabel={selectedAreaLabel}
            options={areaOptions}
            open={isAreaFilterOpen}
            onOpenChange={setIsAreaFilterOpen}
            onSelect={(value) => {
              setSelectedAreaFilter(value ? Number(value) : null);
              setPage(0);
            }}
            accessibilityLabel="Selecionar setor para filtrar itens de estoque"
            compact={!isTabletOrDesktop}
            width={isTabletOrDesktop ? 240 : '100%'}
            minWidth={isTabletOrDesktop ? 220 : 0}
            maxWidth={isTabletOrDesktop ? 320 : '100%'}
          />

          <View
            style={[
              styles.sortRow,
              !isTabletOrDesktop && styles.sortRowMobile,
              isTabletOrDesktop && Platform.OS === 'web' && styles.sortRowDesktopWeb,
            ]}
          >
            <Text
              style={[
                styles.sortLabel,
                !isTabletOrDesktop && styles.sortLabelMobile,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              Ordenar:
            </Text>
            {(['produto', 'quantidade', 'status'] as DashboardSortColumn[]).map((col) => {
              const isSelected = sortBy === col;
              const isHovered = hoveredSortColumn === col;
              const label =
                col === 'produto'
                  ? 'Produto'
                  : col === 'quantidade'
                    ? isTabletOrDesktop
                      ? 'Quantidade'
                      : 'Qtd.'
                    : 'Status';

              return (
                <Pressable
                  key={col}
                  accessibilityRole="button"
                  accessibilityLabel={`action-dashboard-sort-${col}`}
                  onPress={() => handleSort(col)}
                  onHoverIn={Platform.OS === 'web' ? () => setHoveredSortColumn(col) : undefined}
                  onHoverOut={
                    Platform.OS === 'web'
                      ? () => setHoveredSortColumn((prev) => (prev === col ? null : prev))
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.sortActionButton,
                    Platform.OS === 'web' && styles.sortActionButtonWeb,
                    {
                      backgroundColor: pressed
                        ? withAlpha(theme.colors.primary, 0.18)
                        : isSelected || isHovered
                          ? withAlpha(theme.colors.primary, 0.12)
                          : theme.colors.surfaceVariant,
                      borderColor:
                        isSelected || isHovered || pressed
                          ? withAlpha(theme.colors.primary, 0.7)
                          : theme.colors.outline,
                      shadowColor: theme.colors.primary,
                      shadowOpacity: isSelected || isHovered ? 0.2 : 0.12,
                      shadowRadius: isSelected || isHovered ? 14 : 10,
                      shadowOffset: { width: 0, height: isSelected || isHovered ? 8 : 4 },
                      elevation: isSelected || isHovered ? 3 : 1,
                      opacity: pressed ? 0.96 : 1,
                      transform: [{ translateY: isSelected || isHovered ? -1 : 0 }],
                    },
                  ]}
                >
                  {isSelected ? (
                    <MaterialCommunityIcons
                      name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color={theme.colors.primary}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.sortActionLabel,
                      {
                        color: isSelected || isHovered ? theme.colors.primary : theme.colors.text,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <AppLoadingState message="Carregando dados reais..." style={styles.loadingBox} />
        ) : (
          <>
            {isTabletOrDesktop && (
              <View style={[styles.listHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <View style={styles.tableColStatus}>
                  <Text style={[styles.listHeaderText, { color: theme.colors.primary }]}>
                    Status
                  </Text>
                </View>
                <View style={styles.tableColProduct}>
                  <Text style={[styles.listHeaderText, { color: theme.colors.primary }]}>
                    Produto
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={[styles.listHeaderText, { color: theme.colors.primary }]}>
                    Setor / Local
                  </Text>
                </View>
                <View style={styles.tableColQty}>
                  <Text
                    style={[styles.listHeaderText, styles.qtyText, { color: theme.colors.primary }]}
                  >
                    Quantidade
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.list}>
              {rows.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`action-dashboard-open-item-details-${row.id}`}
                  onPress={() => {
                    setSelectedRow(row);
                    setIsProductModalVisible(true);
                  }}
                  style={(state: any) => {
                    const pressed = Boolean(state?.pressed);
                    const hovered = Boolean(state?.hovered);
                    const interactive = hovered || pressed;

                    return [
                      styles.stockCard,
                      stockCardVariant === 'compact' ? styles.stockCardCompact : null,
                      Platform.OS === 'web' && styles.sortActionButtonWeb,
                      Platform.OS === 'web' && styles.stockCardInteractiveWeb,
                      {
                        backgroundColor: pressed
                          ? withAlpha(theme.colors.primary, 0.16)
                          : hovered
                            ? withAlpha(theme.colors.primary, 0.1)
                            : theme.colors.surfaceVariant,
                        borderColor: interactive
                          ? withAlpha(theme.colors.primary, 0.72)
                          : theme.colors.outlineVariant,
                        shadowColor: theme.colors.primary,
                        shadowOpacity: interactive ? 0.2 : 0.1,
                        shadowRadius: interactive ? 14 : 8,
                        shadowOffset: { width: 0, height: interactive ? 8 : 4 },
                        elevation: interactive ? 3 : 1,
                        opacity: pressed ? 0.97 : 1,
                        transform: [{ translateY: hovered ? -1 : 0 }],
                      },
                    ];
                  }}
                >
                  <StockItemCard row={row} variant={stockCardVariant} />
                </Pressable>
              ))}

              {rows.length === 0 ? (
                <View style={styles.emptyBox}>
                  {loadErrorMessage ? (
                    <AppEmptyState
                      title={API_STATE_MESSAGES.dashboard.error.title}
                      description={loadErrorMessage}
                      icon="alert-circle-outline"
                      tone="error"
                      onRetry={() => void loadDashboard(page, false)}
                    />
                  ) : (
                    <AppEmptyState
                      title={dashboardEmptyCopy.title}
                      description={dashboardEmptyCopy.description}
                      icon="inbox-outline"
                      tipo={hasDashboardFilters ? 'semResultado' : 'vazio'}
                    />
                  )}
                </View>
              ) : null}
            </View>

            {totalItems > 0 ? (
              <View
                style={[styles.paginationRow, !isTabletOrDesktop && styles.paginationRowMobile]}
              >
                <Text
                  style={[
                    styles.paginationLabel,
                    !isTabletOrDesktop && styles.paginationLabelMobile,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  {rangeStart}-{rangeEnd} de {totalItems}
                </Text>

                <View
                  style={[
                    styles.paginationControls,
                    !isTabletOrDesktop && styles.paginationControlsMobile,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="action-dashboard-page-prev"
                    onPress={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={page === 0}
                    style={(state: any) => {
                      const pressed = Boolean(state?.pressed);
                      const hovered = Boolean(state?.hovered);
                      const disabled = page === 0;
                      const interactive = !disabled && (hovered || pressed);

                      return [
                        styles.paginationActionButton,
                        Platform.OS === 'web' && styles.sortActionButtonWeb,
                        {
                          backgroundColor: disabled
                            ? theme.colors.surfaceVariant
                            : pressed
                              ? withAlpha(theme.colors.primary, 0.18)
                              : hovered
                                ? withAlpha(theme.colors.primary, 0.12)
                                : theme.colors.surfaceVariant,
                          borderColor: interactive
                            ? withAlpha(theme.colors.primary, 0.7)
                            : theme.colors.outline,
                          shadowColor: theme.colors.primary,
                          shadowOpacity: interactive ? 0.2 : 0.12,
                          shadowRadius: interactive ? 14 : 10,
                          shadowOffset: { width: 0, height: interactive ? 8 : 4 },
                          elevation: interactive ? 3 : 1,
                          opacity: disabled ? 0.45 : pressed ? 0.96 : 1,
                          transform: [{ translateY: hovered && !disabled ? -1 : 0 }],
                        },
                      ];
                    }}
                  >
                    <Text
                      style={[
                        styles.paginationActionLabel,
                        {
                          color:
                            page === 0 ? withAlpha(theme.colors.text, 0.65) : theme.colors.text,
                        },
                      ]}
                    >
                      Anterior
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="action-dashboard-page-next"
                    onPress={() =>
                      setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))
                    }
                    disabled={page >= Math.max(totalPages - 1, 0)}
                    style={(state: any) => {
                      const pressed = Boolean(state?.pressed);
                      const hovered = Boolean(state?.hovered);
                      const disabled = page >= Math.max(totalPages - 1, 0);
                      const interactive = !disabled && (hovered || pressed);

                      return [
                        styles.paginationActionButton,
                        Platform.OS === 'web' && styles.sortActionButtonWeb,
                        {
                          backgroundColor: disabled
                            ? theme.colors.surfaceVariant
                            : pressed
                              ? withAlpha(theme.colors.primary, 0.18)
                              : hovered
                                ? withAlpha(theme.colors.primary, 0.12)
                                : theme.colors.surfaceVariant,
                          borderColor: interactive
                            ? withAlpha(theme.colors.primary, 0.7)
                            : theme.colors.outline,
                          shadowColor: theme.colors.primary,
                          shadowOpacity: interactive ? 0.2 : 0.12,
                          shadowRadius: interactive ? 14 : 10,
                          shadowOffset: { width: 0, height: interactive ? 8 : 4 },
                          elevation: interactive ? 3 : 1,
                          opacity: disabled ? 0.45 : pressed ? 0.96 : 1,
                          transform: [{ translateY: hovered && !disabled ? -1 : 0 }],
                        },
                      ];
                    }}
                  >
                    <Text
                      style={[
                        styles.paginationActionLabel,
                        {
                          color:
                            page >= Math.max(totalPages - 1, 0)
                              ? withAlpha(theme.colors.text, 0.65)
                              : theme.colors.text,
                        },
                      ]}
                    >
                      Próximo
                    </Text>
                  </Pressable>

                  <View
                    style={[styles.itemsPerPage, !isTabletOrDesktop && styles.itemsPerPageMobile]}
                  >
                    {[5, 10, 20, 50, 100].map((size) => (
                      <Pressable
                        key={size}
                        accessibilityRole="button"
                        accessibilityLabel={`action-dashboard-page-size-${size}`}
                        onPress={() => {
                          setItemsPerPage(size);
                          setPage(0);
                        }}
                        style={(state: any) => {
                          const pressed = Boolean(state?.pressed);
                          const hovered = Boolean(state?.hovered);
                          const selected = itemsPerPage === size;
                          const interactive = selected || hovered || pressed;

                          return [
                            styles.paginationSizeButton,
                            Platform.OS === 'web' && styles.sortActionButtonWeb,
                            {
                              backgroundColor: pressed
                                ? withAlpha(theme.colors.primary, 0.18)
                                : selected || hovered
                                  ? withAlpha(theme.colors.primary, 0.12)
                                  : theme.colors.surfaceVariant,
                              borderColor: interactive
                                ? withAlpha(theme.colors.primary, 0.7)
                                : theme.colors.outline,
                              shadowColor: theme.colors.primary,
                              shadowOpacity: interactive ? 0.2 : 0.12,
                              shadowRadius: interactive ? 14 : 10,
                              shadowOffset: { width: 0, height: interactive ? 8 : 4 },
                              elevation: interactive ? 3 : 1,
                              opacity: pressed ? 0.96 : 1,
                              transform: [{ translateY: hovered ? -1 : 0 }],
                            },
                          ];
                        }}
                      >
                        <Text
                          style={[
                            styles.paginationSizeLabel,
                            {
                              color:
                                itemsPerPage === size ? theme.colors.primary : theme.colors.text,
                            },
                          ]}
                        >
                          {size}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <ModalFrame
        visible={isProductModalVisible}
        onRequestClose={() => setIsProductModalVisible(false)}
        containerStyle={[
          styles.productModalContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View style={styles.productModalHeader}>
          <Text style={[styles.productModalTitle, { color: theme.colors.primary }]}>
            Detalhes do produto
          </Text>
          <Text style={[styles.productModalName, { color: theme.colors.text }]}>
            {selectedRow?.produto ?? '-'}
          </Text>
        </View>

        <View style={styles.productModalSummaryRow}>
          <View
            style={[
              styles.productModalSummaryChip,
              {
                backgroundColor: withAlpha(theme.colors.primary, 0.12),
                borderColor: withAlpha(theme.colors.primary, 0.4),
              },
            ]}
          >
            <Text style={[styles.productModalSummaryLabel, { color: theme.colors.primary }]}>
              Status
            </Text>
            <Text
              style={[
                styles.productModalSummaryValue,
                { color: selectedRow ? STATUS_COLOR[selectedRow.status] : theme.colors.text },
              ]}
            >
              {selectedRow?.status ?? '-'}
            </Text>
          </View>

          <View
            style={[
              styles.productModalSummaryChip,
              {
                backgroundColor: withAlpha(theme.colors.primary, 0.12),
                borderColor: withAlpha(theme.colors.primary, 0.4),
              },
            ]}
          >
            <Text style={[styles.productModalSummaryLabel, { color: theme.colors.primary }]}>
              Quantidade
            </Text>
            <Text style={[styles.productModalSummaryValue, { color: theme.colors.text }]}>
              {selectedRow?.quantidade ?? 0}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.productModalInfoCard,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.productModalInfoRow}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>
              Código Wester
            </Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.codigoSistemaWester || 'Não informado'}
            </Text>
          </View>

          <View style={styles.productModalInfoRow}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>Cor</Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.cor || 'Não informada'}
            </Text>
          </View>

          <View style={styles.productModalInfoRow}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>
              Localização
            </Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow ? buildLocationLabel(selectedRow) : '-'}
            </Text>
          </View>

          <View style={[styles.productModalInfoRow, styles.productModalDescriptionRow]}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>
              Descrição
            </Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.descricao || 'Não informada'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setIsProductModalVisible(false)}
          style={(state: any) => {
            const pressed = Boolean(state?.pressed);
            const hovered = Boolean(state?.hovered);
            const interactive = hovered || pressed;

            return [
              styles.productModalCloseButton,
              Platform.OS === 'web' && styles.sortActionButtonWeb,
              {
                backgroundColor: pressed
                  ? withAlpha(theme.colors.primary, 0.18)
                  : hovered
                    ? withAlpha(theme.colors.primary, 0.12)
                    : theme.colors.surfaceVariant,
                borderColor: interactive
                  ? withAlpha(theme.colors.primary, 0.7)
                  : theme.colors.outline,
                shadowColor: theme.colors.primary,
                shadowOpacity: interactive ? 0.2 : 0.1,
                shadowRadius: interactive ? 14 : 8,
                shadowOffset: { width: 0, height: interactive ? 8 : 4 },
                elevation: interactive ? 3 : 1,
                opacity: pressed ? 0.97 : 1,
                transform: [{ translateY: hovered ? -1 : 0 }],
              },
            ];
          }}
        >
          <Text style={[styles.productModalCloseButtonLabel, { color: theme.colors.text }]}>
            Fechar
          </Text>
        </Pressable>
      </ModalFrame>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  container: { padding: 24, gap: 20 },
  tableCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  tableHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  sectionSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  pdfActionButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfActionLabel: { fontSize: 16, fontWeight: '800' },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  filtersRowOpen: { zIndex: 2000, elevation: 24 },
  filtersRowMobile: { alignItems: 'stretch' },
  filterInput: { flexGrow: 1, minWidth: 220, borderRadius: 10, overflow: 'hidden' },
  filterInputMobile: { minWidth: 0, width: '100%' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  sortRowDesktopWeb: { marginTop: 20 },
  sortRowMobile: { flexBasis: '100%', maxWidth: '100%' },
  sortLabel: { fontSize: 16, fontWeight: '700' },
  sortLabelMobile: { width: '100%' },
  sortActionButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sortActionButtonWeb:
    Platform.OS === 'web'
      ? ({
          transitionProperty: 'transform, box-shadow, background-color, border-color, opacity',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : ({} as any),
  sortActionLabel: { fontSize: 14, fontWeight: '800' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  listHeaderText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  tableColStatus: { width: 120, minWidth: 120, maxWidth: 120 },
  tableColProduct: { flex: 2, minWidth: 0 },
  tableCol: { flex: 1, minWidth: 0 },
  tableColQty: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  qtyText: { textAlign: 'right' },
  list: { gap: 12, marginTop: 10 },
  stockCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  stockCardCompact: { padding: 12 },
  stockCardInteractiveWeb:
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as any)
      : ({} as any),
  stockDesktopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockCompactContent: {
    gap: 10,
  },
  stockCompactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockCompactProductBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stockCompactTitle: {
    lineHeight: 22,
  },
  stockCompactLocation: {
    marginTop: 0,
  },
  stockCompactQuantityBlock: {
    minWidth: 88,
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  stockCompactQuantityLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stockCompactQuantityValue: {
    fontSize: 22,
    lineHeight: 26,
  },
  stockCompactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  stockCompactCodeChip: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  stockCompactCodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stockCompactCodeValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  stockCompactStatusWrap: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  stockTitle: { fontSize: 16, fontWeight: '800' },
  stockSubtitle: { marginTop: 4, fontSize: 12 },
  stockMeta: { fontSize: 12, fontWeight: '600' },
  stockQty: { fontSize: 18, fontWeight: '800' },
  stockQtyDesktop: { fontSize: 22, fontWeight: '800', textAlign: 'right' },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeLabel: { fontSize: 12, fontWeight: '800' },
  paginationRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paginationRowMobile: { flexDirection: 'column', alignItems: 'flex-start' },
  paginationLabel: { fontSize: 12, fontWeight: '600' },
  paginationLabelMobile: { marginBottom: 2 },
  paginationControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  paginationControlsMobile: { width: '100%' },
  itemsPerPage: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  itemsPerPageMobile: { marginLeft: 0 },
  paginationActionButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paginationActionLabel: { fontSize: 14, fontWeight: '800' },
  paginationSizeButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 42,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationSizeLabel: { fontSize: 14, fontWeight: '800' },
  productModalContainer: {
    width: '92%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productModalHeader: {
    gap: 4,
    marginBottom: 12,
  },
  productModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  productModalName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  productModalSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  productModalSummaryChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  productModalSummaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  productModalSummaryValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  productModalInfoCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  productModalInfoRow: {
    gap: 4,
  },
  productModalDescriptionRow: {
    marginTop: 4,
  },
  productModalInfoLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  productModalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  productModalCloseButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  productModalCloseButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  loadingBox: { marginTop: 8, minHeight: 188 },
  emptyBox: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontWeight: '700' },
});
