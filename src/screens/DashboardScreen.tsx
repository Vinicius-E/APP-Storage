// DashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import DashboardQuickActions from '../components/DashboardQuickActions';
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

        const key = `${produtoNome}__${fileira}__${grade}__${nivel}`;
        const current = grouped.get(key);

        if (!current) {
          grouped.set(key, {
            produto: produtoNome,
            quantidade: qtd,
            fileira,
            grade,
            nivel,
          });
        } else {
          grouped.set(key, {
            ...current,
            quantidade: current.quantidade + qtd,
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

          <Button
            mode="contained"
            icon="file-document-outline"
            onPress={() => void handleGenerateReport()}
            accessibilityLabel="action-dashboard-generate-report"
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            textColor={theme.colors.onPrimary}
            loading={generatingReport}
            disabled={loading || refreshing || generatingReport}
          >
            Gerar PDF
          </Button>
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
            {(['produto', 'quantidade', 'status'] as Array<keyof StockRow>).map((col) => (
              <Chip
                key={col}
                onPress={() => handleSort(col)}
                selected={sortBy === col}
                selectedColor={theme.colors.onPrimary}
                accessibilityLabel={`action-dashboard-sort-${col}`}
                icon={
                  sortBy === col ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : undefined
                }
                style={[
                  styles.sortChip,
                  {
                    backgroundColor:
                      sortBy === col ? theme.colors.primary : theme.colors.surfaceVariant,
                  },
                ]}
                textStyle={{
                  color: sortBy === col ? theme.colors.onPrimary : theme.colors.text,
                  fontWeight: '600',
                }}
              >
                {col === 'produto'
                  ? 'Produto'
                  : col === 'quantidade'
                    ? isWide
                      ? 'Quantidade'
                      : 'Qtd.'
                    : 'Status'}
              </Chip>
            ))}
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
                <View
                  key={row.id}
                  style={[
                    styles.stockCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
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
                </View>
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
                  <Button
                    mode="outlined"
                    onPress={() => setPage((prev) => Math.max(0, prev - 1))}
                    disabled={page === 0}
                    accessibilityLabel="action-dashboard-page-prev"
                    compact
                  >
                    Anterior
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() =>
                      setPage((prev) => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage) - 1))
                    }
                    disabled={rangeEnd >= totalItems}
                    accessibilityLabel="action-dashboard-page-next"
                    compact
                  >
                    Próximo
                  </Button>

                  <View style={[styles.itemsPerPage, !isWide && styles.itemsPerPageMobile]}>
                    {[5, 8, 10].map((size) => (
                      <Chip
                        key={size}
                        compact
                        onPress={() => {
                          setItemsPerPage(size);
                          setPage(0);
                        }}
                        accessibilityLabel={`action-dashboard-page-size-${size}`}
                        style={[
                          styles.pageChip,
                          {
                            backgroundColor:
                              itemsPerPage === size
                                ? theme.colors.primary
                                : theme.colors.surfaceVariant,
                          },
                        ]}
                        textStyle={{
                          color: itemsPerPage === size ? theme.colors.onPrimary : theme.colors.text,
                        }}
                      >
                        {size}
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
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
  primaryButton: { borderRadius: 10, height: 40, justifyContent: 'center' },
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
  sortChip: { borderRadius: 999 },
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
  pageChip: { borderRadius: 999 },
  loadingBox: { marginTop: 8, minHeight: 188 },
  emptyBox: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontWeight: '700' },
});




