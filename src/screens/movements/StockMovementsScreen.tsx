import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import AlertDialog from '../../components/AlertDialog';
import AppEmptyState from '../../components/AppEmptyState';
import AppLoadingState from '../../components/AppLoadingState';
import AppTextInput from '../../components/AppTextInput';
import FilterSelect from '../../components/FilterSelect';
import ListActionButton from '../../components/ListActionButton';
import { useAppScreenScrollableLayout } from '../../hooks/useAppScreenScrollableLayout';
import {
  createStockMovement,
  fetchStockMovementAreaStructure,
  fetchStockMovementInitialContext,
  fetchStockItemByLevel,
  listRecentStockMovements,
} from '../../services/stockMovementApi';
import { useThemeContext } from '../../theme/ThemeContext';
import { AreaDTO } from '../../types/Area';
import { Product } from '../../types/Product';
import {
  StockLevelItemDTO,
  StockMovementFileiraDTO,
  StockMovementRecentDTO,
  StockMovementType,
} from '../../types/StockMovement';

type Props = { navigation: any };
type Option = { value: string; label: string };
type LocationSelection = { areaId: string; fileiraId: string; gradeId: string; nivelId: string };

const EMPTY_LOCATION: LocationSelection = { areaId: '', fileiraId: '', gradeId: '', nivelId: '' };
const TYPE_OPTIONS: Option[] = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saida' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'AJUSTE', label: 'Ajuste' },
];
const ADJUSTMENT_MODE_OPTIONS: Option[] = [
  { value: 'SALDO_FINAL', label: 'Saldo final' },
  { value: 'DIFERENCA', label: 'Diferenca' },
];

function formatMovementType(type: string) {
  if (type === 'SAIDA') return 'Saida';
  if (type === 'TRANSFERENCIA' || type === 'MOVIMENTACAO') return 'Transferencia';
  if (type === 'AJUSTE' || type === 'AJUSTE_QUANTIDADE') return 'Ajuste';
  return 'Entrada';
}

