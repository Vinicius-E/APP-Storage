import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
type RoleFilter = 'Todos' | UserRole;
type FilterDropdownKey = 'status' | 'role';
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

type InteractiveVariant = 'neutral' | 'contained' | 'danger' | 'success';

type InteractivePalette = {
  baseBackground: string;
  hoverBackground: string;
  pressedBackground: string;
  baseBorder: string;
  activeBorder: string;
  baseText: string;
  activeText: string;
  shadowColor: string;
};

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

const ROLE_OPTIONS: UserRole[] = ['Administrador', 'Leitura'];

const STATUS_FILTER_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
  accessibilityLabel: string;
}> = [
  { value: 'all', label: 'Todos', accessibilityLabel: 'action-users-filter-status-all' },
  { value: 'active', label: 'Ativos', accessibilityLabel: 'action-users-filter-status-active' },
  { value: 'inactive', label: 'Inativos', accessibilityLabel: 'action-users-filter-status-inactive' },
];

const ROLE_FILTER_OPTIONS: Array<{
  value: RoleFilter;
  label: string;
  accessibilityLabel: string;
}> = [
  { value: 'Todos', label: 'Todos', accessibilityLabel: 'action-users-filter-role-todos' },
  {
    value: 'Administrador',
    label: 'Administrador',
    accessibilityLabel: 'action-users-filter-role-administrador',
  },
  { value: 'Leitura', label: 'Leitura', accessibilityLabel: 'action-users-filter-role-leitura' },
];

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

  const rgbaMatch = color.match(
    /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i
  );
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos');
  const [openDropdown, setOpenDropdown] = useState<FilterDropdownKey | null>(null);

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

  const actionTransitionStyle = Platform.OS === 'web' ? styles.interactiveWeb : undefined;
  const actionBusy = submitting || savingPassword;
  const reloadBusy = loading || refreshing;

  const getInteractivePalette = useCallback(
    (variant: InteractiveVariant): InteractivePalette => {
      switch (variant) {
        case 'contained':
          return {
            baseBackground: theme.colors.primary,
            hoverBackground: withAlpha(theme.colors.primary, 0.92),
            pressedBackground: withAlpha(theme.colors.primary, 0.84),
            baseBorder: theme.colors.primary,
            activeBorder: withAlpha(theme.colors.primary, 0.95),
            baseText: theme.colors.onPrimary,
            activeText: theme.colors.onPrimary,
            shadowColor: theme.colors.primary,
          };
        case 'danger':
          return {
            baseBackground: theme.colors.surfaceVariant,
            hoverBackground: withAlpha(DANGER_ACTION_COLOR, 0.12),
            pressedBackground: withAlpha(DANGER_ACTION_COLOR, 0.18),
            baseBorder: withAlpha(DANGER_ACTION_COLOR, 0.55),
            activeBorder: withAlpha(DANGER_ACTION_COLOR, 0.8),
            baseText: DANGER_ACTION_COLOR,
            activeText: DANGER_ACTION_COLOR,
            shadowColor: DANGER_ACTION_COLOR,
          };
        case 'success':
          return {
            baseBackground: theme.colors.surfaceVariant,
            hoverBackground: withAlpha(SUCCESS_ACTION_COLOR, 0.12),
            pressedBackground: withAlpha(SUCCESS_ACTION_COLOR, 0.18),
            baseBorder: withAlpha(SUCCESS_ACTION_COLOR, 0.55),
            activeBorder: withAlpha(SUCCESS_ACTION_COLOR, 0.8),
            baseText: SUCCESS_ACTION_COLOR,
            activeText: SUCCESS_ACTION_COLOR,
            shadowColor: SUCCESS_ACTION_COLOR,
          };
        default:
          return {
            baseBackground: theme.colors.surfaceVariant,
            hoverBackground: withAlpha(theme.colors.primary, 0.12),
            pressedBackground: withAlpha(theme.colors.primary, 0.18),
            baseBorder: theme.colors.outline,
            activeBorder: withAlpha(theme.colors.primary, 0.7),
            baseText: textColor,
            activeText: theme.colors.primary,
            shadowColor: theme.colors.primary,
          };
      }
    },
    [textColor, theme.colors]
  );

  const resolveInteractiveState = useCallback(
    (
      state: HoverablePressableState,
      options: {
        variant: InteractiveVariant;
        disabled?: boolean;
        selected?: boolean;
      }
    ) => {
      const { variant, disabled = false, selected = false } = options;
      const pressed = !disabled && Boolean(state.pressed);
      const hovered = !disabled && Boolean(state.hovered);
      const active = !disabled && (selected || hovered || pressed);

      return {
        palette: getInteractivePalette(variant),
        pressed,
        hovered,
        active,
        disabled,
      };
    },
    [getInteractivePalette]
  );

  const resolveInteractiveStyle = useCallback(
    (
      state: HoverablePressableState,
      options: {
        variant: InteractiveVariant;
        disabled?: boolean;
        selected?: boolean;
      }
    ) => {
      const { palette, pressed, hovered, active, disabled } = resolveInteractiveState(state, options);

      return {
        backgroundColor: disabled
          ? palette.baseBackground
          : pressed
            ? palette.pressedBackground
            : active
              ? palette.hoverBackground
              : palette.baseBackground,
        borderColor: active ? palette.activeBorder : palette.baseBorder,
        shadowColor: palette.shadowColor,
        shadowOpacity: active ? 0.2 : 0.12,
        shadowRadius: active ? 14 : 10,
        shadowOffset: { width: 0, height: active ? 8 : 4 },
        elevation: active ? 3 : 1,
        opacity: disabled ? 0.45 : pressed ? 0.96 : 1,
        transform: [{ translateY: hovered ? -1 : 0 }],
      } as const;
    },
    [resolveInteractiveState]
  );

  const resolveInteractiveTextColor = useCallback(
    (
      state: HoverablePressableState,
      options: {
        variant: InteractiveVariant;
        disabled?: boolean;
        selected?: boolean;
      }
    ) => {
      const { palette, active, disabled } = resolveInteractiveState(state, options);
      if (disabled) {
        return withAlpha(palette.baseText, 0.72);
      }
      return active ? palette.activeText : palette.baseText;
    },
    [resolveInteractiveState]
  );

  const resolveInteractiveIconColor = useCallback(
    (
      state: HoverablePressableState,
      options: {
        variant: InteractiveVariant;
        disabled?: boolean;
        selected?: boolean;
      }
    ) => {
      const { disabled } = resolveInteractiveState(state, options);
      if (options.variant === 'neutral') {
        return disabled ? withAlpha(theme.colors.primary, 0.72) : theme.colors.primary;
      }

      return resolveInteractiveTextColor(state, options);
    },
    [resolveInteractiveState, resolveInteractiveTextColor, theme.colors.primary]
  );

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

  const renderFilterDropdown = <T extends string,>(params: {
    dropdownKey: FilterDropdownKey;
    label: string;
    value: T;
    options: Array<{ value: T; label: string; accessibilityLabel: string }>;
    onSelect: (value: T) => void;
  }) => {
    const { dropdownKey, label, value, options, onSelect } = params;
    const isOpen = openDropdown === dropdownKey;
    const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value);

    return (
      <View
        style={[
          styles.filterDropdownGroup,
          isCompact && styles.filterDropdownGroupCompact,
          isOpen && styles.filterDropdownGroupOpen,
        ]}
      >
        <Text style={[styles.filterLabel, { color: '#000000' }]}>{label}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`action-users-filter-${dropdownKey}-toggle`}
          accessibilityState={{ expanded: isOpen }}
          onPress={() => setOpenDropdown((prev) => (prev === dropdownKey ? null : dropdownKey))}
          style={(state) => [
            styles.filterDropdownTrigger,
            actionTransitionStyle,
            resolveInteractiveStyle(state, { variant: 'neutral', selected: isOpen }),
          ]}
        >
          {(state) => {
            const textColor = resolveInteractiveTextColor(state, {
              variant: 'neutral',
              selected: isOpen,
            });
            const iconColor = resolveInteractiveIconColor(state, {
              variant: 'neutral',
              selected: isOpen,
            });

            return (
              <>
                <Text style={[styles.filterDropdownValue, { color: textColor }]}>{selectedLabel}</Text>
                <MaterialCommunityIcons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={iconColor}
                />
              </>
            );
          }}
        </Pressable>

        {isOpen ? (
          <View
            style={[
              styles.filterDropdownMenu,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
          >
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <Pressable
                  key={`${dropdownKey}-${option.value}`}
                  accessibilityRole="button"
                  accessibilityLabel={option.accessibilityLabel}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(option.value);
                    setOpenDropdown(null);
                  }}
                  style={(state) => [
                    styles.filterDropdownOption,
                    actionTransitionStyle,
                    resolveInteractiveStyle(state, { variant: 'neutral', selected }),
                  ]}
                >
                  {(state) => {
                    const textColor = resolveInteractiveTextColor(state, {
                      variant: 'neutral',
                      selected,
                    });
                    const iconColor = resolveInteractiveIconColor(state, {
                      variant: 'neutral',
                      selected,
                    });

                    return (
                      <>
                        <Text style={[styles.filterDropdownOptionText, { color: textColor }]}>
                          {option.label}
                        </Text>
                        {selected ? (
                          <MaterialCommunityIcons name="check" size={16} color={iconColor} />
                        ) : null}
                      </>
                    );
                  }}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
        onScrollBeginDrag={() => setOpenDropdown(null)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void fetchUsers(true)} />
        }
      >
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
            onChangeText={(value) => {
              setSearch(value);
              setOpenDropdown(null);
            }}
            style={styles.input}
            left={<TextInput.Icon icon="magnify" />}
          />

          <View style={[styles.filterControlsRow, isCompact && styles.filterControlsRowCompact]}>
            <View style={[styles.filterDropdownRow, isCompact && styles.filterDropdownRowCompact]}>
              {renderFilterDropdown({
                dropdownKey: 'status',
                label: 'Status',
                value: statusFilter,
                options: STATUS_FILTER_OPTIONS,
                onSelect: (value) => setStatusFilter(value),
              })}

              {renderFilterDropdown({
                dropdownKey: 'role',
                label: 'Perfil',
                value: roleFilter,
                options: ROLE_FILTER_OPTIONS,
                onSelect: (value) => setRoleFilter(value),
              })}
            </View>

            <View style={[styles.filterActionsRow, isCompact && styles.filterActionsRowCompact]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="action-reload-users"
                onPress={() => void fetchUsers(false)}
                disabled={actionBusy || reloadBusy}
                style={(state) => [
                  styles.actionButtonBase,
                  styles.topActionBtn,
                  actionTransitionStyle,
                  resolveInteractiveStyle(state, {
                    variant: 'neutral',
                    disabled: actionBusy || reloadBusy,
                  }),
                ]}
              >
                {(state) => {
                  const contentColor = resolveInteractiveTextColor(state, {
                    variant: 'neutral',
                    disabled: actionBusy || reloadBusy,
                  });
                  const iconColor = resolveInteractiveIconColor(state, {
                    variant: 'neutral',
                    disabled: actionBusy || reloadBusy,
                  });

                  return (
                    <>
                      {reloadBusy ? (
                        <ActivityIndicator size="small" color={iconColor} />
                      ) : (
                        <MaterialCommunityIcons name="refresh" size={18} color={iconColor} />
                      )}
                      <Text style={[styles.actionButtonText, { color: contentColor }]}>Recarregar</Text>
                    </>
                  );
                }}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="action-new-user"
                onPress={openCreate}
                disabled={actionBusy}
                style={(state) => [
                  styles.actionButtonBase,
                  styles.createBtn,
                  actionTransitionStyle,
                  resolveInteractiveStyle(state, {
                    variant: 'neutral',
                    disabled: actionBusy,
                  }),
                ]}
              >
                {(state) => {
                  const contentColor = resolveInteractiveTextColor(state, {
                    variant: 'neutral',
                    disabled: actionBusy,
                  });
                  const iconColor = resolveInteractiveIconColor(state, {
                    variant: 'neutral',
                    disabled: actionBusy,
                  });

                  return (
                    <>
                      <MaterialCommunityIcons name="account-plus-outline" size={18} color={iconColor} />
                      <Text style={[styles.actionButtonText, { color: contentColor }]}>Novo usuário</Text>
                    </>
                  );
                }}
              </Pressable>
            </View>
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`action-edit-user-${user.id}`}
                      onPress={() => openEdit(user)}
                      disabled={actionBusy}
                      style={(state) => [
                        styles.actionButtonBase,
                        styles.rowActionBtn,
                        actionTransitionStyle,
                        resolveInteractiveStyle(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        }),
                      ]}
                    >
                      {(state) => {
                        const contentColor = resolveInteractiveTextColor(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        });
                        const iconColor = resolveInteractiveIconColor(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        });

                        return (
                          <>
                            <MaterialCommunityIcons name="pencil-outline" size={18} color={iconColor} />
                            <Text style={[styles.actionButtonText, { color: contentColor }]}>Editar</Text>
                          </>
                        );
                      }}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isUserActive
                          ? `action-status-inactivate-${user.id}`
                          : `action-status-activate-${user.id}`
                      }
                      onPress={() => void handleToggleStatus(user)}
                      disabled={actionBusy}
                      style={(state) => [
                        styles.actionButtonBase,
                        styles.rowActionBtn,
                        actionTransitionStyle,
                        resolveInteractiveStyle(state, {
                          variant: isUserActive ? 'danger' : 'success',
                          disabled: actionBusy,
                        }),
                      ]}
                    >
                      {(state) => {
                        const contentColor = resolveInteractiveTextColor(state, {
                          variant: isUserActive ? 'danger' : 'success',
                          disabled: actionBusy,
                        });

                        return (
                          <>
                            <MaterialCommunityIcons
                              name={isUserActive ? 'account-off-outline' : 'account-check-outline'}
                              size={18}
                              color={contentColor}
                            />
                            <Text style={[styles.actionButtonText, { color: contentColor }]}>
                              {isUserActive ? 'Inativar' : 'Ativar'}
                            </Text>
                          </>
                        );
                      }}
                    </Pressable>
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
  actionButtonBase: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topActionBtn: { minWidth: 152 },
  createBtn: { minWidth: 170 },
  actionButtonText: { fontSize: 14, fontWeight: '800' },
  input: { marginBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  filterControlsRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterControlsRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  filterDropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  filterDropdownRowCompact: { flexDirection: 'column', gap: 10 },
  filterActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  filterActionsRowCompact: { justifyContent: 'flex-start', width: '100%' },
  filterDropdownGroup: { flex: 1, minWidth: 200, maxWidth: 320 },
  filterDropdownGroupCompact: { width: '100%', minWidth: 0, maxWidth: '100%' },
  filterDropdownGroupOpen: { zIndex: 2 },
  filterLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  filterDropdownTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterDropdownValue: { fontSize: 14, fontWeight: '700' },
  filterDropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    gap: 6,
  },
  filterDropdownOption: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterDropdownOptionText: { fontSize: 14, fontWeight: '700' },
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
  rowActionBtn: { minWidth: 120 },
  interactiveWeb:
    Platform.OS === 'web'
      ? ({
          transitionProperty:
            'transform, box-shadow, background-color, border-color, opacity, color',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
          cursor: 'pointer',
        } as any)
      : ({} as any),
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
