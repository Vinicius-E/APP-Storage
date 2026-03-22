import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import AppEmptyState from '../../../components/AppEmptyState';
import FilterSelect from '../../../components/FilterSelect';
import ListActionButton from '../../../components/ListActionButton';
import ListPaginationControls from '../../../components/ListPaginationControls';
import listScreenStyles from '../../../styles/listScreen';
import { useThemeContext } from '../../../theme/ThemeContext';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { fetchStockItemsReport } from '../../../services/reportApi';
import { StockItemsReportFilterDTO } from '../../../types/Report';
import { exportReportPdf } from '../../../utils/reportPdf';
import { useReportQuery } from '../hooks/useReportQuery';
import {
  buildAppliedFilters,
  ChartCard,
  formatDateTime,
  formatNumber,
  MetricCard,
  PAGE_SIZE_OPTIONS,
  SectionState,
  SelectOption,
  SORT_DIRECTION_OPTIONS,
} from '../reportShared';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'BAIXO', label: 'Baixo' },
  { value: 'SEM_ESTOQUE', label: 'Sem estoque' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'quantidade', label: 'Quantidade' },
  { value: 'produto', label: 'Produto' },
  { value: 'area', label: 'Setor' },
  { value: 'nivel', label: 'Nível' },
  { value: 'dataAtualizacao', label: 'Atualização' },
];

type StockItemsReportTabProps = {
  isCompact: boolean;
  onFeedback: (type: 'success' | 'error', message: string) => void;
};

