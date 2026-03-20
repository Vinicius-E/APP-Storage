import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import AppEmptyState from '../../components/AppEmptyState';
import AppLoadingState from '../../components/AppLoadingState';
import AppTextInput from '../../components/AppTextInput';
import FilterSelect from '../../components/FilterSelect';
import ListActionButton from '../../components/ListActionButton';
import StatusBadge from '../../components/StatusBadge';
import { listAreas } from '../../services/areaApi';
import { fetchStockAlerts } from '../../services/stockAlertApi';
import listScreenStyles from '../../styles/listScreen';
import { useAppScreenScrollableLayout } from '../../hooks/useAppScreenScrollableLayout';
import { useThemeContext } from '../../theme/ThemeContext';
import { AreaDTO } from '../../types/Area';
import {
  StockAlertFilterDTO,
  StockAlertItemDTO,
  StockAlertResponseDTO,
  StockAlertSeverity,
  StockAlertType,
} from '../../types/StockAlert';

type StockAlertsScreenProps = {
  navigation: any;
};

type FilterDraftState = {
  textoLivre: string;
  tipoAlerta: StockAlertType | '';
  criticidade: StockAlertSeverity | '';
  areaId: string;
  produtoStatus: 'TODOS' | 'ATIVOS' | 'INATIVOS';
  diasSemMovimentacao: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type OpenFilterKey = 'tipo' | 'criticidade' | 'area' | 'status' | 'tamanho' | null;

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos os alertas' },
  { value: 'SEM_ESTOQUE', label: 'Sem estoque' },
  { value: 'ABAIXO_MINIMO', label: 'Abaixo do minimo' },
  { value: 'ACIMA_MAXIMO', label: 'Acima do maximo' },
  { value: 'SEM_MOVIMENTACAO', label: 'Sem movimentacao' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todas as criticidades' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAIXA', label: 'Baixa' },
];

const PRODUCT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'TODOS', label: 'Todos os produtos' },
  { value: 'ATIVOS', label: 'Produtos ativos' },
  { value: 'INATIVOS', label: 'Produtos inativos' },
];

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 / pagina' },
  { value: '20', label: '20 / pagina' },
  { value: '50', label: '50 / pagina' },
];

const EMPTY_FILTERS: FilterDraftState = {
  textoLivre: '',
  tipoAlerta: '',
  criticidade: '',
  areaId: '',
  produtoStatus: 'TODOS',
  diasSemMovimentacao: '60',
};

function getSeverityColors(severity: StockAlertSeverity) {
  if (severity === 'ALTA') {
    return {
      backgroundColor: '#FDECEC',
      borderColor: '#F4B8B5',
      textColor: '#B3261E',
    };
  }

  if (severity === 'MEDIA') {
    return {
      backgroundColor: '#FFF6E4',
      borderColor: '#F0D2A6',
      textColor: '#9A5A00',
    };
  }

  return {
    backgroundColor: '#EEF5EA',
    borderColor: '#C8DDC0',
    textColor: '#2E7D32',
  };
}

function getAlertTypeLabel(type: StockAlertType): string {
  switch (type) {
    case 'SEM_ESTOQUE':
      return 'Sem estoque';
    case 'ABAIXO_MINIMO':
      return 'Abaixo do minimo';
    case 'ACIMA_MAXIMO':
      return 'Acima do maximo';
    case 'SEM_MOVIMENTACAO':
      return 'Sem movimentacao';
    default:
      return type;
  }
}

