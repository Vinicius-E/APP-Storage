import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Chip,
  Modal,
  Portal,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import {
  HistoricoMovimentacaoFilterRequestDTO,
  HistoricoMovimentacaoResponseDTO,
  buscarHistoricoPorId,
  filtrarHistorico,
  listarHistorico,
} from '../services/historicoApi';
import { useThemeContext } from '../theme/ThemeContext';

type QuickType =
  | ''
  | 'ENTRADA'
  | 'SAIDA'
  | 'MOVIMENTACAO'
  | 'AJUSTE_QUANTIDADE'
  | 'RESEQUENCIAMENTO';
type OperationTone = {
  bg: string;
  border: string;
  text: string;
  softText: string;
};
type QuantityInfo = {
  anterior: number;
  nova: number;
  delta: number;
};

const PAGE_SIZE = 20;
const QUICK_FILTERS: Array<{ label: string; value: QuickType }> = [
  { label: 'Todos', value: '' },
  { label: 'ENTRADA', value: 'ENTRADA' },
  { label: 'SAÍDA', value: 'SAIDA' },
  { label: 'MOVIMENTAÇÃO', value: 'MOVIMENTACAO' },
  { label: 'AJUSTE', value: 'AJUSTE_QUANTIDADE' },
  { label: 'REPOS.', value: 'RESEQUENCIAMENTO' },
];

function hasActiveFilters(filter: HistoricoMovimentacaoFilterRequestDTO): boolean {
  return Boolean(
    (filter.textoLivre && filter.textoLivre.trim()) ||
    (filter.tipoOperacao && filter.tipoOperacao.trim()) ||
    (filter.dataInicio && filter.dataInicio.trim()) ||
    (filter.dataFim && filter.dataFim.trim()) ||
    filter.usuarioId ||
    filter.produtoId ||
    filter.nivelId
  );
}

function fmtDate(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '—';
  }
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    return timestamp;
  }
  return d.toLocaleString('pt-BR');
}

function opLabel(tipoOperacao: string | null | undefined): string {
  const key = (tipoOperacao ?? '').toUpperCase();
  if (key === 'ENTRADA') return 'Entrada de estoque';
  if (key === 'SAIDA') return 'Saída de estoque';
  if (key === 'MOVIMENTACAO') return 'Movimentação interna';
  if (key === 'AJUSTE_QUANTIDADE') return 'Ajuste de quantidade';
  if (key === 'RESEQUENCIAMENTO') return 'Reposicionamento automático';
  return key || 'Operação';
}

function normalizeOperation(tipoOperacao: string | null | undefined): string {
  return (tipoOperacao ?? '').toUpperCase();
}

function operationTone(tipoOperacao: string | null | undefined): OperationTone {
  const key = normalizeOperation(tipoOperacao);

  if (key === 'ENTRADA') {
    return {
      bg: '#E7F7ED',
      border: '#BFE6CE',
      text: '#1F7A3A',
      softText: '#2B8A46',
    };
  }

  if (key === 'SAIDA') {
    return {
      bg: '#FDECEC',
      border: '#F5C3C1',
      text: '#B3261E',
      softText: '#9F2018',
    };
  }

  if (key === 'MOVIMENTACAO') {
    return {
      bg: '#EAF1FF',
      border: '#CAD9FF',
      text: '#2751A3',
      softText: '#22488F',
    };
  }

  if (key === 'AJUSTE_QUANTIDADE') {
    return {
      bg: '#FFF3E2',
      border: '#F1D5AC',
      text: '#9A5A00',
      softText: '#835000',
    };
  }

  if (key === 'RESEQUENCIAMENTO') {
    return {
      bg: '#FFF6DF',
      border: '#ECD29E',
      text: '#9C5B17',
      softText: '#855015',
    };
  }

  return {
    bg: '#F1E6D8',
    border: '#DCC4A8',
    text: '#6E4420',
    softText: '#6E4420',
  };
}

function opAbbr(tipoOperacao: string | null | undefined): string {
  const key = (tipoOperacao ?? '').toUpperCase();
  if (key === 'ENTRADA') return 'EN';
  if (key === 'SAIDA') return 'SA';
  if (key === 'MOVIMENTACAO') return 'MV';
  if (key === 'AJUSTE_QUANTIDADE') return 'AJ';
  if (key === 'RESEQUENCIAMENTO') return 'RS';
  return 'OP';
}

function getQuantityInfo(item: HistoricoMovimentacaoResponseDTO): QuantityInfo {
  const anterior = Number(item.quantidadeAnterior ?? 0);
  const nova = Number(item.quantidadeNova ?? 0);
  return { anterior, nova, delta: nova - anterior };
}

