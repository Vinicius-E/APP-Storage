import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
} from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import { useAreaContext } from '../../areas/AreaContext';
import AlertDialog from '../../components/AlertDialog';
import AppEmptyState from '../../components/AppEmptyState';
import AppLoadingState from '../../components/AppLoadingState';
import ConfirmStatusDialog from '../../components/ConfirmStatusDialog';
import FormModalFrame from '../../components/FormModalFrame';
import ListActionButton from '../../components/ListActionButton';
import ListPaginationControls from '../../components/ListPaginationControls';
import StatusBadge from '../../components/StatusBadge';
import AppTextInput from '../../components/AppTextInput';
import {
  activateArea,
  createArea,
  inactivateArea,
  listAreas,
  updateArea,
} from '../../services/areaApi';
import { usePermissions } from '../../security/permissions';
import listScreenStyles from '../../styles/listScreen';
import { useThemeContext } from '../../theme/ThemeContext';
import { AreaDTO } from '../../types/Area';
import { getUserFacingErrorMessage } from '../../utils/userFacingError';

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

type StatusConfirmation = {
  area: AreaDTO;
  nextActive: boolean;
};

type FeedbackState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

function errorMessage(error: unknown, fallback: string) {
  return getUserFacingErrorMessage(error, fallback);
}

function hasUsefulTimestamp(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return normalized !== '' && normalized !== '-';
}

function formatTimestamp(value?: string | null) {
  if (!hasUsefulTimestamp(value)) {
    return '';
  }

  const normalized = String(value).trim();
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? normalized : date.toLocaleString('pt-BR');
}

