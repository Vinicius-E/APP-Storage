import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Modal, Portal, Surface, Text, TextInput } from 'react-native-paper';
import AlertDialog from '../../components/AlertDialog';
import AppEmptyState from '../../components/AppEmptyState';
import SharedConfirmStatusDialog from '../../components/ConfirmStatusDialog';
import FilterSelect from '../../components/FilterSelect';
import AppLoadingState from '../../components/AppLoadingState';
import AppTextInput from '../../components/AppTextInput';
import ListActionButton from '../../components/ListActionButton';
import StatusBadge from '../../components/StatusBadge';
import { useAppScreenScrollableLayout } from '../../hooks/useAppScreenScrollableLayout';
import { SCREEN_LABELS, usePermissions } from '../../security/permissions';
import listScreenStyles from '../../styles/listScreen';
import { useThemeContext } from '../../theme/ThemeContext';
import { ProfileDTO, ProfileUpsertRequest, ProfileType, ScreenKey } from '../../types/ProfileDTO';
import { getUserFacingErrorMessage } from '../../utils/userFacingError';
import {
  activateProfile,
  createProfile,
  inactivateProfile,
  listProfiles,
  updateProfile,
} from '../../services/profileApi';
import ProfileFormModal from './components/ProfileFormModal';

type SelectOption = {
  value: string;
  label: string;
};

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

type StatusConfirmation = {
  profile: ProfileDTO;
  nextActive: boolean;
};

type FeedbackState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 / página' },
  { value: '20', label: '20 / página' },
  { value: '50', label: '50 / página' },
];
const TYPE_LABELS: Record<ProfileType, string> = {
  FULL_ACCESS: 'Acesso total',
  READ_ONLY: 'Leitura',
};

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
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('pt-BR');
}

function summarizeAllowedScreens(screens: ScreenKey[]): string {
  if (screens.length === 0) {
    return 'Nenhuma tela';
  }

  const labels = screens.map((screenKey) => SCREEN_LABELS[screenKey]);
  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
}

function listAllowedScreens(screens: ScreenKey[]): string {
  if (screens.length === 0) {
    return 'Nenhuma permissão';
  }

  return screens.map((screenKey) => SCREEN_LABELS[screenKey]).join(', ');
}

