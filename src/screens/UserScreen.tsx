import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Chip, Divider, Modal, Portal, Surface, Text, TextInput } from 'react-native-paper';
import AlertDialog from '../components/AlertDialog';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import { API_STATE_MESSAGES, getApiEmptyCopy } from '../constants/apiStateMessages';
import {
  UsuarioResponseDTO,
  alterarSenhaUsuario,
  atualizarStatusUsuario,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
} from '../services/usuarioApi';
import { useThemeContext } from '../theme/ThemeContext';

type UserRole = 'Administrador' | 'Leitura';
type UserStatus = 'active' | 'inactive';
type StatusFilter = 'all' | 'active' | 'inactive';
type PermissionKey = 'dashboard:view' | 'warehouse:read' | 'warehouse:update' | 'users:update';
type PermissionState = Record<PermissionKey, boolean>;

type ManagedUser = {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  team: string;
  status: UserStatus;
  lastAccess: string;
  permissions: PermissionState;
};

type EditForm = {
  name: string;
  login: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
};

type ChangePasswordForm = {
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
};

type StatusConfirmTarget = {
  id: number;
  name: string;
};

type StatusFeedback = {
  type: 'success' | 'error';
  message: string;
};

const SUCCESS_ACTION_COLOR = '#2E7D32';
const DANGER_ACTION_COLOR = '#B3261E';

const ROLE_OPTIONS: UserRole[] = ['Administrador', 'Leitura'];
const FILTER_ROLES: Array<'Todos' | UserRole> = ['Todos', ...ROLE_OPTIONS];

const PERMISSIONS: Array<{ key: PermissionKey; title: string; description: string }> = [
  {
    key: 'dashboard:view',
    title: 'Acessar dashboard',
    description: 'Visualiza indicadores gerais.',
  },
  {
    key: 'warehouse:read',
    title: 'Consultar armazém',
    description: 'Visualiza mapa, fileiras e grades.',
  },
  {
    key: 'warehouse:update',
    title: 'Editar estoque',
    description: 'Pode atualizar quantidade e produto.',
  },
  {
    key: 'users:update',
    title: 'Editar usuários',
    description: 'Pode alterar dados de usuários.',
  },
];

const emptyEditForm: EditForm = {
  name: '',
  login: '',
  role: 'Leitura',
  password: '',
  confirmPassword: '',
};

const emptyChangePasswordForm: ChangePasswordForm = {
  senhaAtual: '',
  novaSenha: '',
  confirmarNovaSenha: '',
};

const statusLabel: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

function mapPerfilToRole(perfil: string): UserRole {
  return perfil === 'ADMINISTRADOR' ? 'Administrador' : 'Leitura';
}

function mapRoleToPerfil(role: UserRole): 'ADMINISTRADOR' | 'LEITURA' {
  return role === 'Administrador' ? 'ADMINISTRADOR' : 'LEITURA';
}

function permissionsByRole(role: UserRole): PermissionState {
  if (role === 'Administrador') {
    return {
      'dashboard:view': true,
      'warehouse:read': true,
      'warehouse:update': true,
      'users:update': true,
    };
  }

  return {
    'dashboard:view': true,
    'warehouse:read': true,
    'warehouse:update': false,
    'users:update': false,
  };
}

function toManagedUser(user: UsuarioResponseDTO): ManagedUser {
  const role = mapPerfilToRole(user.perfil);

  return {
    id: user.id,
    name: user.nome,
    login: user.login,
    role,
    team: '—',
    status: user.ativo ? 'active' : 'inactive',
    lastAccess: '—',
    permissions: permissionsByRole(role),
  };
}

function isLoginValid(login: string): boolean {
  return login.trim().length >= 3;
}

function getUserInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return 'US';
  }

  const chunks = normalized.split(/\s+/).filter(Boolean);
  const first = chunks[0]?.[0] ?? '';
  const second = chunks.length > 1 ? (chunks[chunks.length - 1]?.[0] ?? '') : '';
  const initials = `${first}${second}`.toUpperCase();

  return initials || 'US';
}

function resolveRequestErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const responseData = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const message = (responseData as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function UserScreen() {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 780;
  const colors = theme.colors as typeof theme.colors & { text?: string; textSecondary?: string };
  const textColor = colors.text ?? theme.colors.onSurface;
  const textSecondary = colors.textSecondary ?? theme.colors.onSurfaceVariant;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<'Todos' | UserRole>('Todos');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [editingUserId, setEditingUserId] = useState<number | 'new' | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [changePasswordForm, setChangePasswordForm] =
    useState<ChangePasswordForm>(emptyChangePasswordForm);

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarNovaSenha, setShowConfirmarNovaSenha] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<StatusConfirmTarget | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback | null>(null);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    setErrorMessage('');

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await listarUsuarios();
      setUsers(data.map(toManagedUser));
    } catch (error) {
      console.error('Falha ao listar usuários:', error);
      const backendMessage = resolveRequestErrorMessage(error, '');
      setErrorMessage(backendMessage || API_STATE_MESSAGES.users.error.description);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchUsers(false);
  }, [fetchUsers]);

  const summary = useMemo(() => {
    const active = users.filter((user) => user.status === 'active').length;
    const inactive = users.filter((user) => user.status === 'inactive').length;
    const admins = users.filter((user) => user.role === 'Administrador').length;
    return {
      total: users.length,
      active,
      inactive,
      admins,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return users.filter((user) => {
      const byStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? user.status === 'active'
            : user.status === 'inactive';
      const byRole = roleFilter === 'Todos' ? true : user.role === roleFilter;
      const bySearch =
        needle === ''
          ? true
          : [user.name, user.login, user.team, user.role].join(' ').toLowerCase().includes(needle);

      return byStatus && byRole && bySearch;
    });
  }, [roleFilter, search, statusFilter, users]);

  const hasUserFilters = useMemo(() => {
    return search.trim() !== '' || statusFilter !== 'all' || roleFilter !== 'Todos';
  }, [roleFilter, search, statusFilter]);

  const usersEmptyCopy = useMemo(() => {
    return getApiEmptyCopy('users', hasUserFilters);
  }, [hasUserFilters]);

  const resetCreatePasswordState = () => {
    setShowCreatePassword(false);
    setShowCreateConfirmPassword(false);
  };

  const resetChangePasswordState = () => {
    setChangePasswordForm(emptyChangePasswordForm);
    setShowSenhaAtual(false);
    setShowNovaSenha(false);
    setShowConfirmarNovaSenha(false);
  };

  const closeEdit = () => {
    setEditingUserId(null);
    setEditForm(emptyEditForm);
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const openCreate = () => {
    setEditingUserId('new');
    setEditForm(emptyEditForm);
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name,
      login: user.login,
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const saveUser = async () => {
    if (!editingUserId) {
      return;
    }

    const name = editForm.name.trim();
    const login = editForm.login.trim();
    const password = editForm.password.trim();
    const confirmPassword = editForm.confirmPassword.trim();
    const creating = editingUserId === 'new';

    if (name.length < 2) {
      Alert.alert('Validação', 'Informe um nome válido.');
      return;
    }

    if (!isLoginValid(login)) {
      Alert.alert('Validação', 'Informe um login válido.');
      return;
    }

    if (creating) {
      if (password.length < 6) {
        Alert.alert('Validação', 'A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Validação', 'A confirmação de senha não confere.');
        return;
      }
    }

    try {
      setSubmitting(true);

      if (creating) {
        await criarUsuario({
          login,
          nome: name,
          perfil: mapRoleToPerfil(editForm.role),
          senha: password,
        });
      } else {
        const userId = Number(editingUserId);
        await atualizarUsuario(userId, {
          login,
          nome: name,
          perfil: mapRoleToPerfil(editForm.role),
        });
      }

      closeEdit();
      await fetchUsers(false);
      setStatusFeedback({
        type: 'success',
        message: creating ? 'Usuário criado com sucesso.' : 'Usuário atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Falha ao salvar usuário:', error);
      setStatusFeedback({
        type: 'error',
        message: resolveRequestErrorMessage(
          error,
          creating ? 'Não foi possível criar o usuário.' : 'Não foi possível atualizar o usuário.'
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const savePassword = async () => {
    if (typeof editingUserId !== 'number') {
      return;
    }

    const senhaAtual = changePasswordForm.senhaAtual.trim();
    const novaSenha = changePasswordForm.novaSenha.trim();
    const confirmarNovaSenha = changePasswordForm.confirmarNovaSenha.trim();

    if (novaSenha.length < 6) {
      Alert.alert('Validação', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      Alert.alert('Validação', 'A confirmação da nova senha não confere.');
      return;
    }

    try {
      setSavingPassword(true);
      await alterarSenhaUsuario(editingUserId, {
        senhaAtual,
        novaSenha,
        confirmarNovaSenha,
      });
      resetChangePasswordState();
      Alert.alert('Sucesso', 'Senha alterada com sucesso.');
    } catch (error) {
      console.error('Falha ao alterar senha:', error);
      Alert.alert('Erro', 'Não foi possível alterar a senha. Confira a senha atual.');
    } finally {
      setSavingPassword(false);
    }
  };

  const executeStatusUpdate = async (user: ManagedUser, ativo: boolean) => {
    try {
      setSubmitting(true);
      await atualizarStatusUsuario(Number(user.id), ativo);
      await fetchUsers(false);
      setStatusFeedback({
        type: 'success',
        message: ativo
          ? `${user.name} foi ativado com sucesso.`
          : `${user.name} foi inativado com sucesso.`,
      });
    } catch (error) {
      console.error('Falha ao atualizar status do usuário:', error);
      setStatusFeedback({
        type: 'error',
        message: resolveRequestErrorMessage(
          error,
          'Não foi possível atualizar o status do usuário.'
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusConfirm = (user: ManagedUser) => {
    setStatusConfirmTarget({ id: user.id, name: user.name });
  };

  const closeStatusConfirm = () => {
    setStatusConfirmTarget(null);
  };

  const closeStatusFeedback = () => {
    setStatusFeedback(null);
  };

  const confirmInactivation = async () => {
    if (!statusConfirmTarget) {
      return;
    }

    const selectedUser = users.find((user) => user.id === statusConfirmTarget.id);
    closeStatusConfirm();

    if (!selectedUser) {
      await fetchUsers(false);
      return;
    }

    await executeStatusUpdate(selectedUser, false);
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    const shouldInactivate = user.status === 'active';

    if (shouldInactivate) {
      openStatusConfirm(user);
      return;
    }

    await executeStatusUpdate(user, true);
  };

  const canSaveUser =
    editForm.name.trim().length >= 2 &&
    isLoginValid(editForm.login) &&
    (editingUserId === 'new'
      ? editForm.password.trim().length >= 6 &&
        editForm.password.trim() === editForm.confirmPassword.trim()
      : true);

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void fetchUsers(true)} />
        }
      >
        <Surface
          style={[
            styles.sectionCard,
            styles.hero,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <View style={[styles.heroTop, isCompact && styles.heroTopCompact]}>
            <View style={[styles.metricsRow, isCompact && styles.metricsRowCompact]}>
              <View pointerEvents="none">
                <Chip style={styles.metricChip}>Total: {summary.total}</Chip>
              </View>
              <View pointerEvents="none">
                <Chip style={styles.metricChip}>Ativos: {summary.active}</Chip>
              </View>
              <View pointerEvents="none">
                <Chip style={styles.metricChip}>Inativos: {summary.inactive}</Chip>
              </View>
              <View pointerEvents="none">
                <Chip style={styles.metricChip}>Administradores: {summary.admins}</Chip>
              </View>
            </View>
            <View style={[styles.heroActions, isCompact && styles.heroActionsCompact]}>
              <Button
                mode="outlined"
                icon="refresh"
                onPress={() => void fetchUsers(false)}
                loading={loading || refreshing}
                accessibilityLabel="action-reload-users"
                style={styles.topActionBtn}
                disabled={submitting || savingPassword}
              >
                Recarregar
              </Button>
              <Button
                mode="contained"
                icon="account-plus-outline"
                onPress={openCreate}
                accessibilityLabel="action-new-user"
                style={styles.createBtn}
                textColor={theme.colors.onPrimary}
                disabled={submitting || savingPassword}
              >
                Novo usuário
              </Button>
            </View>
          </View>
        </Surface>

        <Surface
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
          ]}
          elevation={0}
        >
          <AppTextInput
            label="Buscar usuário"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            left={<TextInput.Icon icon="magnify" />}
          />

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: '#000000' }]}>Status</Text>
            <Chip
              selected={statusFilter === 'all'}
              onPress={() => setStatusFilter('all')}
              accessibilityLabel="action-users-filter-status-all"
              selectedColor="#000000"
              textStyle={{ color: '#000000' }}
            >
              Todos
            </Chip>
            <Chip
              selected={statusFilter === 'active'}
              onPress={() => setStatusFilter('active')}
              accessibilityLabel="action-users-filter-status-active"
              selectedColor="#000000"
              textStyle={{ color: '#000000' }}
            >
              Ativos
            </Chip>
            <Chip
              selected={statusFilter === 'inactive'}
              onPress={() => setStatusFilter('inactive')}
              accessibilityLabel="action-users-filter-status-inactive"
              selectedColor="#000000"
              textStyle={{ color: '#000000' }}
            >
              Inativos
            </Chip>
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: '#000000' }]}>Perfil</Text>
            {FILTER_ROLES.map((role) => (
              <Chip
                key={role}
                selected={roleFilter === role}
                onPress={() => setRoleFilter(role)}
                accessibilityLabel={`action-users-filter-role-${role.toLowerCase()}`}
                selectedColor="#000000"
                textStyle={{ color: '#000000' }}
              >
                {role}
              </Chip>
            ))}
          </View>
        </Surface>

        {loading ? (
          <Surface
            style={[
              styles.empty,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
            elevation={0}
          >
            <AppLoadingState message="Carregando usuários..." style={styles.loadingBox} />
          </Surface>
        ) : null}

        {!loading && errorMessage ? (
          <Surface
            style={[
              styles.empty,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
            elevation={0}
          >
            <AppEmptyState
              title={API_STATE_MESSAGES.users.error.title}
              description={errorMessage}
              icon="alert-circle-outline"
              tone="error"
            />
          </Surface>
        ) : null}

        <View style={styles.listBlock}>
          {filteredUsers.map((user) => {
            const enabled = Object.values(user.permissions).filter(Boolean).length;
            const isUserActive = user.status === 'active';
            const permissionPercent = Math.round((enabled / PERMISSIONS.length) * 100);
            const initials = getUserInitials(user.name);

            return (
              <Surface
                key={user.id}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <View style={[styles.userTop, isCompact && styles.userTopCompact]}>
                  <View style={styles.userIdentityRow}>
                    <View
                      style={[
                        styles.userAvatar,
                        {
                          backgroundColor: theme.colors.secondaryContainer,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.userAvatarText,
                          { color: theme.colors.onSecondaryContainer },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View style={styles.userMeta}>
                      <Text style={[styles.userName, { color: textColor }]}>{user.name}</Text>
                      <Text style={[styles.userInfo, { color: textSecondary }]}>{user.login}</Text>

                      <View style={styles.userFacts}>
                        <View
                          style={[
                            styles.userFactPill,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                              borderColor: theme.colors.outlineVariant,
                            },
                          ]}
                        >
                          <Text style={[styles.userFactText, { color: textSecondary }]}>
                            ID #{user.id}
                          </Text>
                        </View>
                        {/* <View
                          style={[
                            styles.userFactPill,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                              borderColor: theme.colors.outlineVariant,
                            },
                          ]}
                        >
                          <Text style={[styles.userFactText, { color: textSecondary }]}>
                            Equipe {user.team}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.userFactPill,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                              borderColor: theme.colors.outlineVariant,
                            },
                          ]}
                        >
                          <Text style={[styles.userFactText, { color: textSecondary }]}>
                            Último acesso {user.lastAccess}
                          </Text>
                        </View> */}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.tags, isCompact && styles.tagsCompact]}>
                    <View pointerEvents="none">
                      <Chip compact>{user.role}</Chip>
                    </View>
                    <View pointerEvents="none">
                      <Chip compact>{statusLabel[user.status]}</Chip>
                    </View>
                    <View pointerEvents="none">
                      <Chip compact>
                        {enabled}/{PERMISSIONS.length} permissões
                      </Chip>
                    </View>
                  </View>
                </View>

                <View style={[styles.userMiddle, isCompact && styles.userMiddleCompact]}>
                  <View
                    style={[
                      styles.permissionPanel,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text style={[styles.permissionLabel, { color: textSecondary }]}>
                      Permissões habilitadas
                    </Text>
                    <Text style={[styles.permissionValue, { color: textColor }]}>
                      {enabled} de {PERMISSIONS.length} ({permissionPercent}%)
                    </Text>

                    <View
                      style={[
                        styles.permissionTrack,
                        {
                          backgroundColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.permissionFill,
                          {
                            backgroundColor: theme.colors.primary,
                            width: `${permissionPercent}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={[styles.actions, isCompact && styles.actionsCompact]}>
                    <Button
                      mode="outlined"
                      icon="pencil-outline"
                      onPress={() => openEdit(user)}
                      accessibilityLabel={`action-edit-user-${user.id}`}
                      style={styles.rowActionBtn}
                      disabled={submitting || savingPassword}
                    >
                      Editar
                    </Button>
                    <Button
                      mode="outlined"
                      icon={isUserActive ? 'account-off-outline' : 'account-check-outline'}
                      onPress={() => void handleToggleStatus(user)}
                      accessibilityLabel={
                        isUserActive
                          ? `action-status-inactivate-${user.id}`
                          : `action-status-activate-${user.id}`
                      }
                      textColor={isUserActive ? DANGER_ACTION_COLOR : SUCCESS_ACTION_COLOR}
                      style={[
                        styles.rowActionBtn,
                        isUserActive ? styles.actionDanger : styles.actionSuccess,
                      ]}
                      disabled={submitting || savingPassword}
                    >
                      {isUserActive ? 'Inativar' : 'Ativar'}
                    </Button>
                  </View>
                </View>
              </Surface>
            );
          })}

          {!loading && !errorMessage && filteredUsers.length === 0 ? (
            <Surface
              style={[
                styles.empty,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              ]}
              elevation={0}
            >
              <AppEmptyState
                title={usersEmptyCopy.title}
                description={usersEmptyCopy.description}
                icon="account-search-outline"
              />
            </Surface>
          ) : null}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={editingUserId !== null}
          onDismiss={closeEdit}
          contentContainerStyle={styles.modalFrame}
        >
          <View
            style={[
              styles.modal,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {editingUserId === 'new' ? 'Novo usuário' : 'Editar usuário'}
              </Text>

              <AppTextInput
                label="Nome"
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                style={styles.input}
              />

              <AppTextInput
                label="Login"
                value={editForm.login}
                autoCapitalize="none"
                autoComplete="off"
                textContentType="none"
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, login: value }))}
                style={styles.input}
              />

              {editingUserId === 'new' ? (
                <>
                  <AppTextInput
                    label="Senha"
                    value={editForm.password}
                    onChangeText={(value) => setEditForm((prev) => ({ ...prev, password: value }))}
                    secureTextEntry={!showCreatePassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showCreatePassword ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowCreatePassword((state) => !state)}
                        forceTextInputFocus={false}
                      />
                    }
                  />

                  <AppTextInput
                    label="Confirmar senha"
                    value={editForm.confirmPassword}
                    onChangeText={(value) =>
                      setEditForm((prev) => ({ ...prev, confirmPassword: value }))
                    }
                    secureTextEntry={!showCreateConfirmPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showCreateConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowCreateConfirmPassword((state) => !state)}
                        forceTextInputFocus={false}
                      />
                    }
                  />
                </>
              ) : null}

              <Text style={[styles.helperText, { color: textSecondary }]}>Perfil</Text>
              <View style={styles.filterRow}>
                {ROLE_OPTIONS.map((role) => (
                  <Chip
                    key={role}
                    selected={editForm.role === role}
                    onPress={() => setEditForm((prev) => ({ ...prev, role }))}
                  >
                    {role}
                  </Chip>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button mode="text" onPress={closeEdit} disabled={submitting || savingPassword}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => void saveUser()}
                  disabled={!canSaveUser || submitting || savingPassword}
                  loading={submitting}
                >
                  Salvar usuário
                </Button>
              </View>

              {typeof editingUserId === 'number' ? (
                <View style={styles.passwordSection}>
                  <Divider style={styles.passwordDivider} />
                  <Text style={[styles.modalTitle, styles.passwordTitle, { color: textColor }]}>
                    Alterar senha
                  </Text>

                  <AppTextInput
                    label="Senha atual"
                    value={changePasswordForm.senhaAtual}
                    onChangeText={(value) =>
                      setChangePasswordForm((prev) => ({
                        ...prev,
                        senhaAtual: value,
                      }))
                    }
                    secureTextEntry={!showSenhaAtual}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showSenhaAtual ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowSenhaAtual((state) => !state)}
                        forceTextInputFocus={false}
                      />
                    }
                  />

                  <AppTextInput
                    label="Nova senha"
                    value={changePasswordForm.novaSenha}
                    onChangeText={(value) =>
                      setChangePasswordForm((prev) => ({
                        ...prev,
                        novaSenha: value,
                      }))
                    }
                    secureTextEntry={!showNovaSenha}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showNovaSenha ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowNovaSenha((state) => !state)}
                        forceTextInputFocus={false}
                      />
                    }
                  />

                  <AppTextInput
                    label="Confirmar nova senha"
                    value={changePasswordForm.confirmarNovaSenha}
                    onChangeText={(value) =>
                      setChangePasswordForm((prev) => ({
                        ...prev,
                        confirmarNovaSenha: value,
                      }))
                    }
                    secureTextEntry={!showConfirmarNovaSenha}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    right={
                      <TextInput.Icon
                        icon={showConfirmarNovaSenha ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowConfirmarNovaSenha((state) => !state)}
                        forceTextInputFocus={false}
                      />
                    }
                  />

                  <View style={styles.passwordActions}>
                    <Button
                      mode="contained-tonal"
                      onPress={() => void savePassword()}
                      loading={savingPassword}
                      disabled={submitting || savingPassword}
                    >
                      Salvar senha
                    </Button>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </Modal>

        <Modal
          visible={statusConfirmTarget !== null}
          onDismiss={closeStatusConfirm}
          contentContainerStyle={styles.confirmModalFrame}
        >
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.modalTitle, styles.confirmTitle, { color: textColor }]}>
                Inativar usuário
              </Text>
              <Text style={[styles.confirmMessage, { color: textSecondary }]}>
                Deseja inativar {statusConfirmTarget?.name}?
              </Text>

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={closeStatusConfirm}
                  disabled={submitting || savingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => void confirmInactivation()}
                  buttonColor={theme.colors.error}
                  textColor="#fff"
                  disabled={submitting || savingPassword}
                >
                  Inativar
                </Button>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </Portal>

      <AlertDialog
        visible={statusFeedback !== null}
        onDismiss={closeStatusFeedback}
        message={statusFeedback?.message ?? ''}
        type={statusFeedback?.type ?? 'success'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  hero: { gap: 8 },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTopCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  heroActionsCompact: { width: '100%', justifyContent: 'flex-end' },
  topActionBtn: { borderRadius: 10 },
  createBtn: { borderRadius: 10 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  metricsRowCompact: { width: '100%' },
  metricChip: { borderRadius: 999 },
  input: { marginBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  filterLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  listBlock: { gap: 10 },
  userCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'flex-start',
  },
  userTopCompact: { flexDirection: 'column', alignItems: 'stretch' },
  userIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 15, fontWeight: '800' },
  userMeta: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  tagsCompact: { justifyContent: 'flex-start' },
  userFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  userFactPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  userFactText: { fontSize: 11, fontWeight: '700' },
  userName: { fontSize: 16, fontWeight: '800' },
  userInfo: { fontSize: 12, fontWeight: '600' },
  userMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  userMiddleCompact: { flexDirection: 'column', alignItems: 'stretch' },
  permissionPanel: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 230,
    flex: 1,
  },
  permissionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  permissionValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  permissionTrack: { marginTop: 8, height: 8, borderRadius: 999, overflow: 'hidden' },
  permissionFill: { height: '100%', borderRadius: 999 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  actionsCompact: { justifyContent: 'flex-start', width: '100%' },
  rowActionBtn: { borderRadius: 999 },
  actionDanger: { borderColor: '#B3261E' },
  actionSuccess: { borderColor: SUCCESS_ACTION_COLOR },
  empty: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, alignItems: 'center' },
  loadingBox: { minHeight: 136 },
  modalFrame: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  modal: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalScroll: { maxHeight: '100%' },
  modalScrollContent: { padding: 14 },
  confirmModalFrame: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  confirmModal: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  confirmTitle: { marginBottom: 4 },
  confirmMessage: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helperText: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  passwordSection: { marginTop: 8 },
  passwordDivider: { marginBottom: 10 },
  passwordTitle: { fontSize: 16, marginBottom: 6 },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
});
