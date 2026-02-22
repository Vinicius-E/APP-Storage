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
import { Chip, Text, TextInput } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import DashboardQuickActions from '../components/DashboardQuickActions';
import ModalFrame from '../components/warehouse2d/modals/ModalFrame';
import { API_STATE_MESSAGES, getApiEmptyCopy } from '../constants/apiStateMessages';
import { useAuth } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';
import { API } from '../axios';

type StockRow = {
  id: string;
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

type EstoquePosicao = {
  areaId: number;

  fileiraId: number;
  fileiraIdentificador: string;

  gradeId?: number | null;
  gradeIdentificador?: string | null;

  nivelId?: number | null;
  nivelIdentificador?: string | null;

  itemEstoqueId?: number | null;
  quantidade: number;

  produtoId?: number | null;
  codigoSistemaWester?: string | null;
  nomeModelo?: string | null;
  cor?: string | null;
  descricao?: string | null;

  produto?: {
    id: number;
    codigoSistemaWester: string;
    cor: string;
    descricao: string;
    nomeModelo: string;
  } | null;
};

const STATUS_COLOR: Record<StockRow['status'], string> = {
  Disponível: '#2E7D32',
  Reservado: '#E67E22',
  Baixo: '#C62828',
};

const AREA_ID = 1;

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

  const rgbaMatch = color.match(
    /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i
  );
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
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

function buildStockReportHtml(
  reportRows: StockRow[],
  generatedAt: string,
  summary: { fileiras: number; grades: number; niveis: number; itens: number; vazios: number }
): string {
  const rowsHtml = reportRows
    .map((row, index) => {
      const rowBg = index % 2 === 0 ? '#FBF4EB' : '#FFF9F2';
      return `
        <tr style="background:${rowBg};">
          <td>${escapeHtml(row.produto)}</td>
          <td>${escapeHtml(`Fileira ${row.fileira} / Grade ${row.grade} / Nível ${row.nivel}`)}</td>
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
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof StockRow>('produto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isPdfHovered, setIsPdfHovered] = useState(false);
  const [hoveredSortColumn, setHoveredSortColumn] = useState<keyof StockRow | null>(null);
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

  const isWide = width >= 900;

  const computeStatus = (quantidade: number): StockRow['status'] => {
    if (quantidade <= 10) {
      return 'Baixo';
    }
    return 'Disponível';
  };

  const normalizeProdutoNome = (pos: EstoquePosicao): string => {
    const nome = (pos.produto?.nomeModelo ?? pos.nomeModelo ?? '').toString().trim();
    if (nome !== '') {
      return nome;
    }
    const codigo = (pos.produto?.codigoSistemaWester ?? pos.codigoSistemaWester ?? '')
      .toString()
      .trim();
    if (codigo !== '') {
      return codigo;
    }
    return 'Sem produto';
  };

  const normalizeGradeIdentificador = (pos: EstoquePosicao): string => {
    const grade = (pos.gradeIdentificador ?? '').toString().trim();
    if (grade !== '') {
      return grade;
    }
    return '-';
  };

  const normalizeFileiraIdentificador = (pos: EstoquePosicao): string => {
    const fileira = (pos.fileiraIdentificador ?? '').toString().trim();
    if (fileira !== '') {
      return fileira;
    }
    return '-';
  };

  const normalizeNivelIdentificador = (pos: EstoquePosicao): string => {
    const nivel = (pos.nivelIdentificador ?? '').toString().trim();
    if (nivel !== '') {
      return nivel;
    }
    return '-';
  };

  const loadDashboard = useCallback(async (isRefresh: boolean) => {
    setLoadErrorMessage('');

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await API.get<EstoquePosicao[]>(`/api/estoque/posicoes/area/${AREA_ID}`);

      const data = Array.isArray(res.data) ? res.data : [];

      const fileiraIds = new Set<number>();
      const gradeIds = new Set<number>();
      const nivelKeys = new Set<string>();
      let itens = 0;
      let vazios = 0;

      for (const p of data) {
        if (typeof p.fileiraId === 'number') {
          fileiraIds.add(p.fileiraId);
        }
        if (typeof p.gradeId === 'number') {
          gradeIds.add(p.gradeId);
        }
        const nivelLabel = (p.nivelIdentificador ?? '').toString().trim();
        if (nivelLabel !== '') {
          nivelKeys.add(nivelLabel);
        } else if (typeof p.nivelId === 'number') {
          nivelKeys.add(String(p.nivelId));
        }

        const qtd = typeof p.quantidade === 'number' ? p.quantidade : 0;

        if ((p.itemEstoqueId ?? null) === null && qtd === 0) {
          vazios += 1;
        }

        if (qtd > 0) {
          itens += qtd;
        }
      }

      const grouped = new Map<
        string,
        {
          produto: string;
          quantidade: number;
          fileira: string;
          grade: string;
          nivel: string;
          codigoSistemaWester: string;
          cor: string;
          descricao: string;
        }
      >();

      for (const p of data) {
        const qtd = typeof p.quantidade === 'number' ? p.quantidade : 0;
        const produtoNome = normalizeProdutoNome(p);

        if (produtoNome === 'Sem produto') {
          continue;
        }
        if (qtd <= 0) {
          continue;
        }

        const fileira = normalizeFileiraIdentificador(p);
        const grade = normalizeGradeIdentificador(p);
        const nivel = normalizeNivelIdentificador(p);
        const codigoSistemaWester = firstNonEmpty(
          p.produto?.codigoSistemaWester,
          p.codigoSistemaWester
        );
        const cor = firstNonEmpty(p.produto?.cor, p.cor);
        const descricao = firstNonEmpty(p.produto?.descricao, p.descricao);

        const key = `${produtoNome}__${fileira}__${grade}__${nivel}`;
        const current = grouped.get(key);

        if (!current) {
          grouped.set(key, {
            produto: produtoNome,
            quantidade: qtd,
            fileira,
            grade,
            nivel,
            codigoSistemaWester,
            cor,
            descricao,
          });
        } else {
          grouped.set(key, {
            ...current,
            quantidade: current.quantidade + qtd,
            codigoSistemaWester: firstNonEmpty(current.codigoSistemaWester, codigoSistemaWester),
            cor: firstNonEmpty(current.cor, cor),
            descricao: firstNonEmpty(current.descricao, descricao),
          });
        }
      }

      const mappedRows: StockRow[] = Array.from(grouped.values()).map((g) => {
        return {
          id: `${g.fileira}-${g.grade}-${g.nivel}-${g.produto}`.replace(/\s+/g, '_'),
          produto: g.produto,
          fileira: g.fileira,
          grade: g.grade,
          nivel: g.nivel,
          status: computeStatus(g.quantidade),
          quantidade: g.quantidade,
          codigoSistemaWester: g.codigoSistemaWester,
          cor: g.cor,
          descricao: g.descricao,
        };
      });

      setRows(mappedRows);
      setSummary({
        fileiras: fileiraIds.size,
        grades: gradeIds.size,
        niveis: nivelKeys.size,
        itens,
        vazios,
      });
    } catch (e: any) {
      setRows([]);
      setSummary({ fileiras: 0, grades: 0, niveis: 0, itens: 0, vazios: 0 });
      setLoadErrorMessage(API_STATE_MESSAGES.dashboard.error.description);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    void loadDashboard(true);
  }, [loadDashboard]);


  const filteredRows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((row) => {
      const haystack = [
        row.id,
        row.produto,
        row.fileira,
        row.grade,
        row.nivel,
        row.status,
        String(row.quantidade),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, rows]);
  const hasDashboardFilters = filter.trim() !== '';
  const dashboardEmptyCopy = getApiEmptyCopy('dashboard', hasDashboardFilters);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (aValue === bValue) {
        return 0;
      }
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
    return sorted;
  }, [filteredRows, sortBy, sortDirection]);

  const pagedRows = useMemo(() => {
    const start = page * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [sortedRows, page, itemsPerPage]);

  const totalItems = sortedRows.length;
  const rangeStart = totalItems === 0 ? 0 : page * itemsPerPage + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min((page + 1) * itemsPerPage, totalItems);

  const handleSort = (column: keyof StockRow) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const handleGenerateReport = useCallback(async () => {
    if (rows.length === 0) {
      Alert.alert('Gerar relatório', 'Não há itens de estoque para exportar no momento.');
      return;
    }

    setGeneratingReport(true);
    try {
      const generatedAt = new Date().toLocaleString('pt-BR');
      const orderedRows = [...rows].sort((a, b) => {
        return a.produto.localeCompare(b.produto, 'pt-BR');
      });

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
          `Fileiras: ${summary.fileiras}  |  Grades: ${summary.grades}  |  ` +
          `Níveis: ${summary.niveis}  |  Itens: ${summary.itens}  |  Vazios: ${summary.vazios}`;
        doc.text(
          summaryLine,
          40,
          84
        );

        const tableRows = orderedRows.map((row) => [
          row.produto,
          `Fileira ${row.fileira} / Grade ${row.grade} / Nível ${row.nivel}`,
          row.status,
          String(row.quantidade),
        ]);

        const pageWidth = doc.internal.pageSize.getWidth();
        const tableMarginX = 32;
        const usableTableWidth = pageWidth - tableMarginX * 2;
        const productColWidth = Math.floor(usableTableWidth * 0.28);
        const locationColWidth = Math.floor(usableTableWidth * 0.44);
        const statusColWidth = Math.floor(usableTableWidth * 0.14);
        const qtyColWidth =
          usableTableWidth - productColWidth - locationColWidth - statusColWidth;

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
          doc.text(`Pagina ${page}/${pageCount}`, footerPageWidth - 40, pageHeight - 18, {
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

      const html = buildStockReportHtml(orderedRows, generatedAt, summary);
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
  }, [rows, summary]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <DashboardQuickActions navigation={navigation} isWide={isWide} user={user} />

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
            onHoverIn={
              Platform.OS === 'web' ? () => setIsPdfHovered(true) : undefined
            }
            onHoverOut={
              Platform.OS === 'web' ? () => setIsPdfHovered(false) : undefined
            }
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
            <Text style={[styles.pdfActionLabel, { color: theme.colors.text }]}>
              Gerar PDF
            </Text>
          </Pressable>
        </View>

        <View style={[styles.filtersRow, !isWide && styles.filtersRowMobile]}>
          <AppTextInput
            label="Filtrar por produto, fileira, grade, nível"
            value={filter}
            onChangeText={(value) => {
              setFilter(value);
              setPage(0);
            }}
            style={[styles.filterInput, !isWide && styles.filterInputMobile]}
            left={<TextInput.Icon icon="magnify" />}
          />

          <View style={[styles.sortRow, !isWide && styles.sortRowMobile]}>
            <Text
              style={[
                styles.sortLabel,
                !isWide && styles.sortLabelMobile,
                { color: (theme.colors as any).textSecondary ?? theme.colors.text },
              ]}
            >
              Ordenar:
            </Text>
            {(['produto', 'quantidade', 'status'] as Array<keyof StockRow>).map((col) => {
              const isSelected = sortBy === col;
              const isHovered = hoveredSortColumn === col;
              const label =
                col === 'produto'
                  ? 'Produto'
                  : col === 'quantidade'
                    ? isWide
                      ? 'Quantidade'
                      : 'Qtd.'
                    : 'Status';

              return (
                <Pressable
                  key={col}
                  accessibilityRole="button"
                  accessibilityLabel={`action-dashboard-sort-${col}`}
                  onPress={() => handleSort(col)}
                  onHoverIn={
                    Platform.OS === 'web' ? () => setHoveredSortColumn(col) : undefined
                  }
                  onHoverOut={
                    Platform.OS === 'web'
                      ? () =>
                          setHoveredSortColumn((prev) => (prev === col ? null : prev))
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
                        color:
                          isSelected || isHovered
                            ? theme.colors.primary
                            : theme.colors.text,
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
            {isWide && (
              <View style={[styles.listHeader, { borderBottomColor: theme.colors.outlineVariant }]}>
                <View style={styles.tableColProduct}>
                  <Text
                    style={[
                      styles.listHeaderText,
                      { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                    ]}
                  >
                    Produto
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text
                    style={[
                      styles.listHeaderText,
                      { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                    ]}
                  >
                    Local
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text
                    style={[
                      styles.listHeaderText,
                      { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                    ]}
                  >
                    Status
                  </Text>
                </View>
                <View style={styles.tableColQty}>
                  <Text
                    style={[
                      styles.listHeaderText,
                      styles.qtyText,
                      { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                    ]}
                  >
                    Quantidade
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.list}>
              {pagedRows.map((row) => (
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
                  {isWide ? (
                    <View style={styles.stockDesktopRow}>
                      <View style={styles.tableColProduct}>
                        <Text style={[styles.stockTitle, { color: theme.colors.text }]}>
                          {row.produto}
                        </Text>
                      </View>

                      <View style={styles.tableCol}>
                        <Text
                          style={[
                            styles.stockMeta,
                            { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                          ]}
                        >
                          Fileira {row.fileira} / Grade {row.grade} / Nível {row.nivel}
                        </Text>
                      </View>

                      <View style={styles.tableCol}>
                        <Text style={[styles.stockMeta, { color: STATUS_COLOR[row.status] }]}>
                          {row.status}
                        </Text>
                      </View>

                      <View style={styles.tableColQty}>
                        <Text style={[styles.stockQtyDesktop, { color: theme.colors.text }]}>
                          {row.quantidade}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.stockTopRow}>
                        <View style={styles.stockProductMobile}>
                          <Text style={[styles.stockTitle, { color: theme.colors.text }]}>
                            {row.produto}
                          </Text>
                          <Text
                            style={[
                              styles.stockSubtitle,
                              { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                            ]}
                          >
                            Fileira {row.fileira} / Grade {row.grade} / Nível {row.nivel}
                          </Text>
                        </View>
                        <Text style={[styles.stockQty, { color: theme.colors.text }]}>
                          {row.quantidade}
                        </Text>
                      </View>

                      <View style={styles.stockMetaRow}>
                        <Chip
                          compact
                          style={[
                            styles.statusChip,
                            { backgroundColor: `${STATUS_COLOR[row.status]}22` },
                          ]}
                          textStyle={{ color: STATUS_COLOR[row.status] }}
                        >
                          {row.status}
                        </Chip>
                      </View>
                    </>
                  )}
                </Pressable>
              ))}

              {pagedRows.length === 0 ? (
                <View style={styles.emptyBox}>
                  {loadErrorMessage ? (
                    <AppEmptyState
                      title={API_STATE_MESSAGES.dashboard.error.title}
                      description={loadErrorMessage}
                      icon="alert-circle-outline"
                      tone="error"
                    />
                  ) : (
                    <AppEmptyState
                      title={dashboardEmptyCopy.title}
                      description={dashboardEmptyCopy.description}
                      icon="inbox-outline"
                    />
                  )}
                </View>
              ) : null}
            </View>

            {totalItems > 0 ? (
              <View style={[styles.paginationRow, !isWide && styles.paginationRowMobile]}>
                <Text
                  style={[
                    styles.paginationLabel,
                    !isWide && styles.paginationLabelMobile,
                    { color: (theme.colors as any).textSecondary ?? theme.colors.text },
                  ]}
                >
                  {rangeStart}-{rangeEnd} de {totalItems}
                </Text>

                <View style={[styles.paginationControls, !isWide && styles.paginationControlsMobile]}>
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
                        { color: page === 0 ? withAlpha(theme.colors.text, 0.65) : theme.colors.text },
                      ]}
                    >
                      Anterior
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="action-dashboard-page-next"
                    onPress={() =>
                      setPage((prev) => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage) - 1))
                    }
                    disabled={rangeEnd >= totalItems}
                    style={(state: any) => {
                      const pressed = Boolean(state?.pressed);
                      const hovered = Boolean(state?.hovered);
                      const disabled = rangeEnd >= totalItems;
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
                            rangeEnd >= totalItems
                              ? withAlpha(theme.colors.text, 0.65)
                              : theme.colors.text,
                        },
                      ]}
                    >
                      Próximo
                    </Text>
                  </Pressable>

                  <View style={[styles.itemsPerPage, !isWide && styles.itemsPerPageMobile]}>
                    {[5, 8, 10].map((size) => (
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
          <Text style={[styles.productModalTitle, { color: theme.colors.primary }]}>Detalhes do produto</Text>
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
            <Text style={[styles.productModalSummaryLabel, { color: theme.colors.primary }]}>Status</Text>
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
            <Text style={[styles.productModalSummaryLabel, { color: theme.colors.primary }]}>Quantidade</Text>
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
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>Codigo Wester</Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.codigoSistemaWester || 'Nao informado'}
            </Text>
          </View>

          <View style={styles.productModalInfoRow}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>Cor</Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.cor || 'Nao informada'}
            </Text>
          </View>

          <View style={styles.productModalInfoRow}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>Localizacao</Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              Fileira {selectedRow?.fileira ?? '-'} / Grade {selectedRow?.grade ?? '-'} / Nivel{' '}
              {selectedRow?.nivel ?? '-'}
            </Text>
          </View>

          <View style={[styles.productModalInfoRow, styles.productModalDescriptionRow]}>
            <Text style={[styles.productModalInfoLabel, { color: theme.colors.primary }]}>Descricao</Text>
            <Text style={[styles.productModalInfoValue, { color: theme.colors.text }]}>
              {selectedRow?.descricao || 'Nao informada'}
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
          <Text style={[styles.productModalCloseButtonLabel, { color: theme.colors.text }]}>Fechar</Text>
        </Pressable>
      </ModalFrame>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20 },
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
  },
  filtersRowMobile: { alignItems: 'stretch' },
  filterInput: { flexGrow: 1, minWidth: 220, borderRadius: 10, overflow: 'hidden' },
  filterInputMobile: { minWidth: 0, width: '100%' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  sortRowMobile: { flexBasis: '100%', maxWidth: '100%' },
  sortLabel: { fontSize: 12, fontWeight: '700' },
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
          transitionProperty:
            'transform, box-shadow, background-color, border-color, opacity',
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
  tableColProduct: { flex: 2, minWidth: 0 },
  tableCol: { flex: 1, minWidth: 0 },
  tableColQty: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  qtyText: { textAlign: 'right' },
  list: { gap: 12, marginTop: 10 },
  stockCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  stockCardInteractiveWeb:
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as any)
      : ({} as any),
  stockDesktopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockProductMobile: { flex: 1, minWidth: 0 },
  stockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
    gap: 10,
  },
  stockTitle: { fontSize: 16, fontWeight: '800' },
  stockSubtitle: { marginTop: 4, fontSize: 12 },
  stockMeta: { fontSize: 12, fontWeight: '600' },
  stockQty: { fontSize: 18, fontWeight: '800' },
  stockQtyDesktop: { fontSize: 22, fontWeight: '800', textAlign: 'right' },
  statusChip: { borderRadius: 999 },
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







