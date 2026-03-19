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
import { fetchStocksReport } from '../../../services/reportApi';
import { StocksReportFilterDTO } from '../../../types/Report';
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
  { value: 'areaNome', label: 'Setor' },
  { value: 'quantidadeTotal', label: 'Quantidade total' },
  { value: 'ocupacaoPercentual', label: 'Ocupação' },
  { value: 'totalNiveis', label: 'Níveis' },
];

type StocksReportTabProps = {
  isCompact: boolean;
  onFeedback: (type: 'success' | 'error', message: string) => void;
};

export default function StocksReportTab({
  isCompact,
  onFeedback,
}: StocksReportTabProps) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const initialFilter = useMemo<StocksReportFilterDTO>(
    () => ({
      area: '',
      fileira: '',
      grade: '',
      nivel: '',
      ativo: null,
      sortBy: 'quantidadeTotal',
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
  } = useReportQuery({
    initialFilter,
    fetcher: async (filter) => fetchStocksReport(filter),
  });
  const [openFilter, setOpenFilter] = useState<'status' | 'sort' | 'direction' | 'size' | null>(null);
  const [exporting, setExporting] = useState(false);

  const statusValue = filters.ativo == null ? 'ALL' : filters.ativo ? 'ACTIVE' : 'INACTIVE';
  const statusLabel = STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ?? 'Todos';
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sortBy)?.label ?? 'Quantidade total';
  const directionLabel =
    SORT_DIRECTION_OPTIONS.find((option) => option.value === filters.sortDirection)?.label ??
    'Decrescente';
  const pageSizeLabel =
    PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === filters.size)?.label ??
    `${filters.size} / página`;

  const handleExport = async () => {
    if (!data || data.pagination.totalItems === 0) {
      return;
    }

    try {
      setExporting(true);
      const exportData = await fetchStocksReport({
        ...query,
        page: 0,
        size: Math.max(data.pagination.totalItems, query.size, 100),
      });

      await exportReportPdf({
        fileName: 'relatorio-estoques-wester.pdf',
        title: 'WESTER - Relatório de Estoques',
        subtitle: 'Distribuição, ocupação e volume por setor',
        generatedAt: new Date().toLocaleString('pt-BR'),
        filters: buildAppliedFilters([
          { label: 'Setor', value: query.area },
          { label: 'Fileira', value: query.fileira },
          { label: 'Grade', value: query.grade },
          { label: 'Nível', value: query.nivel },
          { label: 'Status', value: query.ativo == null ? '' : formatBooleanStatus(query.ativo) },
        ]),
        summary: [
          { label: 'Total de setores', value: formatNumber(exportData.summary.totalAreas) },
          { label: 'Setores ativos', value: formatNumber(exportData.summary.totalAreasAtivas) },
          { label: 'Estruturas', value: formatNumber(exportData.summary.totalNiveis) },
          {
            label: 'Quantidade armazenada',
            value: formatNumber(exportData.summary.quantidadeTotalArmazenada),
          },
        ],
        charts: [
          { title: 'Quantidade por setor', points: exportData.quantityByAreaChart },
          { title: 'Ocupação por setor', points: exportData.occupancyByAreaChart },
          { title: 'Quantidade por fileira', points: exportData.quantityByFileiraChart },
        ],
        table: {
          head: ['Setor', 'Status', 'Fileiras', 'Grades', 'Níveis', 'Itens', 'Qtd.', 'Ocupação'],
          body: exportData.items.map((item) => [
            item.areaNome,
            item.ativo ? 'Ativo' : 'Inativo',
            formatNumber(item.totalFileiras),
            formatNumber(item.totalGrades),
            formatNumber(item.totalNiveis),
            formatNumber(item.totalItensEstoque),
            formatNumber(item.quantidadeTotal),
            `${item.ocupacaoPercentual.toFixed(1)}%`,
          ]),
        },
      });

      onFeedback('success', 'PDF do relatório de estoques gerado com sucesso.');
    } catch (requestError) {
      onFeedback(
        'error',
        getUserFacingErrorMessage(requestError, 'Não foi possível gerar o PDF do relatório de estoques.')
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
          emptyTitle="Nenhuma estrutura encontrada"
          emptyDescription="Ajuste os filtros e tente novamente."
          loadingMessage="Carregando relatório de estoques..."
          onRetry={applyFilters}
        />
      );
    }

    return (
      <View style={styles.resultsList}>
        {data.items.map((item) => (
          <Surface
            key={item.areaId}
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
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>{item.areaNome}</Text>
                <Text style={[styles.resultSubtitle, { color: textSecondary }]}>{item.areaDescricao}</Text>
              </View>
              <StatusBadge active={item.ativo} />
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={[styles.metricPillLabel, { color: textSecondary }]}>Estrutura</Text>
                <Text style={[styles.metricPillValue, { color: theme.colors.text }]}>
                  {`${formatNumber(item.totalFileiras)}F · ${formatNumber(item.totalGrades)}G · ${formatNumber(item.totalNiveis)}N`}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricPillLabel, { color: textSecondary }]}>Itens</Text>
                <Text style={[styles.metricPillValue, { color: theme.colors.text }]}>
                  {formatNumber(item.totalItensEstoque)}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricPillLabel, { color: textSecondary }]}>Quantidade</Text>
                <Text style={[styles.metricPillValue, { color: theme.colors.text }]}>
                  {formatNumber(item.quantidadeTotal)}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={[styles.metricPillLabel, { color: textSecondary }]}>Ocupação</Text>
                <Text style={[styles.metricPillValue, { color: theme.colors.text }]}>
                  {item.ocupacaoPercentual.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Surface>
        ))}

        <ListPaginationControls
          summary={`${formatNumber(data.pagination.totalItems)} setor(es)`}
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
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View style={[styles.filtersGrid, isCompact ? styles.filtersGridCompact : null]}>
          <View style={styles.flexField}>
            <AppTextInput
              label="Setor"
              value={filters.area}
              onChangeText={(value) => updateFilter({ area: value })}
              placeholder="Nome do setor"
              left={<TextInput.Icon icon="warehouse" />}
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
        </View>

        <View style={[styles.filtersFooter, isCompact ? styles.filtersFooterCompact : null]}>
          <FilterSelect
            label="Status"
            value={statusValue}
            valueLabel={statusLabel}
            options={STATUS_OPTIONS}
            onSelect={(value) => updateFilter({ ativo: value === 'ALL' ? null : value === 'ACTIVE' })}
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
        <MetricCard label="Total de setores" value={formatNumber(data?.summary.totalAreas)} />
        <MetricCard label="Setores ativos" value={formatNumber(data?.summary.totalAreasAtivas)} />
        <MetricCard label="Estruturas" value={formatNumber(data?.summary.totalNiveis)} />
        <MetricCard
          label="Quantidade armazenada"
          value={formatNumber(data?.summary.quantidadeTotalArmazenada)}
        />
      </View>

      <View style={styles.chartsGrid}>
        <ChartCard title="Quantidade por setor" points={data?.quantityByAreaChart ?? []} />
        <ChartCard title="Ocupação por setor" points={data?.occupancyByAreaChart ?? []} />
        <ChartCard title="Quantidade por fileira" points={data?.quantityByFileiraChart ?? []} />
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
  },
  filtersFooterCompact: {
    flexDirection: 'column',
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
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricPill: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  metricPillLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricPillValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
