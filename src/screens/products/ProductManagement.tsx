import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AlertDialog from '../../components/AlertDialog';
import AppEmptyState from '../../components/AppEmptyState';
import SharedConfirmStatusDialog from '../../components/ConfirmStatusDialog';
import FilterSelect from '../../components/FilterSelect';
import AppLoadingState from '../../components/AppLoadingState';
import ListActionButton from '../../components/ListActionButton';
import StatusBadge from '../../components/StatusBadge';
import AppTextInput from '../../components/AppTextInput';
import { Modal, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { usePermissions } from '../../security/permissions';
import ProductFormModal from './components/ProductFormModal';
import listScreenStyles from '../../styles/listScreen';
import { useThemeContext } from '../../theme/ThemeContext';
import { getUserFacingErrorMessage } from '../../utils/userFacingError';
import {
  activateProduct,
  createProduct,
  inactivateProduct,
  listProducts,
  updateProduct,
} from '../../services/productApi';
import { Product, ProductStatusFilter, ProductUpsertRequest } from '../../types/Product';

type SelectOption = {
  value: string;
  label: string;
};

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

type StatusConfirmation = {
  product: Product;
  nextActive: boolean;
};

type FeedbackState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

const IS_WEB = Platform.OS === 'web';
const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 / página' },
  { value: '20', label: '20 / página' },
  { value: '50', label: '50 / página' },
];
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'INATIVO', label: 'Inativos' },
];

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

function resolveRequestErrorMessage(error: unknown, fallback: string): string {
  return getUserFacingErrorMessage(error, fallback);
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('pt-BR');
}

function getInitials(value?: string, fallback = 'PR'): string {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9\s]+/g, ' ');

  if (!normalized) {
    return fallback;
  }

  const chunks = normalized.split(/\s+/).filter(Boolean);
  const first = chunks[0]?.slice(0, 1) ?? '';
  const second =
    chunks.length > 1 ? (chunks[1]?.slice(0, 1) ?? '') : (chunks[0]?.slice(1, 2) ?? '');
  const initials = `${first}${second}`.toUpperCase();

  return initials || fallback;
}

function getProductColorHex(color?: string): string {
  const normalized = String(color ?? '')
    .trim()
    .toUpperCase();

  switch (normalized) {
    case 'CINZA':
      return '#9E9E9E';
    case 'PRETO':
      return '#212121';
    case 'BRANCO':
      return '#F5F5F5';
    case 'NATURAL':
      return '#D4A96A';
    case 'VERMELHO':
      return '#E53935';
    case 'AZUL':
      return '#1E88E5';
    default:
      return '#CCCCCC';
  }
}