function getInitials(value?: string, fallback = 'ST') {
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

export default function AreaManagement({ navigation }: { navigation: any }) {
  const { theme } = useThemeContext();
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const { width } = useWindowDimensions();
  const { selectedAreaId, refreshAreas, selectAreaById } = useAreaContext();
  const { hasPermission } = usePermissions();
  const isMobile = width < 920;
  const hasWideActions = width >= 1180;
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;
  const [items, setItems] = useState<AreaDTO[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaDTO | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusConfirmation, setStatusConfirmation] = useState<StatusConfirmation | null>(null);
  const [processingStatusId, setProcessingStatusId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const canCreate = hasPermission('WAREHOUSE', 'CREATE');
  const canEdit = hasPermission('WAREHOUSE', 'EDIT');
  const canToggle = hasPermission('WAREHOUSE', 'ACTIVATE');
  const canViewWarehouse = hasPermission('WAREHOUSE', 'VIEW');

  const showSuccessFeedback = useCallback((message: string) => {
    setFeedback({ visible: true, message, type: 'success' });
  }, []);

  const showErrorFeedback = useCallback((message: string) => {
    setFeedback({ visible: true, message, type: 'error' });
  }, []);

  const hideFeedback = useCallback(() => {
    setFeedback((current) => ({ ...current, visible: false }));
  }, []);

  const fetchAreas = useCallback(
    async (targetPage = page, isRefresh = false, searchValue = appliedSearch) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const response = await listAreas({ page: targetPage, size: 10, search: searchValue });
        setItems(Array.isArray(response.items) ? response.items : []);
        setPage(Number.isFinite(response.page) ? Math.max(response.page, 0) : targetPage);
        setTotalItems(Number.isFinite(response.totalItems) ? Math.max(response.totalItems, 0) : 0);
        setTotalPages(Number.isFinite(response.totalPages) ? Math.max(response.totalPages, 0) : 0);
      } catch (requestError) {
        const message = errorMessage(requestError, 'Não foi possível carregar os setores.');
        setItems([]);
        setTotalItems(0);
        setTotalPages(0);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedSearch, page]
  );

  useEffect(() => {
    void fetchAreas(page, false, appliedSearch);
  }, [appliedSearch, fetchAreas, page]);

  const applySearch = useCallback(() => {
    const nextSearch = search.trim();

    if (nextSearch === appliedSearch) {
      if (page === 0) {
        void fetchAreas(0, false, nextSearch);
        return;
      }

      setPage(0);
      return;
    }

    if (page !== 0) {
      setPage(0);
    }

    setAppliedSearch(nextSearch);
  }, [appliedSearch, fetchAreas, page, search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (value.trim() === '' && appliedSearch !== '') {
        if (page !== 0) {
          setPage(0);
        }
        setAppliedSearch('');
      }
    },
    [appliedSearch, page]
  );

  const openForm = (area?: AreaDTO) => {
    if (area && !canEdit) return;
    if (!area && !canCreate) return;
    setEditingArea(area ?? null);
    setDraftName(area?.name ?? '');
    setDraftDescription(area?.description ?? '');
    setFormVisible(true);
  };

  const submitForm = async () => {
    const name = draftName.trim();
    if (!name) return;
    try {
      setSaving(true);
      if (editingArea) {
        await updateArea(editingArea.id, {
          nome: name,
          descricao: draftDescription.trim() || undefined,
          ativo: editingArea.active,
        });
        showSuccessFeedback('Setor atualizado com sucesso.');
      } else {
        await createArea({
          nome: name,
          descricao: draftDescription.trim() || undefined,
          ativo: true,
        });
        showSuccessFeedback('Setor criado com sucesso.');
      }
      setFormVisible(false);
      setEditingArea(null);
      await refreshAreas();
      await fetchAreas(page);
    } catch (requestError) {
      showErrorFeedback(
        errorMessage(
          requestError,
          editingArea ? 'Não foi possível atualizar o setor.' : 'Não foi possível criar o setor.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmToggleLegacy = (area: AreaDTO) => {
    if (!canToggle) return;
    const nextActive = area.active === false;
    Alert.alert(
      nextActive ? 'Ativar setor' : 'Inativar setor',
      `Confirma ${nextActive ? 'a ativação' : 'a inativação'} de "${area.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              if (nextActive) await activateArea(area.id);
              else await inactivateArea(area.id);
              showSuccessFeedback(
                nextActive ? 'Setor ativado com sucesso.' : 'Setor inativado com sucesso.'
              );
              await refreshAreas(area.id);
              await fetchAreas(page);
            } catch (requestError) {
              showErrorFeedback(
                errorMessage(requestError, 'Não foi possível atualizar o status do setor.')
              );
            }
          },
        },
      ]
    );
  };

  const confirmToggle = (area: AreaDTO) => {
    if (!canToggle) return;
    setStatusConfirmation({
      area,
      nextActive: area.active === false,
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

    const { area, nextActive } = statusConfirmation;

    try {
      setProcessingStatusId(area.id);

      if (nextActive) {
        await activateArea(area.id);
      } else {
        await inactivateArea(area.id);
      }

      showSuccessFeedback(
        nextActive ? 'Setor ativado com sucesso.' : 'Setor inativado com sucesso.'
      );
      setStatusConfirmation(null);
      await refreshAreas(area.id);
      await fetchAreas(page);
    } catch (requestError) {
      showErrorFeedback(
        errorMessage(requestError, 'Não foi possível atualizar o status do setor.')
      );
    } finally {
      setProcessingStatusId(null);
    }
  };

  const openWarehouse = async (area: AreaDTO) => {
    if (!canViewWarehouse) return;
    await selectAreaById(area.id);
    navigation.navigate('Armazém');
  };

  const renderActions = (area: AreaDTO, hasUpdatedAt = false) => {
    const isSelected = selectedAreaId === area.id;
    const hasAnyAction = canViewWarehouse || canEdit || canToggle;

    if (!hasAnyAction) {
      return null;
    }

    if (isMobile) {
      return (
        <View style={[styles.mobileActions, !hasUpdatedAt && styles.mobileActionsWithoutTimestamp]}>
          {canViewWarehouse ? (
            <ListActionButton
              label="Abrir"
              icon="warehouse"
              onPress={() => {
                void openWarehouse(area);
              }}
              style={styles.mobilePrimaryAction}
            />
          ) : null}

          <View style={styles.mobileSecondaryActions}>
            {canEdit ? (
              <ListActionButton
                label="Editar"
                icon="pencil-outline"
                onPress={() => openForm(area)}
                compact
                fill
                style={styles.mobileSecondaryAction}
              />
            ) : null}
            {canToggle ? (
              <ListActionButton
                label={area.active === false ? 'Ativar' : 'Inativar'}
                icon={area.active === false ? 'toggle-switch-outline' : 'toggle-switch-off-outline'}
                onPress={() => confirmToggle(area)}
                compact
                fill
                style={styles.mobileSecondaryAction}
                tone={area.active === false ? 'success' : 'danger'}
              />
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.actions, hasWideActions && styles.actionsDesktop]}>
        {canViewWarehouse ? (
          <View style={styles.openAreaGroup}>
            {isSelected ? (
              <View
                style={[
                  styles.selectedBadge,
                  {
                    backgroundColor: `${theme.colors.primary}14`,
                    borderColor: `${theme.colors.primary}44`,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Selecionado</Text>
              </View>
            ) : null}

            <ListActionButton
              label="Abrir"
              icon="warehouse"
              onPress={() => {
                void openWarehouse(area);
              }}
              compact
            />
          </View>
        ) : null}
        {canEdit ? (
          <ListActionButton
            label="Editar"
            icon="pencil-outline"
            onPress={() => openForm(area)}
            compact
          />
        ) : null}
        {canToggle ? (
          <ListActionButton
            label={area.active === false ? 'Ativar' : 'Inativar'}
            icon={area.active === false ? 'toggle-switch-outline' : 'toggle-switch-off-outline'}
            onPress={() => confirmToggle(area)}
            compact
            tone={area.active === false ? 'success' : 'danger'}
          />
        ) : null}
      </View>
    );
  };

  const renderContent = () => {
    if (loading && items.length === 0)
      return <AppLoadingState message="Carregando setores..." style={styles.stateBlock} />;
    if (error && items.length === 0) {
      return (
        <AppEmptyState
          title="Não foi possível carregar os setores"
          description="Verifique sua conexão e tente novamente."
          icon="alert-circle-outline"
          tone="error"
          onRetry={() => void fetchAreas(page)}
          style={styles.stateBlock}
        />
      );
    }
    if (!loading && items.length === 0) {
      return (
        <AppEmptyState
          title={appliedSearch ? 'Nenhum setor encontrado' : 'Nenhum setor cadastrado'}
          description={
            appliedSearch
              ? 'Tente buscar por outro nome de setor.'
              : "Clique em 'Novo setor' para começar."
          }
          icon={appliedSearch ? 'magnify' : 'warehouse'}
          tipo={appliedSearch ? 'semResultado' : 'vazio'}
          style={styles.stateBlock}
        />
      );
    }
    if (isMobile) {
      return (
        <View style={styles.cards}>
          {items.map((area) => {
            const isSelected = selectedAreaId === area.id;
            const initials = getInitials(area.name);
            const hasUpdatedAt = hasUsefulTimestamp(area.updatedAt);
            const formattedUpdatedAt = hasUpdatedAt ? formatTimestamp(area.updatedAt) : '';

            return (
              <Surface
                key={area.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.cardIdentityRow}>
                  <View
                    style={[
                      styles.cardAvatar,
                      {
                        backgroundColor: theme.colors.secondaryContainer,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.cardAvatarText, { color: theme.colors.onSecondaryContainer }]}
                    >
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.cardIdentityContent}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                      {area.name}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                      {area.description?.trim() || 'Sem descrição'}
                    </Text>

                    <View style={styles.cardFactsRow}>
                      <View
                        style={[
                          styles.cardFactPill,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.cardFactText, { color: theme.colors.onSurfaceVariant }]}
                        >
                          ID #{area.id}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.cardTagsRow, styles.cardTagsRowCompact]}>
                  <StatusBadge active={area.active !== false} style={styles.statusBadgeCompact} />

                  {isSelected ? (
                    <View
                      style={[
                        styles.selectedBadge,
                        styles.selectedBadgeCompact,
                        {
                          backgroundColor: `${theme.colors.primary}14`,
                          borderColor: `${theme.colors.primary}44`,
                        },
                      ]}
                    >
                      <Text style={[styles.selectedBadgeText, { color: theme.colors.primary }]}>
                        Selecionado
                      </Text>
                    </View>
                  ) : null}
                </View>

                {renderActions(area)}
              </Surface>
            );
          })}
        </View>
      );
    }
    return (
      <Surface
        style={[
          styles.table,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
      >
        <View style={[styles.row, styles.head, { borderBottomColor: theme.colors.outline }]}>
          <Text style={[styles.headText, styles.statusCol, { color: theme.colors.primary }]}>
            Status
          </Text>
          <Text style={[styles.headText, styles.nameCol, { color: theme.colors.primary }]}>
            Nome
          </Text>
          <Text style={[styles.headText, styles.descCol, { color: theme.colors.primary }]}>
            Descrição
          </Text>
          <Text style={[styles.headText, styles.actionsHeadCol, { color: theme.colors.primary }]}>
            Ações
          </Text>
        </View>
        {items.map((area, index) => (
          <Pressable
            key={area.id}
            style={(state) => [
              styles.row,
              {
                borderBottomWidth: index === items.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.outline,
                backgroundColor: state.pressed
                  ? theme.colors.surfaceVariant
                  : (state as HoverablePressableState).hovered
                    ? `${theme.colors.primary}0A`
                    : 'transparent',
              },
            ]}
          >
            <View style={[styles.statusCol, styles.statusBadgeWrap]}>
              <StatusBadge active={area.active !== false} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.cellText, styles.nameCol, { color: theme.colors.text }]}
            >
              {area.name}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.cellText, styles.descCol, { color: theme.colors.onSurfaceVariant }]}
            >
              {area.description?.trim() || '-'}
            </Text>
            <View style={styles.actionsCol}>{renderActions(area)}</View>
          </Pressable>
        ))}
      </Surface>
    );
  };

  return (
    <>
      <View style={[styles.root, { backgroundColor: pageBackground }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchAreas(page, true);
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          <Surface
            style={[
              listScreenStyles.toolbarSurface,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
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
                  label="Buscar setor"
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Nome ou descrição"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onKeyPress={(event) => {
                    if (
                      (event as { nativeEvent?: { key?: string } }).nativeEvent?.key === 'Enter'
                    ) {
                      applySearch();
                    }
                  }}
                  onSubmitEditing={() => {
                    applySearch();
                  }}
                  left={
                    <TextInput.Icon
                      icon="magnify"
                      forceTextInputFocus={false}
                      onPress={() => {
                        applySearch();
                      }}
                    />
                  }
                />
              </View>
              {canCreate ? (
                <View
                  style={[
                    listScreenStyles.toolbarActions,
                    isMobile ? listScreenStyles.toolbarActionsCompact : null,
                  ]}
                >
                  <ListActionButton
                    label="Novo setor"
                    icon="plus-circle-outline"
                    onPress={() => openForm()}
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
              <ListPaginationControls
                summary={`${totalItems} setor${totalItems === 1 ? '' : 'es'}`}
                page={page}
                totalPages={totalPages}
                onPrevious={() => setPage((current) => Math.max(current - 1, 0))}
                onNext={() => setPage((current) => current + 1)}
                previousDisabled={loading || page <= 0}
                nextDisabled={loading || totalPages === 0 || page + 1 >= totalPages}
                compact={isMobile}
                textColor={theme.colors.text}
                textSecondary={textSecondary}
              />
            </View>
          </Surface>
          {renderContent()}
        </ScrollView>
      </View>
      <FormModalFrame
        visible={formVisible}
        saving={saving}
        title={editingArea ? 'Editar setor' : 'Novo setor'}
        subtitle="Cadastre ou ajuste os dados do setor selecionado."
        primaryActionLabel={editingArea ? 'Salvar setor' : 'Criar setor'}
        primaryActionDisabled={saving || draftName.trim().length === 0}
        onDismiss={() => {
          setFormVisible(false);
          setEditingArea(null);
        }}
        onPrimaryPress={() => {
          void submitForm();
        }}
        maxWidth={560}
      >
        <AppTextInput
          label="Nome"
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Ex.: Setor Principal"
        />
        <AppTextInput
          label="Descrição"
          value={draftDescription}
          onChangeText={setDraftDescription}
          placeholder="Descrição opcional"
          multiline
          numberOfLines={3}
          contentStyle={styles.textArea}
        />
      </FormModalFrame>

      <ConfirmStatusDialog
        visible={Boolean(statusConfirmation)}
        title={statusConfirmation?.nextActive ? 'Ativar setor' : 'Inativar setor'}
        description={
          statusConfirmation
            ? `Confirma ${statusConfirmation.nextActive ? 'a ativação' : 'a inativação'} de "${statusConfirmation.area.name}"?`
            : ''
        }
        confirmLabel={
          statusConfirmation?.nextActive ? 'Confirmar ativação' : 'Confirmar inativação'
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
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24, gap: 14 },
  stateBlock: { minHeight: 220, justifyContent: 'center' },
  cards: { gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  cardIdentityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardAvatarText: { fontSize: 15, fontWeight: '800' },
  cardIdentityContent: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  cardSubtitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  cardFactsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardFactPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardFactText: { fontSize: 11, fontWeight: '700' },
  cardTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardTagsRowCompact: { alignItems: 'center', gap: 6 },
  statusBadgeCompact: { paddingHorizontal: 9, paddingVertical: 3 },
  updatedContainer: { gap: 2 },
  updatedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  updatedValue: { fontSize: 12, fontWeight: '700' },
  table: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  head: { minHeight: 50, borderBottomWidth: 1 },
  headText: { fontSize: 12, fontWeight: '800' },
  cellText: { fontSize: 13, fontWeight: '700' },
  nameCol: { flex: 1.2 },
  descCol: { flex: 2.4 },
  statusCol: { flex: 0.8 },
  statusBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsHeadCol: { flex: 2.2, textAlign: 'center' },
  actionsCol: { flex: 2.2, justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionsDesktop: { flexWrap: 'nowrap', gap: 6 },
  mobileActions: { marginTop: 8, gap: 8, alignItems: 'stretch' },
  mobileActionsWithoutTimestamp: { marginTop: 6 },
  mobilePrimaryAction: { width: '100%', minHeight: 44 },
  mobileSecondaryActions: { flexDirection: 'row', gap: 8, width: '100%' },
  mobileSecondaryAction: { flex: 1, minHeight: 42 },
  openAreaGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  selectedBadge: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeCompact: {
    alignSelf: 'flex-start',
    minHeight: 0,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  selectedBadgeText: { fontWeight: '800', fontSize: 12 },
  modalOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalCard: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  modalButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