function quantityFlowLabel(item: HistoricoMovimentacaoResponseDTO): string {
  const { anterior, nova } = getQuantityInfo(item);
  return `${anterior} → ${nova} un.`;
}

function qtyDetail(item: HistoricoMovimentacaoResponseDTO): string {
  const { delta } = getQuantityInfo(item);
  const op = normalizeOperation(item.tipoOperacao);
  const origem = item.nivelOrigemIdentificador ?? '';
  const destino = item.nivelDestinoIdentificador ?? '';

  if (op === 'MOVIMENTACAO') {
    if (origem && destino) {
      return `Realocado de ${origem} para ${destino}.`;
    }
    return 'Realocado internamente.';
  }

  if (op === 'RESEQUENCIAMENTO') {
    if (origem && destino) {
      return `Realocado automaticamente: ${origem} → ${destino}.`;
    }
    return 'Reposicionamento automático concluído.';
  }

  if (op === 'ENTRADA') {
    return delta > 0 ? `Adicionado ${delta} un.` : 'Entrada registrada.';
  }

  if (op === 'SAIDA') {
    return delta < 0 ? `Removido ${Math.abs(delta)} un.` : 'Saída registrada.';
  }

  if (op === 'AJUSTE_QUANTIDADE') {
    if (delta > 0) {
      return `Ajuste positivo: +${delta} un.`;
    }
    if (delta < 0) {
      return `Ajuste negativo: -${Math.abs(delta)} un.`;
    }
    return 'Ajuste sem mudança líquida.';
  }

  if (delta > 0) {
    return `Adicionado ${delta} un.`;
  }
  if (delta < 0) {
    return `Removido ${Math.abs(delta)} un.`;
  }
  return 'Sem alteração líquida.';
}

function locationLabel(item: HistoricoMovimentacaoResponseDTO): string {
  const nivel = item.nivelIdentificador ?? '';
  const origem = item.nivelOrigemIdentificador ?? '';
  const destino = item.nivelDestinoIdentificador ?? '';
  if (origem && destino) return `${origem} → ${destino}`;
  if (nivel) return `Nível ${nivel}`;
  if (origem) return `Origem ${origem}`;
  if (destino) return `Destino ${destino}`;
  return 'Nível não informado';
}