export default function StockItemsReportTab({
  isCompact,
  onFeedback,
}: StockItemsReportTabProps) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const initialFilter = useMemo<StockItemsReportFilterDTO>(
    () => ({
      produto: '',
      codigoSistemaWester: '',
      area: '',
      fileira: '',
      grade: '',
      nivel: '',
      statusItem: '',
      dataInicio: '',
      dataFim: '',
      sortBy: 'quantidade',
      sortDirection: 'desc',
      page: 0,
      size: 10,
    }),
    []
  );
  const {
    filters,
    query,
    data,
    loading,
    error,
    updateFilter,
    applyFilters,
    resetFilters,
    updatePage,
    updatePageSize,
    hasFetchedOnce,
  } = useReportQuery({
    initialFilter,
    fetcher: fetchStockItemsReport,
    autoFetch: false,
  });
  const [openFilter, setOpenFilter] = useState<'status' | 'sort' | 'direction' | 'size' | null>(null);
  const [exporting, setExporting] = useState(false);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ?? 'Quantidade';
  const directionLabel =
    SORT_DIRECTION_OPTIONS.find((option) => option.value === filters.sortDirection)?.label ??
    'Decrescente';
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === filters.statusItem)?.label ?? 'Todos';
  const pageSizeLabel =
    PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === filters.size)?.label ??
    `${filters.size} / página`;
  const filtersMenuOpen = openFilter !== null;
  const hasRelevantFilter = useMemo(
    () =>
      [
        filters.produto,
        filters.codigoSistemaWester,
        filters.area,
        filters.fileira,
        filters.grade,
        filters.nivel,
        filters.dataInicio,
        filters.dataFim,
      ].some((value) => String(value ?? '').trim().length > 0),
    [
      filters.area,
      filters.codigoSistemaWester,
      filters.dataFim,
      filters.dataInicio,
      filters.fileira,
      filters.grade,
      filters.nivel,
      filters.produto,
    ]
  );

  const handleApplyFilters = () => {
    if (!hasRelevantFilter) {
      onFeedback(
        'error',
        'Informe pelo menos produto, codigo, setor, fileira, grade, nivel ou periodo para consultar itens de estoque.'
      );
      return;
    }

    applyFilters();
  };

  const handleResetFilters = () => {
    resetFilters({ fetch: false });
  };

  const handleExport = async () => {
    if (!data || data.pagination.totalItems === 0) {
      return;
    }

    try {
      setExporting(true);
      const exportData = await fetchStockItemsReport({
        ...query,
        page: 0,
        size: Math.max(data.pagination.totalItems, query.size, 100),
      });

      await exportReportPdf({
        fileName: 'relatorio-itens-estoque-wester.pdf',
        title: 'WESTER - Relatório de Itens de Estoque',
        subtitle: 'Itens armazenados, quantidades e localização',
        generatedAt: new Date().toLocaleString('pt-BR'),
        filters: buildAppliedFilters([
          { label: 'Produto', value: query.produto },
          { label: 'Código Wester', value: query.codigoSistemaWester },
          { label: 'Setor', value: query.area },
          { label: 'Fileira', value: query.fileira },
          { label: 'Grade', value: query.grade },
          { label: 'Nível', value: query.nivel },
          { label: 'Status do item', value: query.statusItem },
          { label: 'Data inicial', value: query.dataInicio },
          { label: 'Data final', value: query.dataFim },
        ]),
        summary: [
          { label: 'Itens de estoque', value: formatNumber(exportData.summary.totalItensEstoque) },
          {
            label: 'Quantidade total',
            value: formatNumber(exportData.summary.quantidadeTotalArmazenada),
          },
          { label: 'Produtos únicos', value: formatNumber(exportData.summary.totalProdutosUnicos) },
          { label: 'Setores com itens', value: formatNumber(exportData.summary.totalAreasComItens) },
        ],
        charts: [
          { title: 'Top produtos por quantidade', points: exportData.topProductsChart },
          { title: 'Quantidade por setor', points: exportData.quantityByAreaChart },
          { title: 'Quantidade por localização', points: exportData.quantityByLocationChart },
        ],
        table: {
          head: ['Produto', 'Código', 'Setor', 'Fileira', 'Grade', 'Nível', 'Qtd.', 'Status', 'Atualizado'],
          body: exportData.items.map((item) => [
            item.produtoNomeModelo,
            item.codigoSistemaWester,
            item.areaNome,
            item.fileira,
            item.grade,
            item.nivel,
            formatNumber(item.quantidade),
            item.statusItem,
            formatDateTime(item.dataAtualizacao),
          ]),
        },
      });

      onFeedback('success', 'PDF do relatório de itens de estoque gerado com sucesso.');
    } catch (requestError) {
      onFeedback(
        'error',
        getUserFacingErrorMessage(
          requestError,
          'Não foi possível gerar o PDF do relatório de itens de estoque.'
        )
      );
    } finally {
      setExporting(false);
    }
  };

  const renderResults = () => {
    if (!hasFetchedOnce) {
      return (
        <AppEmptyState
          title="Aplique filtros para consultar itens"
          description="Informe pelo menos produto, codigo, setor, fileira, grade, nivel ou periodo e clique em Aplicar filtros."
          icon="filter-variant"
          style={styles.stateBlock}
        />
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <SectionState
          loading={loading}
          error={error}
          emptyTitle="Nenhum item encontrado"
          emptyDescription="Ajuste os filtros e tente novamente."
          loadingMessage="Carregando relatório de itens..."
          onRetry={handleApplyFilters}
        />
      );
    }

    return (
      <View style={styles.resultsList}>
        {data.items.map((item) => (
          <Surface
            key={item.itemEstoqueId}
            style={[
              styles.resultCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultIdentity}>
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                  {item.produtoNomeModelo}
                </Text>
                <Text style={[styles.resultCode, { color: textSecondary }]}>{item.codigoSistemaWester}</Text>
              </View>
              <View style={styles.quantityWrap}>
                <Text style={[styles.quantityLabel, { color: textSecondary }]}>Quantidade</Text>
                <Text style={[styles.quantityValue, { color: theme.colors.text }]}>
                  {formatNumber(item.quantidade)}
                </Text>
              </View>
            </View>

            <Text style={[styles.locationText, { color: theme.colors.text }]}>
              {`Setor ${item.areaNome} / Fileira ${item.fileira} / Grade ${item.grade} / Nível ${item.nivel}`}
            </Text>

            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: textSecondary }]}>{item.statusItem}</Text>
              <Text style={[styles.metaText, { color: textSecondary }]}>
                Atualizado em {formatDateTime(item.dataAtualizacao)}
              </Text>
            </View>
          </Surface>
        ))}

        <ListPaginationControls
          summary={`${formatNumber(data.pagination.totalItems)} item(ns)`}
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPrevious={() => updatePage(data.pagination.page - 1)}
          onNext={() => updatePage(data.pagination.page + 1)}
          previousDisabled={loading || data.pagination.page <= 0}
          nextDisabled={
            loading ||
            data.pagination.totalPages === 0 ||
            data.pagination.page + 1 >= data.pagination.totalPages
          }
          compact={isCompact}
          textColor={theme.colors.text}
          textSecondary={textSecondary}
        />
      </View>
    );
  };

  return (
    <View style={styles.sectionStack}>
      <Surface
        style={[
          listScreenStyles.toolbarSurface,
          filtersMenuOpen ? listScreenStyles.toolbarSurfaceRaised : null,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View
          style={[
            styles.filtersGrid,
            filtersMenuOpen ? styles.filtersLayerOpen : null,
            isCompact ? styles.filtersGridCompact : null,
          ]}
        >
          <View style={styles.flexField}>
            <AppTextInput
              label="Produto"
              value={filters.produto}
              onChangeText={(value) => updateFilter({ produto: value })}
              placeholder="Nome do produto"
              left={<TextInput.Icon icon="package-variant-closed" />}
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Código Wester"
              value={filters.codigoSistemaWester}
              onChangeText={(value) => updateFilter({ codigoSistemaWester: value })}
              placeholder="Ex.: CDG-1001"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Setor"
              value={filters.area}
              onChangeText={(value) => updateFilter({ area: value })}
              placeholder="Nome do setor"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Fileira"
              value={filters.fileira}
              onChangeText={(value) => updateFilter({ fileira: value })}
              placeholder="Ex.: 01"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Grade"
              value={filters.grade}
              onChangeText={(value) => updateFilter({ grade: value })}
              placeholder="Ex.: A"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Nível"
              value={filters.nivel}
              onChangeText={(value) => updateFilter({ nivel: value })}
              placeholder="Ex.: 3"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Data inicial"
              value={filters.dataInicio}
              onChangeText={(value) => updateFilter({ dataInicio: value })}
              placeholder="AAAA-MM-DD"
            />
          </View>
          <View style={styles.flexField}>
            <AppTextInput
              label="Data final"
              value={filters.dataFim}
              onChangeText={(value) => updateFilter({ dataFim: value })}
              placeholder="AAAA-MM-DD"
            />
          </View>
        </View>

        <View
          style={[
            styles.filtersFooter,
            filtersMenuOpen ? styles.filtersLayerOpen : null,
            isCompact ? styles.filtersFooterCompact : null,
          ]}
        >
          <FilterSelect
            label="Status do item"
            value={filters.statusItem}
            valueLabel={statusLabel}
            options={STATUS_OPTIONS}
            onSelect={(value) => updateFilter({ statusItem: value })}
            compact={isCompact}
            open={openFilter === 'status'}
            onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'status' : null)}
          />
          <FilterSelect
            label="Ordenar por"
            value={filters.sortBy}
            valueLabel={sortLabel}
            options={SORT_OPTIONS}
            onSelect={(value) => updateFilter({ sortBy: value })}
            compact={isCompact}
            open={openFilter === 'sort'}
            onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'sort' : null)}
          />
          <FilterSelect
            label="Direção"
            value={filters.sortDirection}
            valueLabel={directionLabel}
            options={SORT_DIRECTION_OPTIONS}
            onSelect={(value) => updateFilter({ sortDirection: value as 'asc' | 'desc' })}
            compact={isCompact}
            open={openFilter === 'direction'}
            onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'direction' : null)}
          />
          <FilterSelect
            label="Tamanho"
            value={String(filters.size)}
            valueLabel={pageSizeLabel}
            options={PAGE_SIZE_OPTIONS}
            onSelect={(value) => updatePageSize(Number(value))}
            compact={isCompact}
            open={openFilter === 'size'}
            onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'size' : null)}
          />
        </View>

        <View style={styles.actionsRow}>
          <ListActionButton label="Aplicar filtros" icon="filter-check-outline" onPress={handleApplyFilters} />
          <ListActionButton label="Limpar filtros" icon="filter-off-outline" onPress={handleResetFilters} />
          <ListActionButton
            label="Gerar PDF"
            icon="file-pdf-box"
            onPress={handleExport}
            disabled={exporting || !data || data.pagination.totalItems === 0}
          />
        </View>
      </Surface>

      <View style={styles.metricsGrid}>
        <MetricCard label="Itens de estoque" value={formatNumber(data?.summary.totalItensEstoque)} />
        <MetricCard
          label="Quantidade total"
          value={formatNumber(data?.summary.quantidadeTotalArmazenada)}
        />
        <MetricCard label="Produtos únicos" value={formatNumber(data?.summary.totalProdutosUnicos)} />
        <MetricCard label="Setores com itens" value={formatNumber(data?.summary.totalAreasComItens)} />
      </View>

      <View style={styles.chartsGrid}>
        <ChartCard title="Top produtos por quantidade" points={data?.topProductsChart ?? []} />
        <ChartCard title="Quantidade por setor" points={data?.quantityByAreaChart ?? []} />
        <ChartCard title="Quantidade por localização" points={data?.quantityByLocationChart ?? []} />
      </View>

      {renderResults()}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: 16,
  },
  stateBlock: {
    minHeight: 220,
    justifyContent: 'center',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  filtersGridCompact: {
    flexDirection: 'column',
  },
  flexField: {
    flex: 1,
    minWidth: 220,
  },
  filtersFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  filtersFooterCompact: {
    flexDirection: 'column',
  },
  filtersLayerOpen: {
    zIndex: 60,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultsList: {
    gap: 12,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultCode: {
    fontSize: 12,
    fontWeight: '700',
  },
  quantityWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  quantityLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quantityValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