function formatAlertDate(value?: string | null): string {
  if (!value) {
    return 'Sem historico';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

function getFilterPayload(
  filters: FilterDraftState,
  page: number,
  size: number
): StockAlertFilterDTO {
  const diasSemMovimentacao = Number.parseInt(filters.diasSemMovimentacao, 10);

  return {
    textoLivre: filters.textoLivre.trim() || undefined,
    tipoAlerta: filters.tipoAlerta || undefined,
    criticidade: filters.criticidade || undefined,
    areaId: filters.areaId ? Number(filters.areaId) : undefined,
    produtoAtivo:
      filters.produtoStatus === 'TODOS'
        ? undefined
        : filters.produtoStatus === 'ATIVOS',
    diasSemMovimentacao:
      Number.isInteger(diasSemMovimentacao) && diasSemMovimentacao > 0
        ? diasSemMovimentacao
        : undefined,
    ordenarPor: 'criticidade',
    direcaoOrdenacao: 'desc',
    pagina: page,
    tamanhoPagina: size,
  };
}

export default function StockAlertsScreen({ navigation }: StockAlertsScreenProps) {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const alertsScrollableLayout = useAppScreenScrollableLayout(16);
  const isMobile = width < 920;
  const isDesktopWeb = Platform.OS === 'web' && width >= 1200;

  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [filters, setFilters] = useState<FilterDraftState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterDraftState>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [openFilter, setOpenFilter] = useState<OpenFilterKey>(null);
  const [response, setResponse] = useState<StockAlertResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const areaOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Todos os setores' },
      ...areas.map((area) => ({ value: String(area.id), label: area.name })),
    ],
    [areas]
  );

  const loadAreas = useCallback(async () => {
    try {
      const areasResponse = await listAreas({ page: 0, size: 200, search: '' });
      const activeAreas = (areasResponse.items ?? []).filter((area) => area.active !== false);
      setAreas(activeAreas);
    } catch {
      setAreas([]);
    }
  }, []);

  const loadAlerts = useCallback(
    async (targetPage = page, pullToRefresh = false) => {
      if (pullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      try {
        const data = await fetchStockAlerts(getFilterPayload(appliedFilters, targetPage, size));
        setResponse(data);
      } catch (error: any) {
        setResponse(null);
        setErrorMessage(
          error?.response?.data?.message ??
            error?.message ??
            'Nao foi possivel carregar os alertas de estoque.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFilters, page, size]
  );

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    void loadAlerts(page);
  }, [loadAlerts, page]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setOpenFilter(null);
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const handleRefresh = () => {
    void loadAlerts(page, true);
  };

  const currentItems = response?.itens ?? [];
  const currentSummary = response?.resumo;
  const totalItems = response?.totalItens ?? 0;
  const totalPages = response?.totalPaginas ?? 0;
  const hasActiveFilters =
    appliedFilters.textoLivre.trim() !== '' ||
    appliedFilters.tipoAlerta !== '' ||
    appliedFilters.criticidade !== '' ||
    appliedFilters.areaId !== '' ||
    appliedFilters.produtoStatus !== 'TODOS' ||
    appliedFilters.diasSemMovimentacao !== '60';

  const renderSummaryCard = (
    label: string,
    value: number | undefined,
    helper: string,
    accentColor: string
  ) => (
    <Surface
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={0}
    >
      <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accentColor }]}>{value ?? 0}</Text>
      <Text style={[styles.summaryHelper, { color: theme.colors.onSurfaceVariant }]}>{helper}</Text>
    </Surface>
  );

  const renderAlertCard = (item: StockAlertItemDTO) => {
    const severityColors = getSeverityColors(item.criticidade);

    return (
      <Surface
        key={`${item.tipoAlerta}-${item.produtoId}-${item.nivelId ?? 'global'}`}
        style={[
          styles.alertCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={0}
      >
        <View style={[styles.alertHeader, isMobile ? styles.alertHeaderCompact : null]}>
          <View style={styles.alertIdentity}>
            <View
              style={[
                styles.severityChip,
                {
                  backgroundColor: severityColors.backgroundColor,
                  borderColor: severityColors.borderColor,
                },
              ]}
            >
              <Text style={[styles.severityChipText, { color: severityColors.textColor }]}>
                {item.criticidade}
              </Text>
            </View>

            <View style={styles.alertIdentityText}>
              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
                {item.produtoNomeModelo}
              </Text>
              <Text style={[styles.alertSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {item.produtoCodigoSistemaWester || 'Sem codigo Wester'} ·{' '}
                {getAlertTypeLabel(item.tipoAlerta)}
              </Text>
            </View>
          </View>

          <StatusBadge active={item.produtoAtivo} />
        </View>

        <Text style={[styles.alertMessage, { color: theme.colors.text }]}>{item.mensagem}</Text>

        <View style={[styles.metricsRow, isMobile ? styles.metricsRowCompact : null]}>
          <View
            style={[
              styles.metricBox,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Saldo</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{item.quantidadeTotal}</Text>
          </View>

          <View
            style={[
              styles.metricBox,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Min / Max</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {(item.estoqueMinimo ?? 0).toString()} / {(item.estoqueMaximo ?? 0).toString()}
            </Text>
          </View>

          <View
            style={[
              styles.metricBox,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
              Ultima movimentacao
            </Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {item.diasSemMovimentacao != null ? `${item.diasSemMovimentacao} dias` : 'Sem dado'}
            </Text>
          </View>
        </View>

        <View style={styles.detailGroup}>
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
            Localizacao principal
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {item.localizacaoResumo || 'Sem localizacao ativa'}
          </Text>
        </View>

        <View style={styles.detailGroup}>
          <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
            Ultimo evento registrado
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatAlertDate(item.ultimaMovimentacaoEm)}
          </Text>
        </View>

        <View style={[styles.actionsRow, isMobile ? styles.actionsRowCompact : null]}>
          <ListActionButton
            label="Produtos"
            icon="package-variant-closed"
            onPress={() => navigation.navigate('Produtos')}
            compact
            fill={isMobile}
          />
          <ListActionButton
            label="Armazem"
            icon="warehouse"
            onPress={() => navigation.navigate('Armazém')}
            compact
            fill={isMobile}
          />
          <ListActionButton
            label="Historico"
            icon="history"
            onPress={() => navigation.navigate('Histórico')}
            compact
            fill={isMobile}
          />
        </View>
      </Surface>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: pageBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopWeb ? styles.scrollContentWeb : null,
          alertsScrollableLayout.contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setOpenFilter(null)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        {...alertsScrollableLayout.scrollViewProps}
      >
        <Surface
          style={[
            listScreenStyles.toolbarSurface,
            openFilter ? listScreenStyles.toolbarSurfaceRaised : null,
            isDesktopWeb ? listScreenStyles.toolbarSurfaceDesktop : null,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          elevation={0}
        >
          <View
            style={[
              listScreenStyles.toolbarTop,
              isMobile ? listScreenStyles.toolbarTopCompact : null,
            ]}
          >
            <View style={listScreenStyles.searchFieldWrap}>
              <AppTextInput
                label="Buscar produto ou codigo"
                value={filters.textoLivre}
                onChangeText={(value) =>
                  setFilters((current) => ({ ...current, textoLivre: value }))
                }
                placeholder="Nome, codigo Wester ou descricao"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Buscar alertas por produto ou codigo"
              />
            </View>

            <View
              style={[
                listScreenStyles.toolbarActions,
                isMobile ? listScreenStyles.toolbarActionsCompact : null,
              ]}
            >
              <ListActionButton
                label="Aplicar filtros"
                icon="filter-check-outline"
                onPress={handleApplyFilters}
              />
              <ListActionButton
                label="Limpar"
                icon="filter-remove-outline"
                onPress={handleClearFilters}
                tone="neutral"
              />
            </View>
          </View>

          <View
            style={[
              listScreenStyles.toolbarBottom,
              isMobile ? listScreenStyles.toolbarBottomCompact : null,
            ]}
          >
            <View
              style={[
                listScreenStyles.filtersRow,
                isMobile ? listScreenStyles.filtersRowCompact : null,
              ]}
            >
              <FilterSelect
                label="Tipo"
                value={filters.tipoAlerta}
                valueLabel={
                  TYPE_OPTIONS.find((option) => option.value === filters.tipoAlerta)?.label ??
                  'Todos os alertas'
                }
                options={TYPE_OPTIONS}
                onSelect={(value) =>
                  setFilters((current) => ({
                    ...current,
                    tipoAlerta: value as StockAlertType | '',
                  }))
                }
                compact={isMobile}
                open={openFilter === 'tipo'}
                onOpenChange={(open) => setOpenFilter(open ? 'tipo' : null)}
              />

              <FilterSelect
                label="Criticidade"
                value={filters.criticidade}
                valueLabel={
                  SEVERITY_OPTIONS.find((option) => option.value === filters.criticidade)?.label ??
                  'Todas as criticidades'
                }
                options={SEVERITY_OPTIONS}
                onSelect={(value) =>
                  setFilters((current) => ({
                    ...current,
                    criticidade: value as StockAlertSeverity | '',
                  }))
                }
                compact={isMobile}
                open={openFilter === 'criticidade'}
                onOpenChange={(open) => setOpenFilter(open ? 'criticidade' : null)}
              />

              <FilterSelect
                label="Setor"
                value={filters.areaId}
                valueLabel={
                  areaOptions.find((option) => option.value === filters.areaId)?.label ??
                  'Todos os setores'
                }
                options={areaOptions}
                onSelect={(value) => setFilters((current) => ({ ...current, areaId: value }))}
                compact={isMobile}
                open={openFilter === 'area'}
                onOpenChange={(open) => setOpenFilter(open ? 'area' : null)}
              />

              <FilterSelect
                label="Status do produto"
                value={filters.produtoStatus}
                valueLabel={
                  PRODUCT_STATUS_OPTIONS.find((option) => option.value === filters.produtoStatus)
                    ?.label ?? 'Todos os produtos'
                }
                options={PRODUCT_STATUS_OPTIONS}
                onSelect={(value) =>
                  setFilters((current) => ({
                    ...current,
                    produtoStatus: value as FilterDraftState['produtoStatus'],
                  }))
                }
                compact={isMobile}
                open={openFilter === 'status'}
                onOpenChange={(open) => setOpenFilter(open ? 'status' : null)}
              />

              <View style={[styles.daysInputWrap, isMobile ? styles.daysInputWrapCompact : null]}>
                <AppTextInput
                  label="Dias sem movimentacao"
                  value={filters.diasSemMovimentacao}
                  onChangeText={(value) =>
                    setFilters((current) => ({
                      ...current,
                      diasSemMovimentacao: value.replace(/[^0-9]/g, ''),
                    }))
                  }
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel="Campo dias sem movimentacao"
                />
              </View>

              <FilterSelect
                label="Tamanho"
                value={String(size)}
                valueLabel={
                  PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === size)?.label ??
                  `${size} / pagina`
                }
                options={PAGE_SIZE_OPTIONS}
                onSelect={(value) => {
                  const parsed = Number(value);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    setSize(parsed);
                    setPage(0);
                  }
                }}
                compact={isMobile}
                open={openFilter === 'tamanho'}
                onOpenChange={(open) => setOpenFilter(open ? 'tamanho' : null)}
              />
            </View>

            <View
              style={[
                listScreenStyles.paginationGroup,
                isMobile ? listScreenStyles.paginationGroupCompact : null,
              ]}
            >
              <Text style={[listScreenStyles.paginationSummaryText, { color: theme.colors.onSurfaceVariant }]}>
                {totalItems} alerta{totalItems === 1 ? '' : 's'}
              </Text>

              <View
                style={[
                  listScreenStyles.paginationControls,
                  isDesktopWeb ? listScreenStyles.paginationControlsNoWrap : null,
                ]}
              >
                <ListActionButton
                  label="Anterior"
                  icon="chevron-left"
                  compact
                  onPress={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={page <= 0 || loading}
                />
                <Text style={[listScreenStyles.paginationPageLabel, { color: theme.colors.text }]}>
                  Pagina {Math.min(page + 1, Math.max(totalPages, 1))} de {Math.max(totalPages, 1)}
                </Text>
                <ListActionButton
                  label="Proxima"
                  icon="chevron-right"
                  compact
                  onPress={() => setPage((current) => current + 1)}
                  disabled={loading || totalPages === 0 || page + 1 >= totalPages}
                />
              </View>
            </View>
          </View>
        </Surface>

        <View style={[styles.summaryGrid, isMobile ? styles.summaryGridCompact : null]}>
          {renderSummaryCard(
            'Total de alertas',
            currentSummary?.totalAlertas,
            'Registros criticos encontrados',
            theme.colors.primary
          )}
          {renderSummaryCard(
            'Sem estoque',
            currentSummary?.produtosSemEstoque,
            'Produtos zerados',
            '#B3261E'
          )}
          {renderSummaryCard(
            'Abaixo do minimo',
            currentSummary?.produtosAbaixoMinimo,
            'Abaixo do limite configurado',
            '#C17D00'
          )}
          {renderSummaryCard(
            'Sem movimentacao',
            currentSummary?.produtosSemMovimentacao,
            'Parados acima do periodo',
            '#2E7D32'
          )}
        </View>

        {loading && !response ? (
          <AppLoadingState message="Carregando alertas de estoque..." style={styles.stateBlock} />
        ) : errorMessage ? (
          <View style={styles.stateBlock}>
            <AppEmptyState
              title="Nao foi possivel carregar os alertas"
              description={errorMessage}
              icon="alert-circle-outline"
              tone="error"
              onRetry={() => void loadAlerts(page)}
            />
          </View>
        ) : currentItems.length === 0 ? (
          <View style={styles.stateBlock}>
            <AppEmptyState
              title={hasActiveFilters ? 'Nenhum alerta encontrado' : 'Nenhum alerta ativo'}
              description={
                hasActiveFilters
                  ? 'Ajuste os filtros para visualizar outros alertas.'
                  : 'Quando houver situacoes criticas no estoque, elas aparecerao aqui.'
              }
              icon="bell-check-outline"
              tipo={hasActiveFilters ? 'semResultado' : 'vazio'}
            />
          </View>
        ) : (
          <View style={styles.alertList}>{currentItems.map(renderAlertCard)}</View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  scrollContentWeb: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryGridCompact: {
    flexDirection: 'column',
  },
  summaryCard: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  summaryHelper: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  alertList: {
    gap: 14,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  alertHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  alertIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIdentityText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  severityChip: {
    minWidth: 70,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  alertSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricsRowCompact: {
    flexDirection: 'column',
  },
  metricBox: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  detailGroup: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionsRowCompact: {
    flexDirection: 'column',
  },
  stateBlock: {
    minHeight: 220,
    justifyContent: 'center',
  },
  daysInputWrap: {
    width: 210,
  },
  daysInputWrapCompact: {
    width: '100%',
  },
});
