import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import FilterSelect from '../../../components/FilterSelect';
import ListActionButton from '../../../components/ListActionButton';
import ListPaginationControls from '../../../components/ListPaginationControls';
import StatusBadge from '../../../components/StatusBadge';
import listScreenStyles from '../../../styles/listScreen';
import { useThemeContext } from '../../../theme/ThemeContext';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { fetchProductsReport } from '../../../services/reportApi';
import { ProductsReportFilterDTO } from '../../../types/Report';
import { exportReportPdf } from '../../../utils/reportPdf';
import { useReportQuery } from '../hooks/useReportQuery';
import {
  buildAppliedFilters,
  ChartCard,
  formatBooleanStatus,
  formatNumber,
  MetricCard,
  PAGE_SIZE_OPTIONS,
  SectionState,
  SelectOption,
  SORT_DIRECTION_OPTIONS,
} from '../reportShared';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'nomeModelo', label: 'Nome' },
  { value: 'codigoSistemaWester', label: 'Código Wester' },
  { value: 'cor', label: 'Cor' },
  { value: 'ativo', label: 'Status' },
  { value: 'quantidadeEstoque', label: 'Estoque total' },
];

type ProductsReportTabProps = {
  isCompact: boolean;
  onFeedback: (type: 'success' | 'error', message: string) => void;
};