export default function HistoryScreen() {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 820;
  const frameWidth = Math.min(Math.max(width - 24, 280), 1420);
  const colors = theme.colors as typeof theme.colors & { textSecondary?: string };
  const textSecondary = colors.textSecondary ?? theme.colors.onSurfaceVariant;

  const [search, setSearch] = useState('');
  const [operationFilter, setOperationFilter] = useState<QuickType>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [items, setItems] = useState<HistoricoMovimentacaoResponseDTO[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<HistoricoMovimentacaoResponseDTO | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const filterDto = useMemo<HistoricoMovimentacaoFilterRequestDTO>(() => {
    const dto: HistoricoMovimentacaoFilterRequestDTO = {};
    if (search.trim()) dto.textoLivre = search.trim();
    if (operationFilter) dto.tipoOperacao = operationFilter;
    if (dataInicio.trim()) dto.dataInicio = dataInicio.trim();
    if (dataFim.trim()) dto.dataFim = dataFim.trim();
    return dto;
  }, [dataFim, dataInicio, operationFilter, search]);

  const fetchPage = useCallback(
    async (
      targetPage: number,
      append: boolean,
      trigger: 'initial' | 'refresh' | 'more' = 'initial'
    ) => {
      if (trigger === 'initial') setLoading(true);
      if (trigger === 'refresh') setRefreshing(true);
      if (trigger === 'more') setLoadingMore(true);

      try {
        const response = hasActiveFilters(filterDto)
          ? await filtrarHistorico(filterDto, targetPage, PAGE_SIZE)
          : await listarHistorico(targetPage, PAGE_SIZE);

        const content = Array.isArray(response.content) ? response.content : [];
        setItems((prev) => (append ? [...prev, ...content] : content));
        setPage(response.number ?? targetPage);
        setHasMore(Boolean(!response.last));
      } catch (error: any) {
        const fallback = 'Não foi possível carregar o histórico.';
        const backendMessage =
          typeof error?.response?.data === 'string'
            ? error.response.data
            : (error?.response?.data?.message ?? '');
        setSnackbarMessage(backendMessage || fallback);
        if (!append) {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filterDto]
  );

  const loadFirstPage = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await fetchPage(0, false, 'initial');
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage])
  );

  const clearFilters = useCallback(async () => {
    setSearch('');
    setOperationFilter('');
    setDataInicio('');
    setDataFim('');
    await loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchPage(page + 1, true, 'more');
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  const openDetails = useCallback(async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await buscarHistoricoPorId(id);
      setSelected(detail);
    } catch (error: any) {
      const fallback = 'Não foi possível carregar os detalhes.';
      const backendMessage =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : (error?.response?.data?.message ?? '');
      setSnackbarMessage(backendMessage || fallback);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const renderItem = ({ item }: { item: HistoricoMovimentacaoResponseDTO }) => {
    const tone = operationTone(item.tipoOperacao);
    const flowLabel = quantityFlowLabel(item);
    const detailLabel = qtyDetail(item);

    return (
      <View style={[styles.frame, { width: frameWidth }]}>
        <Surface
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={styles.top}>
            <View style={styles.leftArea}>
              <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                <Text style={[styles.badgeText, { color: tone.text }]}>
                  {opAbbr(item.tipoOperacao)}
                </Text>
              </View>
              <View style={styles.meta}>
                <Text style={[styles.date, { color: textSecondary }]}>
                  {fmtDate(item.timestamp)}
                </Text>
                <Text style={[styles.name, { color: theme.colors.text }]}>
                  {item.produtoNomeModelo ?? 'Produto não informado'}
                </Text>
                <Text style={[styles.info, { color: textSecondary }]}>
                  Usuário: {item.usuarioNome ?? item.usuarioLogin ?? 'Não identificado'}
                </Text>
                <Text style={[styles.info, { color: textSecondary }]}>{locationLabel(item)}</Text>
              </View>
            </View>

            <View style={styles.rightPanel}>
              <View
                style={[
                  styles.operationTag,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.operationTagText, { color: tone.text }]}>
                  {opLabel(item.tipoOperacao)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
            <View style={[styles.metricBox, { borderColor: theme.colors.outlineVariant }]}>
              <Text style={[styles.metricLabel, { color: textSecondary }]}>Quantidade</Text>
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{flowLabel}</Text>
            </View>
            <View
              style={[
                styles.metricBox,
                styles.metricHighlight,
                { backgroundColor: tone.bg, borderColor: tone.border },
              ]}
            >
              <Text style={[styles.metricHint, { color: tone.text }]}>{detailLabel}</Text>
            </View>
            <Button
              mode="outlined"
              icon="text-box-search-outline"
              onPress={() => void openDetails(item.id)}
              contentStyle={styles.detailsButtonContent}
              style={[styles.detailsButton, isCompact && styles.detailsButtonCompact]}
            >
              Ver detalhes
            </Button>
          </View>
        </Surface>
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        onEndReachedThreshold={0.3}
        onEndReached={() => void loadMore()}
        ListHeaderComponent={
          <View style={[styles.frame, { width: frameWidth, gap: 12 }]}>
            <Surface
              style={[
                styles.section,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Histórico de Movimentação
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Auditoria completa de entrada, saída, movimentação e ajustes.
              </Text>
            </Surface>

            <Surface
              style={[
                styles.section,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <AppTextInput
                label="Buscar no histórico"
                value={search}
                onChangeText={setSearch}
                left={<TextInput.Icon icon="magnify" />}
                style={styles.input}
              />

              <View style={styles.chipsRow}>
                {QUICK_FILTERS.map((opt) => (
                  <Chip
                    key={opt.value || 'todos'}
                    selected={operationFilter === opt.value}
                    onPress={() => setOperationFilter(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </View>

              <View style={[styles.dateRow, isCompact && styles.dateRowCompact]}>
                <AppTextInput
                  label="Data início (YYYY-MM-DD)"
                  value={dataInicio}
                  onChangeText={setDataInicio}
                  style={[styles.dateInput, isCompact && styles.dateInputCompact]}
                />
                <AppTextInput
                  label="Data fim (YYYY-MM-DD)"
                  value={dataFim}
                  onChangeText={setDataFim}
                  style={[styles.dateInput, isCompact && styles.dateInputCompact]}
                />
              </View>

              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => void clearFilters()}>
                  Limpar
                </Button>
                <Button mode="contained" onPress={() => void loadFirstPage()}>
                  Aplicar filtros
                </Button>
              </View>
            </Surface>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.frame, { width: frameWidth }]}>
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <AppLoadingState message="Carregando histórico..." style={styles.loadingCard} />
              </Surface>
            </View>
          ) : (
            <View style={[styles.frame, { width: frameWidth }]}>
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <Text style={[styles.name, { color: theme.colors.text }]}>Sem registros</Text>
                <Text style={[styles.info, { color: textSecondary }]}>
                  Ajuste os filtros ou realize novas movimentações.
                </Text>
              </Surface>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loadingMore ? (
              <AppLoadingState
                message="Carregando mais..."
                variant="inline"
                style={styles.inlineLoading}
              />
            ) : null}
            {!loading && !loadingMore && items.length > 0 && !hasMore ? (
              <Text style={[styles.info, { color: textSecondary }]}>Fim do histórico</Text>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchPage(0, false, 'refresh')}
          />
        }
      />

      <Portal>
        <Modal
          visible={selected !== null || detailLoading}
          onDismiss={() => {
            setSelected(null);
            setDetailLoading(false);
          }}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
        >
          {detailLoading ? (
            <AppLoadingState message="Carregando detalhes..." style={styles.loadingCard} />
          ) : (
            <>
              <View style={[styles.modalHeader, isCompact && styles.modalHeaderCompact]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Detalhes da movimentação
                </Text>
                {selected ? (
                  <View
                    style={[
                      styles.operationTag,
                      styles.modalOperationTag,
                      {
                        backgroundColor: operationTone(selected.tipoOperacao).bg,
                        borderColor: operationTone(selected.tipoOperacao).border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.operationTagText,
                        { color: operationTone(selected.tipoOperacao).text },
                      ]}
                    >
                      {opLabel(selected.tipoOperacao)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.date, { color: textSecondary }]}>
                Registrado em {fmtDate(selected?.timestamp)}
              </Text>
              {selected ? (
                <View
                  style={[
                    styles.summaryBox,
                    {
                      backgroundColor: operationTone(selected.tipoOperacao).bg,
                      borderColor: operationTone(selected.tipoOperacao).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryTitle,
                      { color: operationTone(selected.tipoOperacao).text },
                    ]}
                  >
                    {qtyDetail(selected)}
                  </Text>
                  <Text
                    style={[
                      styles.summarySub,
                      { color: operationTone(selected.tipoOperacao).softText },
                    ]}
                  >
                    Quantidade: {quantityFlowLabel(selected)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.detailGrid, isCompact && styles.detailGridCompact]}>
                <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>Produto</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selected?.produtoNomeModelo ?? 'Não informado'}
                  </Text>
                </View>
                <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>Usuário</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selected?.usuarioNome ?? selected?.usuarioLogin ?? 'Não identificado'}
                  </Text>
                </View>
                <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>Localização</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selected ? locationLabel(selected) : 'Nível não informado'}
                  </Text>
                </View>
                <View style={[styles.detailCard, { borderColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>Quantidade</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selected ? quantityFlowLabel(selected) : '—'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Detalhes técnicos</Text>
              <View style={[styles.detailTextBox, { borderColor: theme.colors.outlineVariant }]}>
                <Text style={[styles.details, { color: textSecondary }]}>
                  {selected?.detalhesAlteracao?.trim()
                    ? selected.detalhesAlteracao.trim()
                    : 'Sem detalhes adicionais.'}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button mode="contained" onPress={() => setSelected(null)}>
                  Fechar
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage('')}
        duration={3200}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  frame: { alignSelf: 'center' },
  section: { borderRadius: 16, borderWidth: 1, padding: 14 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  input: { marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateRowCompact: { flexDirection: 'column', gap: 0 },
  dateInput: { flex: 1 },
  dateInputCompact: { width: '100%' },
  actions: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' },
  leftArea: { flexDirection: 'row', gap: 10, flex: 1, display: 'flex', alignItems: 'center' },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '800' },
  meta: { flex: 1, gap: 3 },
  rightPanel: { alignItems: 'flex-end', justifyContent: 'center', gap: 10, flexShrink: 0 },
  operationTag: {
    borderWidth: 1,
    borderRadius: 14,
    height: 38,
    paddingHorizontal: 14,
    paddingVertical: 0,
    alignSelf: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationTagText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  date: { fontSize: 12, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '800' },
  info: { fontSize: 13, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricsRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  metricBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  metricHighlight: { minWidth: 220, flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '800' },
  metricHint: { fontSize: 14, fontWeight: '800' },
  detailsButton: { alignSelf: 'stretch', justifyContent: 'center' },
  detailsButtonCompact: { width: '100%' },
  detailsButtonContent: { height: 38 },
  empty: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  loadingCard: { minHeight: 132 },
  footer: { paddingVertical: 8, alignItems: 'center', gap: 6 },
  inlineLoading: { minHeight: 32 },
  modal: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalHeaderCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  modalOperationTag: { alignSelf: 'flex-start' },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800' },
  summarySub: { fontSize: 13, fontWeight: '700' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailGridCompact: { flexDirection: 'column' },
  detailCard: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 17, fontWeight: '800' },
  detailTextBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  details: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
});
