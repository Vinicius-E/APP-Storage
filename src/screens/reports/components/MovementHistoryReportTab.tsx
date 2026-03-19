import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import AppTextInput from '../../../components/AppTextInput';
import FilterSelect from '../../../components/FilterSelect';
import ListActionButton from '../../../components/ListActionButton';
import ListPaginationControls from '../../../components/ListPaginationControls';
import listScreenStyles from '../../../styles/listScreen';
import { useThemeContext } from '../../../theme/ThemeContext';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { fetchMovementHistoryReport } from '../../../services/reportApi';
import { MovementHistoryReportFilterDTO } from '../../../types/Report';
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

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'MOVIMENTACAO', label: 'Movimentação' },
  { value: 'AJUSTE_QUANTIDADE', label: 'Ajuste de quantidade' },
  { value: 'RESEQUENCIAMENTO', label: 'Resequenciamento' },
];

type MovementHistoryReportTabProps = {
  isCompact: boolean;
  onFeedback: (type: 'success' | 'error', message: string) => void;
};

function buildDefaultDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

export default function MovementHistoryReportTab({
  isCompact,
  onFeedback,
}: MovementHistoryReportTabProps) {
  const { theme } = useThemeContext();
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const initialFilter = useMemo<MovementHistoryReportFilterDTO>(
    () => ({
      produto: '',
      codigoSistemaWester: '',
      area: '',
      usuario: '',
      tipoOperacao: '',
      dataInicio: buildDefaultDate(30),
      dataFim: buildDefaultDate(0),
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
    fetcher: async (filter) => fetchMovementHistoryReport(filter),
  });
  const [openFilter, setOpenFilter] = useState<'type' | 'direction' | 'size' | null>(null);
  const [exporting, setExporting] = useState(false);

  const typeLabel = TYPE_OPTIONS.find((option) => option.value === filters.tipoOperacao)?.label ?? 'Todos';
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
      const exportData = await fetchMovementHistoryReport({
        ...query,
        page: 0,
        size: Math.max(data.pagination.totalItems, query.size, 100),
      });

      await exportReportPdf({
        fileName: 'relatorio-historico-movimentacao-wester.pdf',
        title: 'WESTER - Relatório de Histórico de Movimentação',
        subtitle: 'Entradas, saídas e alterações no estoque por período',
        generatedAt: new Date().toLocaleString('pt-BR'),
        filters: buildAppliedFilters([
          { label: 'Produto', value: query.produto },
          { label: 'Código Wester', value: query.codigoSistemaWester },
          { label: 'Setor', value: query.area },
          { label: 'Usuário', value: query.usuario },
          { label: 'Tipo', value: query.tipoOperacao },
          { label: 'Data inicial', value: query.dataInicio },
          { label: 'Data final', value: query.dataFim },
        ]),
        summary: [
          { label: 'Movimentações', value: formatNumber(exportData.summary.totalMovimentacoes) },
          { label: 'Entradas', value: formatNumber(exportData.summary.totalEntradas) },
          { label: 'Saídas', value: formatNumber(exportData.summary.totalSaidas) },
          {
            label: 'Quantidade movimentada',
            value: formatNumber(exportData.summary.quantidadeMovimentadaTotal),
          },
        ],
        charts: [
          { title: 'Movimentações por tipo', points: exportData.typeChart },
          { title: 'Movimentações por período', points: exportData.periodChart },
          { title: 'Produtos mais movimentados', points: exportData.productChart },
          { title: 'Setores mais movimentados', points: exportData.areaChart },
          { title: 'Usuários com mais movimentações', points: exportData.userChart },
        ],
        table: {
          head: ['Data/hora', 'Tipo', 'Produto', 'Código', 'Setor', 'Usuário', 'Qtd. alterada', 'Detalhes'],
          body: exportData.items.map((item) => [
            formatDateTime(item.timestamp),
            item.tipoOperacao,
            item.produtoNomeModelo,
            item.codigoSistemaWester,
            item.areaNome,
            item.usuarioNome,
            formatNumber(item.quantidadeAlterada ?? 0),
            item.detalhesAlteracao,
          ]),
        },
      });

      onFeedback('success', 'PDF do relatório de histórico gerado com sucesso.');
    } catch (requestError) {
      onFeedback(
        'error',
        getUserFacingErrorMessage(
          requestError,
          'Não foi possível gerar o PDF do relatório de histórico de movimentação.'
        )
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
          emptyTitle="Nenhuma movimentação encontrada"
          emptyDescription="Ajuste os filtros e tente novamente."
          loadingMessage="Carregando relatório de histórico..."
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
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
                  {item.produtoNomeModelo}
                </Text>
                <Text style={[styles.resultCode, { color: textSecondary }]}>
                  {`${item.tipoOperacao} · ${formatDateTime(item.timestamp)}`}
                </Text>
              </View>
              <View style={styles.resultQuantityBlock}>
                <Text style={[styles.resultQuantityLabel, { color: textSecondary }]}>Qtd. alterada</Text>
                <Text style={[styles.resultQuantityValue, { color: theme.colors.text }]}>
                  {formatNumber(item.quantidadeAlterada ?? 0)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: theme.colors.text }]}>
                {`Setor ${item.areaNome} / Fileira ${item.fileira} / Grade ${item.grade} / Nível ${item.nivel}`}
              </Text>
              <Text style={[styles.metaText, { color: textSecondary }]}>
                {`${item.usuarioNome} (${item.usuarioLogin})`}
              </Text>
            </View>

            <Text style={[styles.detailText, { color: textSecondary }]}>{item.detalhesAlteracao}</Text>
          </Surface>
        ))}

        <ListPaginationControls
          summary={`${formatNumber(data.pagination.totalItems)} movimentação(ões)`}
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
              label="Produto"
              value={filters.produto}
              onChangeText={(value) => updateFilter({ produto: value })}
              placeholder="Nome do produto"
              left={<TextInput.Icon icon="history" />}
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
              label="Usuário"
              value={filters.usuario}
              onChangeText={(value) => updateFilter({ usuario: value })}
              placeholder="Nome ou login"
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

        <View style={[styles.filtersFooter, isCompact ? styles.filtersFooterCompact : null]}>
          <FilterSelect
            label="Tipo"
            value={filters.tipoOperacao}
            valueLabel={typeLabel}
            options={TYPE_OPTIONS}
            onSelect={(value) => updateFilter({ tipoOperacao: value })}
            compact={isCompact}
            open={openFilter === 'type'}
            onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'type' : null)}
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
        <MetricCard label="Movimentações" value={formatNumber(data?.summary.totalMovimentacoes)} />
        <MetricCard label="Entradas" value={formatNumber(data?.summary.totalEntradas)} />
        <MetricCard label="Saídas" value={formatNumber(data?.summary.totalSaidas)} />
        <MetricCard
          label="Quantidade movimentada"
          value={formatNumber(data?.summary.quantidadeMovimentadaTotal)}
        />
      </View>

      <View style={styles.chartsGrid}>
        <ChartCard title="Movimentações por tipo" points={data?.typeChart ?? []} />
        <ChartCard title="Movimentações por período" points={data?.periodChart ?? []} />
        <ChartCard title="Produtos mais movimentados" points={data?.productChart ?? []} />
        <ChartCard title="Setores mais movimentados" points={data?.areaChart ?? []} />
        <ChartCard title="Usuários com mais movimentações" points={data?.userChart ?? []} />
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
  resultQuantityBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  resultQuantityLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  resultQuantityValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  metaRow: {
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