function getInitials(value?: string, fallback = 'PF'): string {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9\s]+/g, ' ');

  if (!normalized) {
    return fallback;
  }

  const chunks = normalized.split(/\s+/).filter(Boolean);
  const first = chunks[0]?.slice(0, 1) ?? '';
  const second =
    chunks.length > 1
      ? (chunks[chunks.length - 1]?.slice(0, 1) ?? '')
      : (chunks[0]?.slice(1, 2) ?? '');
  const initials = `${first}${second}`.toUpperCase();

  return initials || fallback;
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
            {target?.nextActive ? 'Ativar perfil' : 'Inativar perfil'}
          </Text>
          <Text style={[styles.confirmDescription, { color: theme.colors.onSurfaceVariant }]}>
            {target
              ? `Confirma ${target.nextActive ? 'a ativação' : 'a inativação'} de "${target.profile.description}"?`
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

export default function ProfileManagement() {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const profileScrollableLayout = useAppScreenScrollableLayout(16);
  const { hasPermission } = usePermissions();
  const isMobile = width < 920;
  const [items, setItems] = useState<ProfileDTO[]>([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [openFilter, setOpenFilter] = useState<'size' | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileDTO | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [statusConfirmation, setStatusConfirmation] = useState<StatusConfirmation | null>(null);
  const [processingStatusId, setProcessingStatusId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;

  const canCreateProfiles = hasPermission('PROFILES', 'CREATE');
  const canEditProfiles = hasPermission('PROFILES', 'EDIT');
  const canActivateProfiles = hasPermission('PROFILES', 'ACTIVATE');
  const canInactivateProfiles = hasPermission('PROFILES', 'INACTIVATE');
  const hasActiveFilters = debouncedSearch.length > 0;

  const showSuccessFeedback = useCallback((message: string) => {
    setFeedback({
      visible: true,
      message,
      type: 'success',
    });
  }, []);

  const showErrorFeedback = useCallback((message: string) => {
    setFeedback({
      visible: true,
      message,
      type: 'error',
    });
  }, []);

  const hideFeedback = useCallback(() => {
    setFeedback((current) => ({ ...current, visible: false }));
  }, []);

  const fetchProfiles = useCallback(
    async (targetPage = page, refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await listProfiles({
          page: targetPage,
          size,
          search: debouncedSearch,
        });

        setItems(Array.isArray(response.items) ? response.items : []);
        setPage(Number.isFinite(response.page) ? Math.max(response.page, 0) : targetPage);
        setTotalItems(Number.isFinite(response.totalItems) ? Math.max(response.totalItems, 0) : 0);
        setTotalPages(Number.isFinite(response.totalPages) ? Math.max(response.totalPages, 0) : 0);
      } catch (requestError) {
        const message = resolveRequestErrorMessage(
          requestError,
          'Não foi possível carregar os perfis.'
        );

        setItems([]);
        setTotalItems(0);
        setTotalPages(0);
        setError(message);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, page, size]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0);
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    void fetchProfiles(page);
  }, [fetchProfiles, page]);

  const handleOpenCreate = () => {
    if (!canCreateProfiles) {
      return;
    }

    setEditingProfile(null);
    setIsFormVisible(true);
  };

  const handleOpenEdit = (profile: ProfileDTO) => {
    if (!canEditProfiles) {
      return;
    }

    setEditingProfile(profile);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    if (savingForm) {
      return;
    }

    setIsFormVisible(false);
    setEditingProfile(null);
  };

  const handleSubmitForm = async (payload: ProfileUpsertRequest) => {
    try {
      setSavingForm(true);

      if (editingProfile) {
        await updateProfile(editingProfile.id, payload);
        showSuccessFeedback('Perfil atualizado com sucesso.');
      } else {
        await createProfile(payload);
        showSuccessFeedback('Perfil criado com sucesso.');
      }

      setIsFormVisible(false);
      setEditingProfile(null);
      await fetchProfiles(page);
    } catch (requestError) {
      showErrorFeedback(
        resolveRequestErrorMessage(
          requestError,
          editingProfile
            ? 'Não foi possível atualizar o perfil.'
            : 'Não foi possível criar o perfil.'
        )
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleAskStatusChange = (profile: ProfileDTO) => {
    const nextActive = !(profile.active !== false);
    if (nextActive && !canActivateProfiles) {
      return;
    }
    if (!nextActive && !canInactivateProfiles) {
      return;
    }

    setStatusConfirmation({
      profile,
      nextActive,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmation) {
      return;
    }

    try {
      setProcessingStatusId(statusConfirmation.profile.id);

      if (statusConfirmation.nextActive) {
        await activateProfile(statusConfirmation.profile.id);
        showSuccessFeedback('Perfil ativado com sucesso.');
      } else {
        await inactivateProfile(statusConfirmation.profile.id);
        showSuccessFeedback('Perfil inativado com sucesso.');
      }

      setStatusConfirmation(null);
      await fetchProfiles(page);
    } catch (requestError) {
      showErrorFeedback(
        resolveRequestErrorMessage(
          requestError,
          statusConfirmation.nextActive
            ? 'Não foi possível ativar o perfil.'
            : 'Não foi possível inativar o perfil.'
        )
      );
    } finally {
      setProcessingStatusId(null);
    }
  };

  const sizeLabel = useMemo(
    () =>
      PAGE_SIZE_OPTIONS.find((option) => Number(option.value) === size)?.label ??
      `${size} / página`,
    [size]
  );

  const renderContent = () => {
    if (loading && items.length === 0) {
      return <AppLoadingState message="Carregando perfis..." style={styles.stateBlock} />;
    }

    if (error && items.length === 0) {
      return (
        <View style={styles.stateBlock}>
          <AppEmptyState
            title="Não foi possível carregar os perfis"
            description="Verifique sua conexão e tente novamente."
            icon="alert-circle-outline"
            tone="error"
            onRetry={() => void fetchProfiles(page)}
            style={styles.stateBlock}
          />
        </View>
      );
    }

    if (!loading && items.length === 0) {
      return (
        <AppEmptyState
          title={hasActiveFilters ? 'Nenhum perfil encontrado' : 'Nenhum perfil cadastrado'}
          description={
            hasActiveFilters
              ? 'Tente ajustar a busca para encontrar resultados.'
              : "Clique em 'Novo perfil' para começar."
          }
          icon={hasActiveFilters ? 'account-search-outline' : 'account-plus-outline'}
          tipo={hasActiveFilters ? 'semResultado' : 'vazio'}
          style={styles.stateBlock}
        />
      );
    }

    if (isMobile) {
      return (
        <View style={styles.cardList}>
          {items.map((profile) => {
            const isActive = profile.active !== false;
            const initials = getInitials(profile.description);
            const allowedScreensLabel = listAllowedScreens(profile.allowedScreens);

            return (
              <Surface
                key={profile.id}
                style={[
                  styles.mobileCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.mobileIdentityRow}>
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
                    <Text style={[styles.mobileCardTitle, { color: theme.colors.text }]}>
                      {profile.description}
                    </Text>
                    <Text style={[styles.mobileCardMeta, { color: textSecondary }]}>
                      {TYPE_LABELS[profile.type]}
                    </Text>

                    <View style={styles.mobileFactRow}>
                      <View
                        style={[
                          styles.mobileFactPill,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Text style={[styles.mobileFactText, { color: textSecondary }]}>
                          ID #{profile.id}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.mobileTagRow}>
                  <StatusBadge active={isActive} />
                </View>

                <View style={styles.mobileMetaGrid}>
                  <View style={[styles.mobileMetaItem, styles.mobileMetaItemFull]}>
                    <Text style={[styles.mobileMetaLabel, { color: textSecondary }]}>
                      Permissões
                    </Text>
                    <Text style={[styles.mobileMetaValue, { color: theme.colors.text }]}>
                      {allowedScreensLabel}
                    </Text>
                  </View>

                  <View style={[styles.mobileMetaItem, styles.mobileMetaItemFull]}>
                    <Text style={[styles.mobileMetaLabel, { color: textSecondary }]}>
                      Atualizado em
                    </Text>
                    <Text style={[styles.mobileMetaValue, { color: theme.colors.text }]}>
                      {formatTimestamp(profile.updatedAt ?? profile.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.mobileActionsRow}>
                  {canEditProfiles ? (
                    <ListActionButton
                      label="Editar"
                      icon="pencil-outline"
                      onPress={() => handleOpenEdit(profile)}
                      disabled={loading || processingStatusId === profile.id}
                      compact
                      fill
                    />
                  ) : null}

                  {isActive && canInactivateProfiles ? (
                    <ListActionButton
                      label="Inativar"
                      icon="toggle-switch-off-outline"
                      onPress={() => handleAskStatusChange(profile)}
                      disabled={loading || processingStatusId === profile.id}
                      compact
                      fill
                      tone="danger"
                    />
                  ) : null}

                  {!isActive && canActivateProfiles ? (
                    <ListActionButton
                      label="Ativar"
                      icon="toggle-switch-outline"
                      onPress={() => handleAskStatusChange(profile)}
                      disabled={loading || processingStatusId === profile.id}
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
      );
    }

    return (
      <Surface
        style={[
          styles.tableSurface,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View
          style={[
            styles.tableHeaderRow,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderBottomColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.headerCell, styles.statusCell, { color: theme.colors.primary }]}>
            Status
          </Text>
          <Text
            style={[styles.headerCell, styles.descriptionCell, { color: theme.colors.primary }]}
          >
            Descrição
          </Text>
          <Text style={[styles.headerCell, styles.typeCell, { color: theme.colors.primary }]}>
            Tipo
          </Text>
          <Text style={[styles.headerCell, styles.screensCell, { color: theme.colors.primary }]}>
            Telas permitidas
          </Text>
          <Text style={[styles.headerCell, styles.updatedCell, { color: theme.colors.primary }]}>
            Atualizado
          </Text>
          <Text style={[styles.headerCell, styles.actionsCell, { color: theme.colors.primary }]}>
            Ações
          </Text>
        </View>

        {items.map((profile, index) => {
          const isActive = profile.active !== false;

          return (
            <Pressable
              key={profile.id}
              style={(state) => [
                styles.tableRow,
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
                <StatusBadge active={isActive} />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.bodyCell, styles.descriptionCell, { color: theme.colors.text }]}
              >
                {profile.description}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.bodyCell, styles.typeCell, { color: theme.colors.text }]}
              >
                {TYPE_LABELS[profile.type]}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.bodyCell, styles.screensCell, { color: textSecondary }]}
              >
                {summarizeAllowedScreens(profile.allowedScreens)}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.bodyCell, styles.updatedCell, { color: textSecondary }]}
              >
                {formatTimestamp(profile.updatedAt ?? profile.createdAt)}
              </Text>
              <View style={[styles.actionsCell, styles.desktopActions]}>
                {canEditProfiles ? (
                  <ListActionButton
                    label="Editar"
                    icon="pencil-outline"
                    onPress={() => handleOpenEdit(profile)}
                    disabled={loading || processingStatusId === profile.id}
                    compact
                  />
                ) : null}

                {isActive && canInactivateProfiles ? (
                  <ListActionButton
                    label="Inativar"
                    icon="toggle-switch-off-outline"
                    onPress={() => handleAskStatusChange(profile)}
                    disabled={loading || processingStatusId === profile.id}
                    compact
                    tone="danger"
                  />
                ) : null}

                {!isActive && canActivateProfiles ? (
                  <ListActionButton
                    label="Ativar"
                    icon="toggle-switch-outline"
                    onPress={() => handleAskStatusChange(profile)}
                    disabled={loading || processingStatusId === profile.id}
                    compact
                    tone="success"
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </Surface>
    );
  };

  return (
    <>
      <View style={[styles.root, { backgroundColor: pageBackground }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            profileScrollableLayout.contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setOpenFilter(null)}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void fetchProfiles(page, true)}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          {...profileScrollableLayout.scrollViewProps}
        >
          <Surface
            style={[
              listScreenStyles.toolbarSurface,
              openFilter ? listScreenStyles.toolbarSurfaceRaised : null,
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
                  label="Buscar perfil"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Descrição do perfil"
                  autoCapitalize="none"
                  autoCorrect={false}
                  left={<TextInput.Icon icon="magnify" />}
                  accessibilityLabel="Buscar perfis"
                />
              </View>

              {canCreateProfiles ? (
                <View
                  style={[
                    listScreenStyles.toolbarActions,
                    isMobile ? listScreenStyles.toolbarActionsCompact : null,
                  ]}
                >
                  <ListActionButton
                    label="Novo perfil"
                    icon="account-plus-outline"
                    onPress={handleOpenCreate}
                    disabled={savingForm}
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
                  label="Tamanho"
                  value={String(size)}
                  valueLabel={sizeLabel}
                  options={PAGE_SIZE_OPTIONS.map((option) => ({
                    ...option,
                    accessibilityLabel: `action-profiles-filter-size-${option.value}`,
                  }))}
                  disabled={loading}
                  compact={isMobile}
                  open={openFilter === 'size'}
                  onOpenChange={(nextOpen) => setOpenFilter(nextOpen ? 'size' : null)}
                  accessibilityLabel="action-profiles-filter-size-toggle"
                  onSelect={(value) => {
                    const nextSize = Number(value);
                    if (!Number.isFinite(nextSize) || nextSize <= 0) {
                      return;
                    }

                    setSize(nextSize);
                    setPage(0);
                  }}
                />
              </View>

              <View
                style={[
                  listScreenStyles.paginationGroup,
                  isMobile ? listScreenStyles.paginationGroupCompact : null,
                ]}
              >
                <Text style={[listScreenStyles.paginationSummaryText, { color: textSecondary }]}>
                  {totalItems} perfil{totalItems === 1 ? '' : 'is'}
                </Text>

                <View style={listScreenStyles.paginationControls}>
                  <ListActionButton
                    label="Anterior"
                    icon="chevron-left"
                    onPress={() => setPage((current) => Math.max(current - 1, 0))}
                    disabled={loading || page <= 0}
                    compact
                  />

                  <Text
                    style={[listScreenStyles.paginationPageLabel, { color: theme.colors.text }]}
                  >
                    Página {Math.min(page + 1, Math.max(totalPages, 1))} de{' '}
                    {Math.max(totalPages, 1)}
                  </Text>

                  <ListActionButton
                    label="Próxima"
                    icon="chevron-right"
                    onPress={() => setPage((current) => current + 1)}
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

      <ProfileFormModal
        visible={isFormVisible}
        mode={editingProfile ? 'edit' : 'create'}
        initialProfile={editingProfile}
        saving={savingForm}
        canSubmit={editingProfile ? canEditProfiles : canCreateProfiles}
        onDismiss={handleCloseForm}
        onSubmit={handleSubmitForm}
      />

      <SharedConfirmStatusDialog
        visible={Boolean(statusConfirmation)}
        title={statusConfirmation?.nextActive ? 'Ativar perfil' : 'Inativar perfil'}
        description={
          statusConfirmation
            ? `Confirma ${statusConfirmation.nextActive ? 'a ativação' : 'a inativação'} de "${statusConfirmation.profile.description}"?`
            : ''
        }
        confirmLabel={'Confirmar'}
        confirmIcon={
          statusConfirmation?.nextActive ? 'check-circle-outline' : 'close-circle-outline'
        }
        confirmTone={statusConfirmation?.nextActive ? 'success' : 'danger'}
        processing={processingStatusId !== null}
        onCancel={() =>
          setStatusConfirmation((current) => (processingStatusId !== null ? current : null))
        }
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
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    /* paddingHorizontal: 16,
    paddingVertical: 16, */
    gap: 14,
  },
  stateBlock: {
    minHeight: 220,
    justifyContent: 'center',
  },
  retryWrap: {
    marginTop: 16,
    alignItems: 'center',
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
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  mobileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mobileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  mobileIdentityContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  mobileCardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  mobileCardMeta: {
    fontSize: 13,
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
  mobileMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileMetaItem: {
    flex: 1,
    minWidth: 0,
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
    lineHeight: 18,
  },
  mobileActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
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
  tableHeaderRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
  },
  tableRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
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
  descriptionCell: {
    flex: 1.5,
  },
  typeCell: {
    flex: 1,
  },
  screensCell: {
    flex: 1.8,
  },
  statusCell: {
    flex: 0.9,
  },
  updatedCell: {
    flex: 1.2,
  },
  actionsCell: {
    flex: 1.45,
  },
  tableStatusWrap: {
    justifyContent: 'center',
  },
  desktopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
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