export default function ProductsReportTab({
  isCompact,
  onFeedback,
}: ProductsReportTabProps) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const initialFilter = useMemo<ProductsReportFilterDTO>(
    () => ({
      nome: '',
      codigoSistemaWester: '',
      descricao: '',
      cor: '',
      ativo: null,
      sortBy: 'nomeModelo',
      sortDirection: 'asc',
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
  } = useReportQuery({
    initialFilter,
    fetcher: fetchProductsReport,
  });
  const [openFilter, setOpenFilter] = useState<'status' | 'sort' | 'direction' | 'size' | null>(null);
  const [exporting, setExporting] = useState(false);

  const statusValue = filters.ativo == null ? 'ALL' : filters.ativo ? 'ACTIVE' : 'INACTIVE';
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ?? 'Todos';
  const sortLabel = SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ?? 'Nome';
  const directionLabel =
    SORT_DIRECTION_OPTIONS.find((option) => option.value === filters.sortDirection)?.label ??
    'Crescente';
  const pageSizeLabel =
    PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === filters.size)?.label ??
    `${filters.size} / página`;
  const filtersMenuOpen = openFilter !== null;

  const handleExport = async () => {
    if (!data || data.pagination.totalItems === 0) {
      return;
    }

    try {
      setExporting(true);
      const exportData = await fetchProductsReport({
        ...query,
        page: 0,
        size: Math.max(data.pagination.totalItems, query.size, 100),
      });

      await exportReportPdf({
        fileName: 'relatorio-produtos-wester.pdf',
        title: 'WESTER - Relatório de Produtos',
        subtitle: 'Produtos cadastrados, status e totalizações de estoque',
        generatedAt: new Date().toLocaleString('pt-BR'),
        filters: buildAppliedFilters([
          { label: 'Nome', value: query.nome },
          { label: 'Código Wester', value: query.codigoSistemaWester },
          { label: 'Descrição', value: query.descricao },
          { label: 'Cor', value: query.cor },
          { label: 'Status', value: query.ativo == null ? '' : formatBooleanStatus(query.ativo) },
        ]),
        summary: [
          { label: 'Total de produtos', value: formatNumber(exportData.summary.totalProdutos) },
          { label: 'Produtos ativos', value: formatNumber(exportData.summary.totalProdutosAtivos) },
          { label: 'Produtos inativos', value: formatNumber(exportData.summary.totalProdutosInativos) },
          {
            label: 'Quantidade em estoque',
            value: formatNumber(exportData.summary.quantidadeTotalEmEstoque),
          },
        ],
        charts: [
          { title: 'Produtos ativos vs inativos', points: exportData.statusChart },
          { title: 'Distribuição por cor', points: exportData.colorChart },
          { title: 'Produtos mais usados no estoque', points: exportData.usageChart },
        ],
        table: {
          head: ['Código Wester', 'Produto', 'Cor', 'Status', 'Estoque total', 'Descrição'],
          body: exportData.items.map((item) => [
            item.codigoSistemaWester,
            item.nomeModelo,
            item.cor,
            item.ativo ? 'Ativo' : 'Inativo',
            formatNumber(item.quantidadeTotalEmEstoque),
            item.descricao,
          ]),
        },
      });

      onFeedback('success', 'PDF do relatório de produtos gerado com sucesso.');
    } catch (requestError) {
      onFeedback(
        'error',
        getUserFacingErrorMessage(requestError, 'Não foi possível gerar o PDF do relatório de produtos.')
      );
    } finally {
      setExporting(false);
    }
  };

  const renderResults = () => {
    if (!data || data.items.length === 0) {
      return (
        <SectionState
          loading={loading}
          error={error}
          emptyTitle="Nenhum produto encontrado"
          emptyDescription="Ajuste os filtros e tente novamente."
          loadingMessage="Carregando relatório de produtos..."
          onRetry={applyFilters}
        />
      );
    }

    return (
      <View style={styles.resultsList}>
        {data.items.map((item) => (
          <Surface
            key={item.id}
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
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>{item.nomeModelo}</Text>
                <Text style={[styles.resultCode, { color: textSecondary }]}>{item.codigoSistemaWester}</Text>
              </View>
              <StatusBadge active={item.ativo} />
            </View>

            <View style={styles.resultFacts}>
              <View style={styles.factBlock}>
                <Text style={[styles.factLabel, { color: textSecondary }]}>Cor</Text>
                <Text style={[styles.factValue, { color: theme.colors.text }]}>{item.cor}</Text>
              </View>
              <View style={styles.factBlock}>
                <Text style={[styles.factLabel, { color: textSecondary }]}>Estoque total</Text>
                <Text style={[styles.factValue, { color: theme.colors.text }]}>
                  {formatNumber(item.quantidadeTotalEmEstoque)}
                </Text>
              </View>
            </View>

            <Text style={[styles.descriptionText, { color: textSecondary }]}>{item.descricao}</Text>
          </Surface>
        ))}

        <ListPaginationControls
          summary={`${formatNumber(data.pagination.totalItems)} produto(s)`}
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
              label="Nome do produto"
              value={filters.nome}
              onChangeText={(value) => updateFilter({ nome: value })}
              placeholder="Buscar por nome"
              left={<TextInput.Icon icon="magnify" />}
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
              label="Descrição"
              value={filters.descricao}
              onChangeText={(value) => updateFilter({ descricao: value })}
              placeholder="Texto da descrição"
            />
          </View>

          <View style={styles.flexField}>
            <AppTextInput
              label="Cor"
              value={filters.cor}
              onChangeText={(value) => updateFilter({ cor: value })}
              placeholder="Ex.: Preto"
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
            label="Status"
            value={statusValue}
            valueLabel={statusLabel}
            options={STATUS_OPTIONS}
            onSelect={(value) => {
              updateFilter({
                ativo: value === 'ALL' ? null : value === 'ACTIVE',
              });
            }}
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

        <View style={[styles.actionsRow, isCompact ? styles.actionsRowCompact : null]}>
          <ListActionButton label="Aplicar filtros" icon="filter-check-outline" onPress={applyFilters} />
          <ListActionButton label="Limpar filtros" icon="filter-off-outline" onPress={resetFilters} />
          <ListActionButton
            label="Gerar PDF"
            icon="file-pdf-box"
            onPress={handleExport}
            disabled={exporting || !data || data.pagination.totalItems === 0}
          />
        </View>
      </Surface>

      <View style={styles.metricsGrid}>
        <MetricCard label="Total de produtos" value={formatNumber(data?.summary.totalProdutos)} />
        <MetricCard label="Produtos ativos" value={formatNumber(data?.summary.totalProdutosAtivos)} />
        <MetricCard label="Produtos inativos" value={formatNumber(data?.summary.totalProdutosInativos)} />
        <MetricCard
          label="Quantidade em estoque"
          value={formatNumber(data?.summary.quantidadeTotalEmEstoque)}
        />
      </View>

      <View style={styles.chartsGrid}>
        <ChartCard title="Produtos ativos vs inativos" points={data?.statusChart ?? []} />
        <ChartCard title="Distribuição por cor" points={data?.colorChart ?? []} />
        <ChartCard title="Top produtos em estoque" points={data?.usageChart ?? []} />
      </View>

      {renderResults()}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: 16,
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
  actionsRowCompact: {
    width: '100%',
    justifyContent: 'flex-start',
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
    gap: 14,
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
  resultFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  factBlock: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  factValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