function sanitizeDigits(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function sanitizeSignedDigits(value: string) {
  return value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
}

function parseInteger(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function productLabel(product: Product) {
  return `${product.nomeModelo ?? product.nome ?? 'Produto'} · ${product.codigoSistemaWester ?? product.codigo ?? 'Sem codigo'}`;
}

function recentDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
}

export default function StockMovementsScreen({ navigation }: Props) {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const isMobile = width < 920;
  const layout = useAppScreenScrollableLayout(16);

  const [areas, setAreas] = useState<AreaDTO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [structures, setStructures] = useState<Record<number, StockMovementFileiraDTO[]>>({});
  const [movementType, setMovementType] = useState<StockMovementType>('ENTRADA');
  const [adjustmentMode, setAdjustmentMode] = useState<'SALDO_FINAL' | 'DIFERENCA'>('SALDO_FINAL');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetLocation, setTargetLocation] = useState<LocationSelection>(EMPTY_LOCATION);
  const [originLocation, setOriginLocation] = useState<LocationSelection>(EMPTY_LOCATION);
  const [destinationLocation, setDestinationLocation] = useState<LocationSelection>(EMPTY_LOCATION);
  const [targetItem, setTargetItem] = useState<StockLevelItemDTO | null>(null);
  const [originItem, setOriginItem] = useState<StockLevelItemDTO | null>(null);
  const [destinationItem, setDestinationItem] = useState<StockLevelItemDTO | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [adjustmentInput, setAdjustmentInput] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [recent, setRecent] = useState<StockMovementRecentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const loadInitialContext = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const response = await fetchStockMovementInitialContext({ forceRefresh });
      setAreas((response.areas ?? []).filter((area) => area.active !== false));
      setProducts((response.products ?? []).filter((product) => product.ativo !== false));
      setRecent(response.recentMovements ?? []);
      setLoadingRecent(false);
    } catch (error: any) {
      setFeedback({
        visible: true,
        type: 'error',
        message: error?.message ?? 'Nao foi possivel carregar dados para movimentacao.',
      });
    } finally {
      setLoadingRecent(false);
      setLoading(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      setRecent(await listRecentStockMovements(10));
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialContext();
  }, [loadInitialContext]);

  const ensureStructure = useCallback(async (areaId: string) => {
    const parsedAreaId = Number(areaId);
    if (!Number.isFinite(parsedAreaId) || parsedAreaId <= 0 || structures[parsedAreaId]) {
      return;
    }
    const fileiras = await fetchStockMovementAreaStructure(parsedAreaId);
    setStructures((current) => ({ ...current, [parsedAreaId]: fileiras }));
  }, [structures]);

  const syncLevelItem = useCallback(async (nivelIdText: string, setter: (item: StockLevelItemDTO | null) => void) => {
    const nivelId = Number(nivelIdText);
    if (!Number.isFinite(nivelId) || nivelId <= 0) {
      setter(null);
      return;
    }
    try {
      setter(await fetchStockItemByLevel(nivelId));
    } catch {
      setter(null);
    }
  }, []);

  useEffect(() => { void syncLevelItem(targetLocation.nivelId, setTargetItem); }, [syncLevelItem, targetLocation.nivelId]);
  useEffect(() => { void syncLevelItem(originLocation.nivelId, setOriginItem); }, [syncLevelItem, originLocation.nivelId]);
  useEffect(() => { void syncLevelItem(destinationLocation.nivelId, setDestinationItem); }, [syncLevelItem, destinationLocation.nivelId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();
    if (!normalizedSearch) return products;
    return products.filter((product) =>
      [product.nomeModelo, product.nome, product.codigoSistemaWester, product.codigo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [productSearch, products]);

  const productOptions = useMemo<Option[]>(
    () => filteredProducts.map((product) => ({ value: String(product.id), label: productLabel(product) })),
    [filteredProducts]
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(selectedProductId)) ?? null,
    [products, selectedProductId]
  );

  const getFileiras = (selection: LocationSelection) => structures[Number(selection.areaId)] ?? [];
  const getGrades = (selection: LocationSelection) =>
    getFileiras(selection).find((fileira) => fileira.id === Number(selection.fileiraId))?.grades ?? [];
  const getNiveis = (selection: LocationSelection) =>
    getGrades(selection).find((grade) => grade.id === Number(selection.gradeId))?.niveis ?? [];

  const updateLocation = async (
    selection: LocationSelection,
    setter: React.Dispatch<React.SetStateAction<LocationSelection>>,
    field: keyof LocationSelection,
    value: string
  ) => {
    if (field === 'areaId') {
      setter({ areaId: value, fileiraId: '', gradeId: '', nivelId: '' });
      await ensureStructure(value);
      return;
    }
    if (field === 'fileiraId') {
      setter({ ...selection, fileiraId: value, gradeId: '', nivelId: '' });
      return;
    }
    if (field === 'gradeId') {
      setter({ ...selection, gradeId: value, nivelId: '' });
      return;
    }
    setter({ ...selection, nivelId: value });
  };

  const areaOptions = useMemo<Option[]>(
    () => areas.map((area) => ({ value: String(area.id), label: area.name })),
    [areas]
  );

  const initialCardIsOpen = openFilter === 'tipo' || openFilter === 'produto';
  const parametersCardIsOpen = openFilter === 'ajuste';

  const renderLocation = (
    title: string,
    selection: LocationSelection,
    setter: React.Dispatch<React.SetStateAction<LocationSelection>>,
    prefix: string,
    item: StockLevelItemDTO | null
  ) => {
    const fileiraOptions = getFileiras(selection).map((fileira) => ({ value: String(fileira.id), label: fileira.identificador }));
    const gradeOptions = getGrades(selection).map((grade) => ({ value: String(grade.id), label: grade.identificador }));
    const nivelOptions = getNiveis(selection).map((nivel) => ({ value: String(nivel.id), label: nivel.identificador }));
    const locationCardIsOpen = openFilter?.startsWith(`${prefix}-`) === true;

    return (
      <Surface
        style={[
          styles.card,
          locationCardIsOpen ? styles.cardOpen : null,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
        elevation={0}
      >
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
        <View style={[styles.selectGrid, locationCardIsOpen ? styles.selectGridOpen : null, isMobile ? styles.selectGridCompact : null]}>
          <FilterSelect
            label="Setor"
            value={selection.areaId}
            valueLabel={areaOptions.find((option) => option.value === selection.areaId)?.label ?? 'Selecione'}
            options={areaOptions}
            onSelect={(value) => { void updateLocation(selection, setter, 'areaId', value); }}
            compact={isMobile}
            open={openFilter === `${prefix}-area`}
            onOpenChange={(open) => setOpenFilter(open ? `${prefix}-area` : null)}
          />
          <FilterSelect
            label="Fileira"
            value={selection.fileiraId}
            valueLabel={fileiraOptions.find((option) => option.value === selection.fileiraId)?.label ?? 'Selecione'}
            options={fileiraOptions}
            onSelect={(value) => { void updateLocation(selection, setter, 'fileiraId', value); }}
            compact={isMobile}
            open={openFilter === `${prefix}-fileira`}
            onOpenChange={(open) => setOpenFilter(open ? `${prefix}-fileira` : null)}
            disabled={!selection.areaId}
          />
          <FilterSelect
            label="Grade"
            value={selection.gradeId}
            valueLabel={gradeOptions.find((option) => option.value === selection.gradeId)?.label ?? 'Selecione'}
            options={gradeOptions}
            onSelect={(value) => { void updateLocation(selection, setter, 'gradeId', value); }}
            compact={isMobile}
            open={openFilter === `${prefix}-grade`}
            onOpenChange={(open) => setOpenFilter(open ? `${prefix}-grade` : null)}
            disabled={!selection.fileiraId}
          />
          <FilterSelect
            label="Nivel"
            value={selection.nivelId}
            valueLabel={nivelOptions.find((option) => option.value === selection.nivelId)?.label ?? 'Selecione'}
            options={nivelOptions}
            onSelect={(value) => { void updateLocation(selection, setter, 'nivelId', value); }}
            compact={isMobile}
            open={openFilter === `${prefix}-nivel`}
            onOpenChange={(open) => setOpenFilter(open ? `${prefix}-nivel` : null)}
            disabled={!selection.gradeId}
          />
        </View>

        {selection.nivelId ? (
          <View style={[styles.preview, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
            <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>Item atual</Text>
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
              {item?.produtoNomeModelo || 'Sem item cadastrado'}
            </Text>
            {item ? (
              <Text style={[styles.previewMeta, { color: theme.colors.onSurfaceVariant }]}>
                {item.produtoCodigoWester || 'Sem codigo'} · {item.quantidade} un.
              </Text>
            ) : null}
          </View>
        ) : null}
      </Surface>
    );
  };

  const handleSubmit = async () => {
    const quantity = parseInteger(quantityInput);
    const adjustmentValue = parseInteger(adjustmentInput);
    const payloadBase = {
      motivo: motivo.trim() || undefined,
      observacao: observacao.trim() || undefined,
    };

    try {
      setSubmitting(true);

      if (movementType === 'ENTRADA') {
        if (!selectedProductId || !targetLocation.nivelId || !quantity || quantity <= 0) {
          throw new Error('Selecione produto, destino e uma quantidade valida para a entrada.');
        }
        await createStockMovement({
          ...payloadBase,
          tipoMovimentacao: 'ENTRADA',
          produtoId: Number(selectedProductId),
          nivelId: Number(targetLocation.nivelId),
          quantidade: quantity,
        });
      } else if (movementType === 'SAIDA') {
        if (!originItem || !originLocation.nivelId || !quantity || quantity <= 0) {
          throw new Error('Selecione uma origem valida e informe a quantidade da saida.');
        }
        await createStockMovement({
          ...payloadBase,
          tipoMovimentacao: 'SAIDA',
          produtoId: originItem.produtoId ?? undefined,
          nivelId: Number(originLocation.nivelId),
          quantidade: quantity,
        });
      } else if (movementType === 'TRANSFERENCIA') {
        if (!originItem || !originLocation.nivelId || !destinationLocation.nivelId || !quantity || quantity <= 0) {
          throw new Error('Selecione origem, destino e quantidade validos para a transferencia.');
        }
        await createStockMovement({
          ...payloadBase,
          tipoMovimentacao: 'TRANSFERENCIA',
          produtoId: originItem.produtoId ?? undefined,
          nivelOrigemId: Number(originLocation.nivelId),
          nivelDestinoId: Number(destinationLocation.nivelId),
          quantidade: quantity,
        });
      } else {
        if (!targetLocation.nivelId || !motivo.trim() || adjustmentValue == null) {
          throw new Error('Informe nivel, motivo e valor do ajuste.');
        }
        await createStockMovement({
          ...payloadBase,
          tipoMovimentacao: 'AJUSTE',
          produtoId: targetItem?.produtoId ?? (selectedProductId ? Number(selectedProductId) : undefined),
          nivelId: Number(targetLocation.nivelId),
          quantidadeAjustada: adjustmentMode === 'SALDO_FINAL' ? adjustmentValue : undefined,
          quantidadeDiferenca: adjustmentMode === 'DIFERENCA' ? adjustmentValue : undefined,
          motivo: motivo.trim(),
        });
      }

      setFeedback({
        visible: true,
        type: 'success',
        message: `${formatMovementType(movementType)} registrada com sucesso.`,
      });
      await Promise.all([
        loadRecent(),
        syncLevelItem(targetLocation.nivelId, setTargetItem),
        syncLevelItem(originLocation.nivelId, setOriginItem),
        syncLevelItem(destinationLocation.nivelId, setDestinationItem),
      ]);
      setQuantityInput('1');
      setAdjustmentInput('');
      setMotivo('');
      setObservacao('');
    } catch (error: any) {
      setFeedback({
        visible: true,
        type: 'error',
        message: error?.response?.data?.message ?? error?.message ?? 'Nao foi possivel registrar a movimentacao.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppLoadingState message="Carregando dados para movimentacao..." style={{ flex: 1 }} />;
  }

  return (
    <>
      <View style={[styles.root, { backgroundColor: pageBackground }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, layout.contentContainerStyle]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void (async () => {
            setRefreshing(true);
            await loadInitialContext(true);
            setRefreshing(false);
          })()} />}
          onScrollBeginDrag={() => setOpenFilter(null)}
          {...layout.scrollViewProps}
        >
          <Surface
            style={[
              styles.card,
              initialCardIsOpen ? styles.cardOpen : null,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            elevation={0}
          >
            <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Movimentacao de Estoque</Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Registre entradas, saidas, transferencias e ajustes com historico operacional.
            </Text>

            <View style={[styles.selectGrid, initialCardIsOpen ? styles.selectGridOpen : null, isMobile ? styles.selectGridCompact : null]}>
              <FilterSelect
                label="Tipo"
                value={movementType}
                valueLabel={TYPE_OPTIONS.find((option) => option.value === movementType)?.label ?? 'Selecione'}
                options={TYPE_OPTIONS}
                onSelect={(value) => {
                  setMovementType(value as StockMovementType);
                  setTargetLocation(EMPTY_LOCATION);
                  setOriginLocation(EMPTY_LOCATION);
                  setDestinationLocation(EMPTY_LOCATION);
                  setTargetItem(null);
                  setOriginItem(null);
                  setDestinationItem(null);
                }}
                compact={isMobile}
                open={openFilter === 'tipo'}
                onOpenChange={(open) => setOpenFilter(open ? 'tipo' : null)}
              />
              <AppTextInput
                label="Filtrar produto"
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Nome ou codigo"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Filtrar produtos da movimentacao"
              />
              <FilterSelect
                label="Produto"
                value={selectedProductId}
                valueLabel={selectedProduct ? productLabel(selectedProduct) : 'Selecione'}
                options={productOptions}
                onSelect={setSelectedProductId}
                compact={isMobile}
                open={openFilter === 'produto'}
                onOpenChange={(open) => setOpenFilter(open ? 'produto' : null)}
                disabled={movementType === 'SAIDA' || movementType === 'TRANSFERENCIA'}
              />
            </View>
          </Surface>

          {(movementType === 'ENTRADA' || movementType === 'AJUSTE') &&
            renderLocation(
              movementType === 'ENTRADA' ? 'Destino' : 'Nivel do ajuste',
              targetLocation,
              setTargetLocation,
              'target',
              targetItem
            )}

          {(movementType === 'SAIDA' || movementType === 'TRANSFERENCIA') &&
            renderLocation('Origem', originLocation, setOriginLocation, 'origin', originItem)}

          {movementType === 'TRANSFERENCIA' &&
            renderLocation('Destino', destinationLocation, setDestinationLocation, 'destination', destinationItem)}

          <Surface
            style={[
              styles.card,
              parametersCardIsOpen ? styles.cardOpen : null,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
            elevation={0}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Parametros</Text>
            {movementType === 'AJUSTE' ? (
              <FilterSelect
                label="Modo do ajuste"
                value={adjustmentMode}
                valueLabel={ADJUSTMENT_MODE_OPTIONS.find((option) => option.value === adjustmentMode)?.label ?? 'Selecione'}
                options={ADJUSTMENT_MODE_OPTIONS}
                onSelect={(value) => setAdjustmentMode(value as 'SALDO_FINAL' | 'DIFERENCA')}
                compact={isMobile}
                open={openFilter === 'ajuste'}
                onOpenChange={(open) => setOpenFilter(open ? 'ajuste' : null)}
              />
            ) : null}

            <View style={[styles.selectGrid, isMobile ? styles.selectGridCompact : null]}>
              <AppTextInput
                label={movementType === 'AJUSTE' ? (adjustmentMode === 'SALDO_FINAL' ? 'Saldo final' : 'Diferenca') : 'Quantidade'}
                value={movementType === 'AJUSTE' ? adjustmentInput : quantityInput}
                onChangeText={(value) =>
                  movementType === 'AJUSTE'
                    ? setAdjustmentInput(adjustmentMode === 'SALDO_FINAL' ? sanitizeDigits(value) : sanitizeSignedDigits(value))
                    : setQuantityInput(sanitizeDigits(value))
                }
                keyboardType="number-pad"
                accessibilityLabel="Campo principal da movimentacao"
              />
              <AppTextInput
                label={movementType === 'AJUSTE' ? 'Motivo *' : 'Motivo'}
                value={motivo}
                onChangeText={setMotivo}
                autoCapitalize="sentences"
                autoCorrect={false}
                accessibilityLabel="Campo motivo da movimentacao"
              />
            </View>

            <AppTextInput
              label="Observacao"
              value={observacao}
              onChangeText={setObservacao}
              multiline
              numberOfLines={3}
              accessibilityLabel="Campo observacao da movimentacao"
            />

            <View style={[styles.actions, isMobile ? styles.actionsCompact : null]}>
              <ListActionButton
                label={`Registrar ${formatMovementType(movementType).toLowerCase()}`}
                icon="content-save-outline"
                onPress={() => { void handleSubmit(); }}
                disabled={submitting}
                tone="success"
                fill={isMobile}
              />
              <ListActionButton
                label="Historico"
                icon="history"
                onPress={() => navigation.navigate('Histórico')}
                disabled={submitting}
                fill={isMobile}
              />
            </View>
          </Surface>

          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={0}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Movimentacoes recentes</Text>
            {loadingRecent ? (
              <AppLoadingState message="Carregando movimentacoes recentes..." style={{ minHeight: 120 }} />
            ) : recent.length === 0 ? (
              <AppEmptyState
                title="Nenhuma movimentacao recente"
                description="As ultimas operacoes do estoque aparecerao aqui."
                icon="history"
              />
            ) : (
              <View style={styles.recentList}>
                {recent.map((movement) => (
                  <View key={movement.id} style={[styles.recentCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                    <Text style={[styles.recentType, { color: theme.colors.primary }]}>{formatMovementType(movement.tipoMovimentacao)}</Text>
                    <Text style={[styles.recentTitle, { color: theme.colors.text }]}>
                      {movement.produtoNomeModelo || 'Produto nao informado'}
                    </Text>
                    <Text style={[styles.recentMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {movement.produtoCodigoSistemaWester || 'Sem codigo'} · {recentDate(movement.timestamp)}
                    </Text>
                    <Text style={[styles.recentMeta, { color: theme.colors.onSurfaceVariant }]}>
                      Quantidade: {movement.quantidadeMovimentada ?? 0} un.
                    </Text>
                    <Text style={[styles.recentDetail, { color: theme.colors.text }]}>
                      {movement.detalhesAlteracao || 'Sem detalhes adicionais.'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Surface>
        </ScrollView>
      </View>

      <AlertDialog
        visible={feedback.visible}
        message={feedback.message}
        type={feedback.type}
        onDismiss={() => setFeedback((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  cardOpen: {
    zIndex: 50,
    elevation: 30,
  },
  screenTitle: { fontSize: 24, fontWeight: '900' },
  screenSubtitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  selectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, overflow: 'visible', zIndex: 1 },
  selectGridOpen: { zIndex: 60 },
  selectGridCompact: { flexDirection: 'column' },
  preview: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  previewLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  previewTitle: { fontSize: 15, fontWeight: '800' },
  previewMeta: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionsCompact: { flexDirection: 'column' },
  recentList: { gap: 12 },
  recentCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  recentType: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  recentTitle: { fontSize: 16, fontWeight: '900' },
  recentMeta: { fontSize: 13, fontWeight: '700' },
  recentDetail: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
});