function ConfirmStatusDialog({
  visible,
  target,
  processing,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  target: StatusConfirmation | null;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 640;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={processing ? undefined : onCancel}
        contentContainerStyle={styles.confirmModalOuter}
      >
        <Surface
          style={[
            styles.confirmModalSurface,
            {
              width: Math.min(width - 24, 480),
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>
            {target?.nextActive ? 'Ativar produto' : 'Inativar produto'}
          </Text>

          <Text style={[styles.confirmDescription, { color: theme.colors.onSurfaceVariant }]}>
            {target
              ? `Confirma ${target.nextActive ? 'a ativação' : 'a inativação'} de "${target.product.nome}"?`
              : ''}
          </Text>

          <View style={[styles.confirmActions, isCompact ? styles.confirmActionsCompact : null]}>
            <ListActionButton
              label="Cancelar"
              icon="close"
              onPress={onCancel}
              disabled={processing}
              compact
            />

            <ListActionButton
              label={target?.nextActive ? 'Confirmar ativação' : 'Confirmar inativação'}
              icon={target?.nextActive ? 'check-circle-outline' : 'close-circle-outline'}
              onPress={onConfirm}
              disabled={processing}
              compact
              tone={target?.nextActive ? 'success' : 'danger'}
            />
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

export default function ProductManagement() {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { hasPermission } = usePermissions();
  const { width } = useWindowDimensions();
  const isMobile = width < 920;
  const isDesktopWeb = IS_WEB && width >= 1200;
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [statusConfirmation, setStatusConfirmation] = useState<StatusConfirmation | null>(null);
  const [processingStatusId, setProcessingStatusId] = useState<number | null>(null);
  const [openFilter, setOpenFilter] = useState<'status' | 'size' | null>(null);
  const latestFetchRequestRef = useRef(0);
  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const canCreateProducts = hasPermission('PRODUCTS', 'CREATE');
  const canEditProducts = hasPermission('PRODUCTS', 'EDIT');
  const canActivateProducts = hasPermission('PRODUCTS', 'ACTIVATE');
  const canInactivateProducts = hasPermission('PRODUCTS', 'INACTIVATE');

  const hasActiveFilters = debouncedSearch.length > 0 || statusFilter !== 'TODOS';

  const showFeedback = useCallback((type: FeedbackState['type'], message: string) => {
    setFeedback({
      visible: true,
      message,
      type,
    });
  }, []);

  const hideFeedback = useCallback(() => {
    setFeedback((current) => ({ ...current, visible: false }));
  }, []);

  const fetchProducts = useCallback(
    async (targetPage = page, refresh = false) => {
      const requestId = latestFetchRequestRef.current + 1;
      latestFetchRequestRef.current = requestId;

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await listProducts({
          page: targetPage,
          size,
          search: debouncedSearch,
          status: statusFilter,
        });

        if (latestFetchRequestRef.current !== requestId) {
          return;
        }

        setItems(Array.isArray(response.items) ? response.items : []);
        setPage(Number.isFinite(response.page) ? Math.max(response.page, 0) : targetPage);
        setTotalItems(Number.isFinite(response.totalItems) ? Math.max(response.totalItems, 0) : 0);
        setTotalPages(Number.isFinite(response.totalPages) ? Math.max(response.totalPages, 0) : 0);
      } catch (requestError) {
        if (latestFetchRequestRef.current !== requestId) {
          return;
        }

        const message = resolveRequestErrorMessage(
          requestError,
          'Não foi possível carregar os produtos.'
        );

        setItems([]);
        setTotalItems(0);
        setTotalPages(0);
        setError(message);
      } finally {
        if (latestFetchRequestRef.current !== requestId) {
          return;
        }

        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, page, size, statusFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    void fetchProducts(page);
  }, [fetchProducts, page]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as ProductStatusFilter);
    setPage(0);
  };

  const handlePageSizeChange = (value: string) => {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    setSize(nextSize);
    setPage(0);
  };

  const handleOpenCreate = () => {
    if (!canCreateProducts) {
      return;
    }

    setEditingProduct(null);
    setIsFormVisible(true);
  };

  const handleOpenEdit = (product: Product) => {
    if (!canEditProducts) {
      return;
    }

    setEditingProduct(product);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    if (savingForm) {
      return;
    }

    setIsFormVisible(false);
    setEditingProduct(null);
  };

  const handleSubmitForm = async (payload: ProductUpsertRequest) => {
    try {
      setSavingForm(true);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showFeedback('success', 'Produto atualizado com sucesso.');
      } else {
        await createProduct(payload);
        showFeedback('success', 'Produto criado com sucesso.');
      }

      setIsFormVisible(false);
      setEditingProduct(null);
      await fetchProducts(page);
    } catch (requestError) {
      showFeedback(
        'error',
        resolveRequestErrorMessage(
          requestError,
          editingProduct
            ? 'Não foi possível atualizar o produto.'
            : 'Não foi possível criar o produto.'
        )
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleAskStatusChange = (product: Product) => {
    if (product.ativo && !canInactivateProducts) {
      return;
    }

    if (!product.ativo && !canActivateProducts) {
      return;
    }

    setStatusConfirmation({
      product,
      nextActive: !product.ativo,
    });
  };

  const handleCancelStatusChange = () => {
    if (processingStatusId !== null) {
      return;
    }

    setStatusConfirmation(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmation) {
      return;
    }

    const { product, nextActive } = statusConfirmation;

    try {
      setProcessingStatusId(product.id);

      if (nextActive) {
        await activateProduct(product.id);
        showFeedback('success', 'Produto ativado com sucesso.');
      } else {
        await inactivateProduct(product.id);
        showFeedback('success', 'Produto inativado com sucesso.');
      }

      setStatusConfirmation(null);
      await fetchProducts(page);
    } catch (requestError) {
      showFeedback(
        'error',
        resolveRequestErrorMessage(
          requestError,
          nextActive ? 'Não foi possível ativar o produto.' : 'Não foi possível inativar o produto.'
        )
      );
    } finally {
      setProcessingStatusId(null);
    }
  };

  const handleRetry = () => {
    void fetchProducts(page);
  };

  const handleRefresh = () => {
    void fetchProducts(page, true);
  };

  const handleGoToPreviousPage = () => {
    if (page <= 0 || loading) {
      return;
    }

    setPage((current) => Math.max(current - 1, 0));
  };

  const handleGoToNextPage = () => {
    if (loading || page + 1 >= totalPages) {
      return;
    }

    setPage((current) => current + 1);
  };

  const statusLabel = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? 'Todos',
    [statusFilter]
  );

  const sizeLabel = useMemo(
    () =>
      PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === size)?.label ??
      `${size} / página`,
    [size]
  );

  const renderContent = () => {
    if (loading && items.length === 0) {
      return <AppLoadingState message="Carregando produtos..." style={styles.stateBlock} />;
    }

    if (error && items.length === 0) {
      return (
        <View style={styles.stateBlock}>
          <AppEmptyState
            title="Não foi possível carregar os produtos"
            description="Verifique sua conexão e tente novamente."
            icon="alert-circle-outline"
            tone="error"
            onRetry={handleRetry}
            style={styles.stateBlock}
          />
        </View>
      );
    }

    if (!loading && items.length === 0) {
      return (
        <AppEmptyState
          title={hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          description={
            hasActiveFilters
              ? 'Tente buscar por outro nome, código ou cor.'
              : "Clique em 'Novo produto' para começar."
          }
          icon={hasActiveFilters ? 'package-variant-remove' : 'package-variant-closed-plus'}
          tipo={hasActiveFilters ? 'semResultado' : 'vazio'}
          style={styles.stateBlock}
        />
      );
    }

    return (
      <View style={styles.listSection}>
        {loading ? (
          <AppLoadingState
            message="Atualizando produtos..."
            variant="inline"
            style={styles.inlineLoading}
          />
        ) : null}

        {isMobile ? (
          <View style={styles.cardList}>
            {items.map((product) => {
              const productName = product.nome?.trim() || '—';
              const productCode = product.codigo?.trim() || '—';
              const productDescription = product.descricao?.trim();
              const productUpdatedAt = formatTimestamp(product.updatedAt ?? product.createdAt);
              const initials = getInitials(productCode !== '—' ? productCode : productName);

              const displayName = product.nomeModelo?.trim() || productName;
              const displayCode = product.codigoSistemaWester?.trim() || productCode;
              const productColor = product.cor?.trim() || '';

              return (
                <Surface
                  key={product.id}
                  style={[
                    styles.mobileCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  elevation={0}
                >
                  <View style={styles.mobileHeaderRow}>
                    <View
                      style={[
                        styles.mobileAvatar,
                        {
                          backgroundColor: theme.colors.secondaryContainer,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mobileAvatarText,
                          { color: theme.colors.onSecondaryContainer },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View style={styles.mobileIdentityContent}>
                      <Text
                        numberOfLines={1}
                        style={[styles.mobileCardTitle, { color: theme.colors.text }]}
                      >
                        {displayName}
                      </Text>

                      <View style={styles.mobileMetaRow}>
                        <Text
                          numberOfLines={1}
                          style={[styles.mobileCardCode, { color: textSecondary }]}
                        >
                          {displayCode}
                        </Text>

                        <View
                          style={[
                            styles.mobileIdBadge,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                              borderColor: theme.colors.outlineVariant,
                            },
                          ]}
                        >
                          <Text style={[styles.mobileIdBadgeText, { color: theme.colors.primary }]}>
                            ID #{product.id}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <StatusBadge active={product.ativo} />
                  </View>

                  {productDescription ? (
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={[styles.mobileCardDescription, { color: textSecondary }]}
                    >
                      {productDescription}
                    </Text>
                  ) : null}

                  <View style={styles.mobileDetailsRow}>
                    {productColor ? (
                      <View
                        style={[
                          styles.mobileDetailChip,
                          { backgroundColor: theme.colors.surfaceVariant },
                        ]}
                      >
                        <View
                          style={[
                            styles.mobileDetailDot,
                            { backgroundColor: getProductColorHex(productColor) },
                          ]}
                        />
                        <Text style={[styles.mobileDetailChipText, { color: theme.colors.text }]}>
                          {productColor}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.mobileDetailChip,
                        styles.mobileDetailChipMuted,
                        { backgroundColor: withAlpha(theme.colors.outline, 0.08) },
                      ]}
                    >
                      <MaterialCommunityIcons name="refresh" size={12} color={textSecondary} />
                      <Text
                        numberOfLines={1}
                        style={[styles.mobileDetailChipText, { color: textSecondary }]}
                      >
                        {productUpdatedAt}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mobileActionsRow}>
                    {canEditProducts ? (
                      <ListActionButton
                        label="Editar"
                        icon="pencil-outline"
                        onPress={() => handleOpenEdit(product)}
                        disabled={loading || processingStatusId === product.id}
                        compact
                        fill
                      />
                    ) : null}

                    {product.ativo && canInactivateProducts ? (
                      <ListActionButton
                        label="Inativar"
                        icon="toggle-switch-off-outline"
                        onPress={() => handleAskStatusChange(product)}
                        disabled={loading || processingStatusId === product.id}
                        compact
                        fill
                        tone="danger"
                      />
                    ) : null}

                    {!product.ativo && canActivateProducts ? (
                      <ListActionButton
                        label="Ativar"
                        icon="toggle-switch-outline"
                        onPress={() => handleAskStatusChange(product)}
                        disabled={loading || processingStatusId === product.id}
                        compact
                        fill
                        tone="success"
                      />
                    ) : null}
                  </View>
                </Surface>
              );
            })}
          </View>
        ) : (
          <Surface
            style={[
              styles.tableSurface,
              isDesktopWeb ? styles.tableSurfaceWeb : null,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View
              style={[
                styles.tableHeaderRow,
                isDesktopWeb ? styles.tableHeaderRowWeb : null,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderBottomColor: theme.colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.headerCell,
                  styles.statusCell,
                  styles.statusHeadCell,
                  { color: theme.colors.primary },
                ]}
              >
                Status
              </Text>
              <Text style={[styles.headerCell, styles.codeCell, { color: theme.colors.primary }]}>
                Código
              </Text>
              <Text style={[styles.headerCell, styles.nameCell, { color: theme.colors.primary }]}>
                Nome
              </Text>
              <Text
                style={[styles.headerCell, styles.descriptionCell, { color: theme.colors.primary }]}
              >
                Descrição
              </Text>
              <Text
                style={[styles.headerCell, styles.updatedCell, { color: theme.colors.primary }]}
              >
                Atualizado
              </Text>
              <Text
                style={[styles.headerCell, styles.actionsCell, { color: theme.colors.primary }]}
              >
                Ações
              </Text>
            </View>
            {items.map((product, index) => (
              <Pressable
                key={product.id}
                style={(state) => [
                  styles.tableRow,
                  isDesktopWeb ? styles.tableRowWeb : null,
                  Platform.OS === 'web' ? styles.interactiveRow : null,
                  {
                    borderBottomWidth: index === items.length - 1 ? 0 : 1,
                    borderBottomColor: theme.colors.outline,
                    backgroundColor: state.pressed
                      ? theme.colors.surfaceVariant
                      : (state as HoverablePressableState).hovered
                        ? withAlpha(theme.colors.primary, 0.04)
                        : 'transparent',
                  },
                ]}
              >
                <View style={[styles.statusCell, styles.tableStatusWrap]}>
                  <StatusBadge active={product.ativo} />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.bodyCell, styles.codeCell, { color: theme.colors.text }]}
                >
                  {product.codigo?.trim() || '—'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.bodyCell, styles.nameCell, { color: theme.colors.text }]}
                >
                  {product.nome?.trim() || '—'}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.bodyCell, styles.descriptionCell, { color: textSecondary }]}
                >
                  {product.descricao?.trim() || '—'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.bodyCell, styles.updatedCell, { color: textSecondary }]}
                >
                  {formatTimestamp(product.updatedAt ?? product.createdAt)}
                </Text>
                <View style={[styles.actionsCell, styles.desktopActions]}>
                  {canEditProducts ? (
                    <ListActionButton
                      label="Editar"
                      icon="pencil-outline"
                      onPress={() => handleOpenEdit(product)}
                      disabled={loading || processingStatusId === product.id}
                      compact
                    />
                  ) : null}

                  {product.ativo && canInactivateProducts ? (
                    <ListActionButton
                      label="Inativar"
                      icon="toggle-switch-off-outline"
                      onPress={() => handleAskStatusChange(product)}
                      disabled={loading || processingStatusId === product.id}
                      compact
                      tone="danger"
                    />
                  ) : null}

                  {!product.ativo && canActivateProducts ? (
                    <ListActionButton
                      label="Ativar"
                      icon="toggle-switch-outline"
                      onPress={() => handleAskStatusChange(product)}
                      disabled={loading || processingStatusId === product.id}
                      compact
                      tone="success"
                    />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </Surface>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={[styles.root, { backgroundColor: pageBackground }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktopWeb ? styles.scrollContentWeb : null,
          ]}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setOpenFilter(null)}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
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
          >
            <View
              style={[
                listScreenStyles.toolbarTop,
                isMobile ? listScreenStyles.toolbarTopCompact : null,
              ]}
            >
              <View style={listScreenStyles.searchFieldWrap}>
                <AppTextInput
                  label="Buscar produto"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Nome, descrição ou código"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="magnify" />}
                  accessibilityLabel="Buscar produtos"
                />
              </View>

              {canCreateProducts ? (
                <View
                  style={[
                    listScreenStyles.toolbarActions,
                    isMobile ? listScreenStyles.toolbarActionsCompact : null,
                  ]}
                >
                  <ListActionButton
                    label="Novo produto"
                    icon="package-variant-closed-plus"
                    onPress={handleOpenCreate}
                    disabled={savingForm}
                    accessibilityLabel="Abrir cadastro de novo produto"
                  />
                </View>
              ) : null}
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
                  label="Status"
                  value={statusFilter}
                  valueLabel={statusLabel}
                  options={STATUS_OPTIONS.map((option) => ({
                    ...option,
                    accessibilityLabel: `action-products-filter-status-${option.value.toLowerCase()}`,
                  }))}
                  disabled={loading}
                  onSelect={handleStatusFilterChange}
                  compact={isMobile}
                  open={openFilter === 'status'}
                  onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'status' : null)}
                  accessibilityLabel="action-products-filter-status-toggle"
                />

                <FilterSelect
                  label="Tamanho"
                  value={String(size)}
                  valueLabel={sizeLabel}
                  options={PAGE_SIZE_OPTIONS.map((option) => ({
                    ...option,
                    accessibilityLabel: `action-products-filter-size-${option.value}`,
                  }))}
                  disabled={loading}
                  onSelect={handlePageSizeChange}
                  compact={isMobile}
                  open={openFilter === 'size'}
                  onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'size' : null)}
                  accessibilityLabel="action-products-filter-size-toggle"
                />
              </View>

              <View
                style={[
                  listScreenStyles.paginationGroup,
                  isMobile ? listScreenStyles.paginationGroupCompact : null,
                ]}
              >
                <Text style={[listScreenStyles.paginationSummaryText, { color: textSecondary }]}>
                  {totalItems} produto{totalItems === 1 ? '' : 's'}
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
                    onPress={handleGoToPreviousPage}
                    disabled={loading || page <= 0}
                    compact
                  />

                  <Text style={[listScreenStyles.paginationPageLabel, { color: theme.colors.text }]}>
                    Página {Math.min(page + 1, Math.max(totalPages, 1))} de{' '}
                    {Math.max(totalPages, 1)}
                  </Text>

                  <ListActionButton
                    label="Próxima"
                    icon="chevron-right"
                    onPress={handleGoToNextPage}
                    disabled={loading || totalPages === 0 || page + 1 >= totalPages}
                    compact
                  />
                </View>
              </View>
            </View>
          </Surface>

          {renderContent()}
        </ScrollView>
      </View>

      <ProductFormModal
        visible={isFormVisible}
        mode={editingProduct ? 'edit' : 'create'}
        initialProduct={editingProduct}
        saving={savingForm}
        onDismiss={handleCloseForm}
        onSubmit={handleSubmitForm}
      />

      <SharedConfirmStatusDialog
        visible={Boolean(statusConfirmation)}
        title={statusConfirmation?.nextActive ? 'Ativar produto' : 'Inativar produto'}
        description={
          statusConfirmation
            ? `Confirma ${statusConfirmation.nextActive ? 'a ativaÃ§Ã£o' : 'a inativaÃ§Ã£o'} de "${statusConfirmation.product.nome}"?`
            : ''
        }
        confirmLabel={
          statusConfirmation?.nextActive ? 'Confirmar ativaÃ§Ã£o' : 'Confirmar inativaÃ§Ã£o'
        }
        confirmIcon={
          statusConfirmation?.nextActive ? 'check-circle-outline' : 'close-circle-outline'
        }
        confirmTone={statusConfirmation?.nextActive ? 'success' : 'danger'}
        processing={processingStatusId !== null}
        onCancel={handleCancelStatusChange}
        onConfirm={handleConfirmStatusChange}
      />

      <AlertDialog
        visible={feedback.visible}
        message={feedback.message}
        type={feedback.type}
        onDismiss={hideFeedback}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  scrollContentWeb: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  listSection: {
    gap: 12,
  },
  inlineLoading: {
    justifyContent: 'flex-start',
  },
  stateBlock: {
    minHeight: 220,
    justifyContent: 'center',
  },
  retryWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  tableSurface: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  tableSurfaceWeb: {
    borderRadius: 22,
  },
  tableHeaderRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
  },
  tableHeaderRowWeb: {
    minHeight: 56,
    paddingHorizontal: 18,
    gap: 12,
  },
  tableRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  tableRowWeb: {
    minHeight: 66,
    paddingHorizontal: 18,
    gap: 12,
  },
  interactiveRow:
    Platform.OS === 'web'
      ? ({
          transitionProperty: 'background-color',
          transitionDuration: '150ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : ({} as any),
  headerCell: {
    fontSize: 12,
    fontWeight: '800',
  },
  bodyCell: {
    fontSize: 13,
    fontWeight: '700',
  },
  codeCell: {
    flex: 0.95,
  },
  nameCell: {
    flex: 2.2,
  },
  descriptionCell: {
    flex: 2.9,
  },
  metaCell: {
    flex: 1,
  },
  statusCell: {
    width: 120,
    minWidth: 120,
    maxWidth: 120,
  },
  statusHeadCell: {
    //textAlign: 'center',
  },
  updatedCell: {
    flex: 1,
  },
  actionsCell: {
    flex: IS_WEB ? 1.55 : 1.45,
    textAlign: 'center',
  },
  actionsHeadCol: {},
  tableStatusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: IS_WEB ? 6 : 8,
    flexWrap: IS_WEB ? 'nowrap' : 'wrap',
  },
  cardList: {
    gap: 12,
  },
  mobileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mobileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mobileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mobileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mobileIdentityContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  mobileCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  mobileCardCode: {
    fontSize: 12,
    fontWeight: '600',
  },
  mobileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mobileIdBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  mobileIdBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mobileFactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  mobileFactPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  mobileFactText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mobileTagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mobileDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mobileDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
  },
  mobileDetailChipMuted: {},
  mobileDetailChipText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  mobileDetailDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  mobileCardDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  mobileMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileMetaItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    gap: 4,
    flexBasis: '47%',
  },
  mobileMetaItemFull: {
    flexBasis: '100%',
  },
  mobileMetaLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mobileMetaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  mobileActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  confirmModalOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  confirmModalSurface: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  confirmDescription: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  confirmActionsCompact: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
});
