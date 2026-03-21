import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { Button, Chip, Divider, Surface, Text, TextInput } from 'react-native-paper';
import AppModalFrame from '../components/AppModalFrame';
import AlertDialog from '../components/AlertDialog';
import AppEmptyState from '../components/AppEmptyState';
import AppLoadingState from '../components/AppLoadingState';
import AppTextInput from '../components/AppTextInput';
import FilterSelect, { FilterSelectOption } from '../components/FilterSelect';
import { API_STATE_MESSAGES, getApiEmptyCopy } from '../constants/apiStateMessages';
import { useAppScreenScrollableLayout } from '../hooks/useAppScreenScrollableLayout';
import { getUserFacingErrorMessage } from '../utils/userFacingError';
import {
  UsuarioResponseDTO,
  alterarSenhaUsuario,
  listarPerfisAtivosUsuario,
  atualizarStatusUsuario,
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
} from '../services/usuarioApi';
import { listProfiles } from '../services/profileApi';
import { SCREEN_LABELS, usePermissions } from '../security/permissions';
import { useThemeContext } from '../theme/ThemeContext';
import { ProfileDTO, ScreenKey } from '../types/ProfileDTO';

type UserRole = string;
type UserStatus = 'active' | 'inactive';
type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = string;
type FilterDropdownKey = 'status' | 'role';

type ProfileOption = {
  value: string;
  label: string;
  accessibilityLabel: string;
  available: boolean;
};

type UserPermissionDetails = {
  enabledScreens: ScreenKey[];
  disabledScreens: ScreenKey[];
  enabledCount: number;
  totalCount: number;
  coveragePercent: number;
  accessLevelLabel: string;
  mapped: boolean;
  helperText: string;
};

type ManagedUser = {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  profileValue: string;
  team: string;
  status: UserStatus;
  lastAccess: string;
  permissionDetails: UserPermissionDetails;
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

const ALL_ROLE_FILTER = 'Todos';
const DEFAULT_ROLE_VALUE = 'CONSULTOR';

const STATUS_FILTER_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
  accessibilityLabel: string;
}> = [
  { value: 'all', label: 'Todos', accessibilityLabel: 'action-users-filter-status-all' },
  { value: 'active', label: 'Ativos', accessibilityLabel: 'action-users-filter-status-active' },
  {
    value: 'inactive',
    label: 'Inativos',
    accessibilityLabel: 'action-users-filter-status-inactive',
  },
];

const ALL_SCREEN_KEYS = Object.keys(SCREEN_LABELS) as ScreenKey[];

const emptyEditForm: EditForm = {
  name: '',
  login: '',
  role: DEFAULT_ROLE_VALUE,
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

function normalizeProfileToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .trim();
}

function formatProfileLabel(value: string): string {
  const normalized = normalizeProfileToken(value);

  if (!normalized) {
    return 'Consultor';
  }

  if (normalized.includes('ADMIN')) {
    return 'Administrador';
  }

  if (
    normalized.includes('CONSULTOR') ||
    normalized.includes('LEITURA') ||
    normalized.includes('READ_ONLY') ||
    normalized.includes('READONLY')
  ) {
    return 'Consultor';
  }

  if (normalized.includes('OPERADOR')) {
    return 'Operador';
  }

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function buildProfileAccessibilityLabel(value: string): string {
  const normalized = normalizeProfileToken(value).toLowerCase();
  return `action-users-filter-role-${normalized || 'perfil'}`;
}

function buildProfileOption(profile: {
  code?: string | null;
  description?: string | null;
  active?: boolean | null;
}): ProfileOption {
  const profileCode = normalizeProfileToken(String(profile.code ?? profile.description ?? ''));
  const label = String(profile.description ?? '').trim() || formatProfileLabel(profileCode);
  const value = profileCode || DEFAULT_ROLE_VALUE;

  return {
    value,
    label,
    accessibilityLabel: buildProfileAccessibilityLabel(value || label),
    available: profile.active !== false,
  };
}

function buildUnavailableProfileOption(value: string): ProfileOption {
  const normalized = normalizeProfileToken(value) || DEFAULT_ROLE_VALUE;

  return {
    value: normalized,
    label: `${formatProfileLabel(normalized)} (indisponivel)`,
    accessibilityLabel: buildProfileAccessibilityLabel(normalized),
    available: false,
  };
}

function findProfileOption(
  profileOptions: ProfileOption[],
  value: string
): ProfileOption | undefined {
  const normalized = normalizeProfileToken(value);
  return profileOptions.find((option) => option.value === normalized);
}

function mapPerfilToRole(perfil: string, profileOptions: ProfileOption[] = []): UserRole {
  return findProfileOption(profileOptions, perfil)?.label ?? formatProfileLabel(perfil);
}

function mapRoleToPerfil(role: UserRole, profileOptions: ProfileOption[] = []): string {
  const normalized = normalizeProfileToken(role) || DEFAULT_ROLE_VALUE;
  const byValue = findProfileOption(profileOptions, normalized);

  if (byValue) {
    return byValue.value;
  }

  const byLabel = profileOptions.find(
    (option) => normalizeProfileToken(option.label) === normalized
  );
  if (byLabel) {
    return byLabel.value;
  }

  const fallbackLabel = formatProfileLabel(normalized);
  const byFallbackLabel = profileOptions.find(
    (option) => normalizeProfileToken(option.label) === normalizeProfileToken(fallbackLabel)
  );

  return byFallbackLabel?.value ?? normalized;
}

function matchesProfileKind(value: string, kind: 'admin' | 'read' | 'operator'): boolean {
  const normalized = normalizeProfileToken(value);

  if (kind === 'admin') {
    return normalized.includes('ADMIN');
  }

  if (kind === 'read') {
    return (
      normalized.includes('CONSULTOR') ||
      normalized.includes('LEITURA') ||
      normalized.includes('READ_ONLY') ||
      normalized.includes('READONLY')
    );
  }

  return (
    normalized.includes('OPERADOR') ||
    normalized.includes('FULL_ACCESS') ||
    normalized.includes('FULLACCESS')
  );
}

function buildProfileOptionsFromCatalog(profileCatalog: ProfileDTO[]): ProfileOption[] {
  const uniqueOptions = new Map<string, ProfileOption>();

  profileCatalog
    .filter((profile) => profile.active !== false)
    .forEach((profile) => {
      const option = buildProfileOption(profile);
      if (!uniqueOptions.has(option.value)) {
        uniqueOptions.set(option.value, option);
      }
    });

  return Array.from(uniqueOptions.values());
}

function findProfileDefinition(
  profileValue: string,
  profileLabel: string,
  profileCatalog: ProfileDTO[]
): ProfileDTO | null {
  const normalizedValue = normalizeProfileToken(profileValue);
  const normalizedLabel = normalizeProfileToken(profileLabel);

  const exactMatch = profileCatalog.find((profile) => {
    const profileCode = normalizeProfileToken(profile.code);
    const profileDescription = normalizeProfileToken(profile.description);

    return (
      profileCode === normalizedValue ||
      profileDescription === normalizedValue ||
      profileCode === normalizedLabel ||
      profileDescription === normalizedLabel
    );
  });

  if (exactMatch) {
    return exactMatch;
  }

  if (matchesProfileKind(normalizedValue, 'admin') || matchesProfileKind(normalizedLabel, 'admin')) {
    return (
      profileCatalog.find(
        (profile) =>
          matchesProfileKind(profile.code, 'admin') ||
          matchesProfileKind(profile.description, 'admin')
      ) ?? null
    );
  }

  if (matchesProfileKind(normalizedValue, 'read') || matchesProfileKind(normalizedLabel, 'read')) {
    return (
      profileCatalog.find(
        (profile) =>
          matchesProfileKind(profile.code, 'read') ||
          matchesProfileKind(profile.description, 'read')
      ) ?? null
    );
  }

  if (
    matchesProfileKind(normalizedValue, 'operator') ||
    matchesProfileKind(normalizedLabel, 'operator')
  ) {
    return (
      profileCatalog.find(
        (profile) =>
          matchesProfileKind(profile.code, 'operator') ||
          matchesProfileKind(profile.description, 'operator')
      ) ?? null
    );
  }

  return null;
}

function buildUserPermissionDetails(
  profileValue: string,
  profileLabel: string,
  profileCatalog: ProfileDTO[]
): UserPermissionDetails {
  const permissionTemplate = findProfileDefinition(profileValue, profileLabel, profileCatalog);

  if (!permissionTemplate) {
    return {
      enabledScreens: [],
      disabledScreens: [...ALL_SCREEN_KEYS],
      enabledCount: 0,
      totalCount: ALL_SCREEN_KEYS.length,
      coveragePercent: 0,
      accessLevelLabel: 'Perfil sem mapeamento',
      mapped: false,
      helperText: 'As permissoes atuais desse perfil nao puderam ser carregadas.',
    };
  }

  const enabledScreens = ALL_SCREEN_KEYS.filter((screenKey) =>
    permissionTemplate.allowedScreens.includes(screenKey)
  );
  const disabledScreens = ALL_SCREEN_KEYS.filter((screenKey) => !enabledScreens.includes(screenKey));
  const enabledCount = enabledScreens.length;
  const totalCount = ALL_SCREEN_KEYS.length;

  return {
    enabledScreens,
    disabledScreens,
    enabledCount,
    totalCount,
    coveragePercent: totalCount === 0 ? 0 : Math.round((enabledCount / totalCount) * 100),
    accessLevelLabel: permissionTemplate.type === 'FULL_ACCESS' ? 'Acesso total' : 'Leitura',
    mapped: true,
    helperText:
      permissionTemplate.type === 'FULL_ACCESS'
        ? 'Pode editar os recursos liberados pelo perfil.'
        : 'Pode apenas visualizar os recursos liberados pelo perfil.',
  };
}

function toManagedUser(
  user: UsuarioResponseDTO,
  profileCatalog: ProfileDTO[] = [],
  profileOptions: ProfileOption[] = []
): ManagedUser {
  const profileValue = normalizeProfileToken(user.perfil) || DEFAULT_ROLE_VALUE;
  const profileDefinition = findProfileDefinition(profileValue, profileValue, profileCatalog);
  const role = profileDefinition?.description ?? mapPerfilToRole(profileValue, profileOptions);

  return {
    id: user.id,
    name: user.nome,
    login: user.login,
    role,
    profileValue,
    team: 'â€”',
    status: user.ativo ? 'active' : 'inactive',
    lastAccess: 'â€”',
    permissionDetails: buildUserPermissionDetails(profileValue, role, profileCatalog),
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
  return getUserFacingErrorMessage(error, fallback);
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

  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}

export default function UserScreen() {
  const { theme } = useThemeContext();
  const { hasPermission } = usePermissions();
  const { width } = useWindowDimensions();
  const userScrollableLayout = useAppScreenScrollableLayout(16);
  const isCompact = width < 780;
  const colors = theme.colors as typeof theme.colors & { text?: string; textSecondary?: string };
  const textColor = colors.text ?? theme.colors.onSurface;
  const textSecondary = colors.textSecondary ?? theme.colors.onSurfaceVariant;

  const [rawUsers, setRawUsers] = useState<UsuarioResponseDTO[]>([]);
  const [profileCatalog, setProfileCatalog] = useState<ProfileDTO[]>([]);
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(ALL_ROLE_FILTER);
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
  const [isChangePasswordExpanded, setIsChangePasswordExpanded] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<StatusConfirmTarget | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback | null>(null);
  const [editRoleSelectOpen, setEditRoleSelectOpen] = useState(false);
  const [permissionModalUserId, setPermissionModalUserId] = useState<number | null>(null);
  const [permissionModalRoleValue, setPermissionModalRoleValue] = useState(DEFAULT_ROLE_VALUE);
  const [permissionRoleSelectOpen, setPermissionRoleSelectOpen] = useState(false);

  const actionTransitionStyle = Platform.OS === 'web' ? styles.interactiveWeb : undefined;
  const actionBusy = submitting || savingPassword;
  const reloadBusy = loading || refreshing;
  const canEditUserProfiles = hasPermission('PROFILES', 'EDIT');
  const isEditModalVisible = editingUserId !== null;
  const isStatusConfirmModalVisible = statusConfirmTarget !== null;
  const isPermissionModalVisible = permissionModalUserId !== null;
  const isAnyModalVisible =
    isEditModalVisible || isStatusConfirmModalVisible || isPermissionModalVisible;

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
      const { palette, pressed, hovered, active, disabled } = resolveInteractiveState(
        state,
        options
      );

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

  const roleFilterOptions = useMemo<
    Array<{
      value: RoleFilter;
      label: string;
      accessibilityLabel: string;
    }>
  >(
    () => [
      {
        value: ALL_ROLE_FILTER,
        label: 'Todos',
        accessibilityLabel: 'action-users-filter-role-todos',
      },
      ...profileOptions.map((option) => ({
        value: option.value,
        label: option.label,
        accessibilityLabel: option.accessibilityLabel,
      })),
    ],
    [profileOptions]
  );

  const defaultRoleValue = useMemo(() => {
    return (
      profileOptions.find((option) => option.value === DEFAULT_ROLE_VALUE)?.value ??
      profileOptions[0]?.value ??
      DEFAULT_ROLE_VALUE
    );
  }, [profileOptions]);

  const users = useMemo(() => {
    return rawUsers.map((user) => toManagedUser(user, profileCatalog, profileOptions));
  }, [profileCatalog, profileOptions, rawUsers]);

  const editableProfileOptions = useMemo(() => {
    if (!editForm.role) {
      return profileOptions;
    }

    if (findProfileOption(profileOptions, editForm.role)) {
      return profileOptions;
    }

    return [...profileOptions, buildUnavailableProfileOption(editForm.role)];
  }, [editForm.role, profileOptions]);

  const selectedEditRoleOption = useMemo(() => {
    return findProfileOption(editableProfileOptions, editForm.role);
  }, [editForm.role, editableProfileOptions]);

  const isSelectedEditRoleAvailable = selectedEditRoleOption?.available !== false;

  const selectedEditRoleLabel = useMemo(() => {
    return mapPerfilToRole(editForm.role, editableProfileOptions);
  }, [editForm.role, editableProfileOptions]);

  const editProfileSelectOptions = useMemo<FilterSelectOption[]>(() => {
    return editableProfileOptions.map((profileOption) => ({
      value: profileOption.value,
      label: profileOption.label,
      accessibilityLabel: profileOption.accessibilityLabel,
      disabled: !profileOption.available,
    }));
  }, [editableProfileOptions]);

  const permissionModalUser = useMemo(() => {
    if (permissionModalUserId === null) {
      return null;
    }

    return users.find((user) => user.id === permissionModalUserId) ?? null;
  }, [permissionModalUserId, users]);

  const permissionModalProfileOptions = useMemo(() => {
    if (!permissionModalRoleValue) {
      return profileOptions;
    }

    if (findProfileOption(profileOptions, permissionModalRoleValue)) {
      return profileOptions;
    }

    return [...profileOptions, buildUnavailableProfileOption(permissionModalRoleValue)];
  }, [permissionModalRoleValue, profileOptions]);

  const permissionModalSelectedOption = useMemo(() => {
    return findProfileOption(permissionModalProfileOptions, permissionModalRoleValue);
  }, [permissionModalProfileOptions, permissionModalRoleValue]);

  const isSelectedPermissionRoleAvailable = permissionModalSelectedOption?.available !== false;

  const permissionProfileSelectOptions = useMemo<FilterSelectOption[]>(() => {
    return permissionModalProfileOptions.map((profileOption) => ({
      value: profileOption.value,
      label: profileOption.label,
      accessibilityLabel: profileOption.accessibilityLabel,
      disabled: !profileOption.available,
    }));
  }, [permissionModalProfileOptions]);

  const permissionModalRoleLabel = useMemo(() => {
    return mapPerfilToRole(permissionModalRoleValue, permissionModalProfileOptions);
  }, [permissionModalProfileOptions, permissionModalRoleValue]);

  const permissionModalDetails = useMemo(() => {
    return buildUserPermissionDetails(
      permissionModalRoleValue,
      permissionModalRoleLabel,
      profileCatalog
    );
  }, [permissionModalRoleLabel, permissionModalRoleValue, profileCatalog]);

  const canSavePermissionProfile =
    canEditUserProfiles &&
    permissionModalUser !== null &&
    isSelectedPermissionRoleAvailable &&
    normalizeProfileToken(permissionModalUser.profileValue) !==
      normalizeProfileToken(permissionModalRoleValue);

  const loadUsersContext = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      setErrorMessage('');

      if (mode === 'refresh') {
        setRefreshing(true);
      } else if (mode === 'initial') {
        setLoading(true);
      }

      try {
        const [profilesResult, usersResult] = await Promise.allSettled([
          listProfiles({
            page: 0,
            size: 100,
          }),
          listarUsuarios(),
        ]);

        if (profilesResult.status === 'fulfilled') {
          const nextCatalog = Array.isArray(profilesResult.value.items)
            ? profilesResult.value.items
            : [];

          setProfileCatalog(nextCatalog);
          setProfileOptions(buildProfileOptionsFromCatalog(nextCatalog));
        } else {
          console.error('Falha ao carregar catálogo de perfis na tela de usuários:', profilesResult.reason);

          if (profileCatalog.length === 0) {
            try {
              const fallbackOptions = buildProfileOptionsFromCatalog(
                (await listarPerfisAtivosUsuario()).map((profile) => ({
                  id: profile.id,
                  code: profile.code,
                  type: profile.type,
                  description: profile.description,
                  allowedScreens: [],
                  active: profile.active,
                }))
              );

              setProfileOptions(fallbackOptions);
            } catch (fallbackError) {
              console.error('Falha ao carregar perfis ativos para a tela de usuários:', fallbackError);
              setProfileOptions([]);
            }
          }
        }

        if (usersResult.status === 'fulfilled') {
          setRawUsers(Array.isArray(usersResult.value) ? usersResult.value : []);
        } else {
          throw usersResult.reason;
        }
      } catch (error) {
        console.error('Falha ao listar usuários:', error);
        const backendMessage = resolveRequestErrorMessage(error, '');
        setErrorMessage(backendMessage || API_STATE_MESSAGES.users.error.description);
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else if (mode === 'initial') {
          setLoading(false);
        }
      }
    },
    [profileCatalog.length]
  );

  useFocusEffect(
    useCallback(() => {
      const mode =
        rawUsers.length === 0 && profileCatalog.length === 0 && !errorMessage ? 'initial' : 'silent';

      void loadUsersContext(mode);
    }, [errorMessage, loadUsersContext, profileCatalog.length, rawUsers.length])
  );

  useEffect(() => {
    if (
      roleFilter !== ALL_ROLE_FILTER &&
      !roleFilterOptions.some((option) => option.value === roleFilter)
    ) {
      setRoleFilter(ALL_ROLE_FILTER);
    }
  }, [roleFilter, roleFilterOptions]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return users.filter((user) => {
      const byStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? user.status === 'active'
            : user.status === 'inactive';
      const byRole = roleFilter === ALL_ROLE_FILTER ? true : user.profileValue === roleFilter;
      const bySearch =
        needle === ''
          ? true
          : [user.name, user.login, user.team, user.role].join(' ').toLowerCase().includes(needle);

      return byStatus && byRole && bySearch;
    });
  }, [roleFilter, search, statusFilter, users]);

  const hasUserFilters = useMemo(() => {
    return search.trim() !== '' || statusFilter !== 'all' || roleFilter !== ALL_ROLE_FILTER;
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
    setIsChangePasswordExpanded(false);
  };

  const toggleChangePasswordSection = () => {
    setIsChangePasswordExpanded((current) => {
      if (current) {
        setChangePasswordForm(emptyChangePasswordForm);
        setShowSenhaAtual(false);
        setShowNovaSenha(false);
        setShowConfirmarNovaSenha(false);
      }

      return !current;
    });
  };

  const closeEdit = () => {
    setEditingUserId(null);
    setEditForm(emptyEditForm);
    setEditRoleSelectOpen(false);
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const openCreate = () => {
    setEditingUserId('new');
    setEditForm({
      ...emptyEditForm,
      role: defaultRoleValue,
    });
    setEditRoleSelectOpen(false);
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name,
      login: user.login,
      role: user.profileValue,
      password: '',
      confirmPassword: '',
    });
    setEditRoleSelectOpen(false);
    resetCreatePasswordState();
    resetChangePasswordState();
  };

  const openPermissionModal = (user: ManagedUser) => {
    setPermissionModalUserId(user.id);
    setPermissionModalRoleValue(user.profileValue);
    setPermissionRoleSelectOpen(false);
  };

  const closePermissionModal = () => {
    setPermissionModalUserId(null);
    setPermissionModalRoleValue(DEFAULT_ROLE_VALUE);
    setPermissionRoleSelectOpen(false);
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
      Alert.alert('ValidaÃ§Ã£o', 'Informe um nome vÃ¡lido.');
      return;
    }

    if (!isLoginValid(login)) {
      Alert.alert('ValidaÃ§Ã£o', 'Informe um login vÃ¡lido.');
      return;
    }

    if (!isSelectedEditRoleAvailable) {
      Alert.alert('Perfil indisponivel', 'Selecione um perfil ativo para salvar o usuario.');
      return;
    }

    if (creating) {
      if (password.length < 6) {
        Alert.alert('ValidaÃ§Ã£o', 'A senha deve ter no mÃ­nimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('ValidaÃ§Ã£o', 'A confirmaÃ§Ã£o de senha nÃ£o confere.');
        return;
      }
    }

    try {
      setSubmitting(true);

      if (creating) {
        await criarUsuario({
          login,
          nome: name,
          perfil: mapRoleToPerfil(editForm.role, editableProfileOptions),
          senha: password,
        });
      } else {
        const userId = Number(editingUserId);
        await atualizarUsuario(userId, {
          login,
          nome: name,
          perfil: mapRoleToPerfil(editForm.role, editableProfileOptions),
        });
      }

      closeEdit();
      await loadUsersContext('silent');
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
      await loadUsersContext('silent');
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
      await loadUsersContext('silent');
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

  const savePermissionProfile = async () => {
    if (!permissionModalUser) {
      return;
    }

    if (!canEditUserProfiles) {
      closePermissionModal();
      return;
    }

    if (!isSelectedPermissionRoleAvailable) {
      Alert.alert('Perfil indisponivel', 'Selecione um perfil ativo para atualizar as permissoes do usuario.');
      return;
    }

    try {
      setSubmitting(true);
      await atualizarUsuario(permissionModalUser.id, {
        login: permissionModalUser.login,
        nome: permissionModalUser.name,
        perfil: mapRoleToPerfil(permissionModalRoleValue, permissionModalProfileOptions),
      });
      closePermissionModal();
      await loadUsersContext('silent');
      setStatusFeedback({
        type: 'success',
        message: `Perfil e permissoes de ${permissionModalUser.name} atualizados com sucesso.`,
      });
    } catch (error) {
      console.error('Falha ao atualizar perfil pelo modal de permissoes:', error);
      setStatusFeedback({
        type: 'error',
        message: resolveRequestErrorMessage(
          error,
          'Nao foi possivel atualizar o perfil do usuario.'
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSaveUser =
    editForm.name.trim().length >= 2 &&
    isLoginValid(editForm.login) &&
    isSelectedEditRoleAvailable &&
    (editingUserId === 'new'
      ? editForm.password.trim().length >= 6 &&
        editForm.password.trim() === editForm.confirmPassword.trim()
      : true);

  const renderFilterDropdown = <T extends string>(params: {
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
        <Text style={[styles.filterLabel, { color: theme.colors.primary }]}>{label}</Text>

        <View style={[styles.filterDropdownAnchor, isOpen && styles.filterDropdownAnchorOpen]}>
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
                  <Text style={[styles.filterDropdownValue, { color: textColor }]}>
                    {selectedLabel}
                  </Text>
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
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: 'transparent' }]}
        scrollEnabled={!isAnyModalVisible}
        contentContainerStyle={[styles.container, userScrollableLayout.contentContainerStyle]}
        onScrollBeginDrag={() => setOpenDropdown(null)}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadUsersContext('refresh')} />
        }
        {...userScrollableLayout.scrollViewProps}
      >
        <Surface
          style={[
            styles.sectionCard,
            openDropdown !== null && styles.sectionCardRaised,
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

          <View
            style={[
              styles.filterControlsRow,
              isCompact && styles.filterControlsRowCompact,
              openDropdown !== null && styles.filterControlsRowRaised,
            ]}
          >
            <View
              style={[
                styles.filterDropdownRow,
                isCompact && styles.filterDropdownRowCompact,
                openDropdown !== null && styles.filterDropdownRowRaised,
              ]}
            >
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
                options: roleFilterOptions,
                onSelect: (value) => setRoleFilter(value),
              })}
            </View>

            <View style={[styles.filterActionsRow, isCompact && styles.filterActionsRowCompact]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="action-reload-users"
                onPress={() => void loadUsersContext('silent')}
                disabled={actionBusy || reloadBusy}
                style={(state) => [
                  styles.actionButtonBase,
                  styles.topActionBtn,
                  isCompact && styles.topActionBtnCompact,
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
                      <Text
                        numberOfLines={1}
                        style={[styles.actionButtonText, { color: contentColor }]}
                      >
                        Recarregar
                      </Text>
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
                  isCompact && styles.createBtnCompact,
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
                      <MaterialCommunityIcons
                        name="account-plus-outline"
                        size={18}
                        color={iconColor}
                      />
                      <Text style={[styles.actionButtonText, { color: contentColor }]}>
                        Novo usuário
                      </Text>
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
              description={API_STATE_MESSAGES.users.error.description}
              icon="alert-circle-outline"
              tone="error"
              onRetry={() => void loadUsersContext('silent')}
            />
          </Surface>
        ) : null}

        {!loading && !errorMessage ? (
          <View style={styles.listBlock}>
            {filteredUsers.map((user) => {
              const isUserActive = user.status === 'active';
              const initials = getUserInitials(user.name);
              const {
                enabledCount,
                totalCount,
                coveragePercent,
                accessLevelLabel,
                helperText,
                mapped,
              } = user.permissionDetails;

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
                        <Text style={[styles.userInfo, { color: textSecondary }]}>
                          {user.login}
                        </Text>

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
                            Ãšltimo acesso {user.lastAccess}
                          </Text>
                        </View> */}
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.tags,
                        !isCompact && styles.tagsCentered,
                        isCompact && styles.tagsCompact,
                      ]}
                    >
                      <View pointerEvents="none">
                        <Chip compact>{user.role}</Chip>
                      </View>
                      <View pointerEvents="none">
                        <Chip compact>{statusLabel[user.status]}</Chip>
                      </View>
                      <View pointerEvents="none">
                        <Chip compact>{enabledCount}/{totalCount} telas</Chip>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.userMiddle, isCompact && styles.userMiddleCompact]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`action-user-permissions-${user.id}`}
                      onPress={() => openPermissionModal(user)}
                      disabled={actionBusy}
                      style={(state) => [
                        styles.permissionPanel,
                        actionTransitionStyle,
                        resolveInteractiveStyle(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        }),
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      {(state) => {
                        const iconColor = resolveInteractiveIconColor(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        });
                        const hintColor = resolveInteractiveTextColor(state, {
                          variant: 'neutral',
                          disabled: actionBusy,
                        });

                        return (
                          <>
                            <View style={styles.permissionHeaderRow}>
                              <View style={styles.permissionHeaderTextBlock}>
                                <Text style={[styles.permissionLabel, { color: textSecondary }]}>
                                  Permissoes
                                </Text>
                                <Text style={[styles.permissionValue, { color: textColor }]}>
                                  {enabledCount} de {totalCount} telas
                                </Text>
                              </View>

                              <MaterialCommunityIcons
                                name={
                                  canEditUserProfiles
                                    ? 'shield-key-outline'
                                    : 'shield-check-outline'
                                }
                                size={18}
                                color={iconColor}
                              />
                            </View>

                            <View style={styles.permissionMetaRow}>
                              <Text style={[styles.permissionMetaText, { color: textSecondary }]}>
                                Cobertura {coveragePercent}% · {accessLevelLabel}
                              </Text>
                              <Text style={[styles.permissionMetaCta, { color: hintColor }]}>
                                {canEditUserProfiles
                                  ? 'Clique para visualizar ou editar'
                                  : 'Clique para visualizar'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.permissionTrack,
                                {
                                  backgroundColor: withAlpha(theme.colors.primary, 0.08),
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.permissionFill,
                                  {
                                    backgroundColor: mapped
                                      ? theme.colors.primary
                                      : theme.colors.outline,
                                    width: `${coveragePercent}%`,
                                  },
                                ]}
                              />
                            </View>

                            <Text style={[styles.permissionSupportText, { color: textSecondary }]}>
                              {helperText}
                            </Text>
                          </>
                        );
                      }}
                    </Pressable>

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
                              <MaterialCommunityIcons
                                name="pencil-outline"
                                size={18}
                                color={iconColor}
                              />
                              <Text style={[styles.actionButtonText, { color: contentColor }]}>
                                Editar
                              </Text>
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
                                name={
                                  isUserActive ? 'account-off-outline' : 'account-check-outline'
                                }
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

            {filteredUsers.length === 0 ? (
              <Surface
                style={[
                  styles.empty,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                elevation={0}
              >
                <AppEmptyState
                  title={usersEmptyCopy.title}
                  description={usersEmptyCopy.description}
                  icon="account-search-outline"
                  tipo={
                    search.trim().length > 0 ||
                    statusFilter !== 'all' ||
                    roleFilter !== ALL_ROLE_FILTER
                      ? 'semResultado'
                      : 'vazio'
                  }
                />
              </Surface>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <AppModalFrame
        visible={isEditModalVisible}
        title={editingUserId === 'new' ? 'Novo usuário' : 'Editar usuário'}
        onDismiss={closeEdit}
        dismissDisabled={submitting || savingPassword}
        maxWidth={560}
        maxHeightRatio={0.85}
        actions={[
          {
            label: 'Cancelar',
            onPress: closeEdit,
            disabled: submitting || savingPassword,
            tone: 'secondary',
          },
          {
            label: 'Salvar usuário',
            onPress: () => {
              void saveUser();
            },
            disabled: !canSaveUser || submitting || savingPassword,
            loading: submitting,
            tone: 'primary',
          },
        ]}
      >
        <AppTextInput
          label="Nome"
          value={editForm.name}
          autoComplete="off"
          textContentType="none"
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
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, confirmPassword: value }))}
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

        {canEditUserProfiles ? (
          <View style={styles.profileSelectWrap}>
            <FilterSelect
              label="Perfil"
              value={editForm.role}
              valueLabel={selectedEditRoleLabel}
              options={editProfileSelectOptions}
              onSelect={(value) => setEditForm((prev) => ({ ...prev, role: value }))}
              disabled={submitting || savingPassword || editProfileSelectOptions.length === 0}
              open={editRoleSelectOpen}
              onOpenChange={setEditRoleSelectOpen}
              width="100%"
              minWidth={0}
              maxWidth={560}
              accessibilityLabel="Selecionar perfil do usuario"
            />
          </View>
        ) : (
          <>
            <Text style={[styles.helperText, { color: textSecondary }]}>Perfil</Text>
            <Text style={[styles.userInfo, { color: textColor }]}>{selectedEditRoleLabel}</Text>
          </>
        )}

        {!isSelectedEditRoleAvailable ? (
          <Text style={[styles.inlineWarningText, { color: DANGER_ACTION_COLOR }]}>
            O perfil atual nao esta mais ativo no backend. Selecione um perfil valido para salvar.
          </Text>
        ) : null}

        {typeof editingUserId === 'number' ? (
          <View style={styles.passwordSection}>
            <Divider style={styles.passwordDivider} />
            <Button
              mode="text"
              icon={isChangePasswordExpanded ? 'chevron-up' : 'lock-outline'}
              onPress={toggleChangePasswordSection}
              disabled={submitting || savingPassword}
            >
              {isChangePasswordExpanded ? 'Ocultar alteração de senha' : 'Alterar senha'}
            </Button>

            {isChangePasswordExpanded ? (
              <>
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
              </>
            ) : null}
          </View>
        ) : null}
      </AppModalFrame>

      <AppModalFrame
        visible={isPermissionModalVisible}
        title="Permissoes do usuario"
        subtitle={permissionModalUser?.name ?? 'Visualize as permissoes herdadas pelo perfil'}
        onDismiss={closePermissionModal}
        dismissDisabled={submitting}
        maxWidth={620}
        maxHeightRatio={0.86}
        bodyStyle={styles.permissionModalBodyScroll}
        scrollContentStyle={styles.permissionModalBodyContent}
        actions={[
          {
            label: canEditUserProfiles ? 'Fechar' : 'OK',
            onPress: closePermissionModal,
            disabled: submitting,
            tone: 'secondary',
          },
          ...(canEditUserProfiles
            ? [
                {
                  label: 'Salvar perfil',
                  onPress: () => {
                    void savePermissionProfile();
                  },
                  disabled: !canSavePermissionProfile || submitting,
                  loading: submitting,
                  tone: 'primary' as const,
                },
              ]
            : []),
        ]}
      >
        {permissionModalUser ? (
          <>
            <Surface
              style={[
                styles.permissionModalSummaryCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={0}
            >
              <View style={styles.permissionModalSummaryRow}>
                <View style={styles.permissionModalSummaryBlock}>
                  <Text style={[styles.permissionModalSummaryLabel, { color: textSecondary }]}>
                    Usuario
                  </Text>
                  <Text style={[styles.permissionModalSummaryValue, { color: textColor }]}>
                    {permissionModalUser.name}
                  </Text>
                </View>

                <View style={styles.permissionModalSummaryBlock}>
                  <Text style={[styles.permissionModalSummaryLabel, { color: textSecondary }]}>
                    Perfil em uso
                  </Text>
                  <Text style={[styles.permissionModalSummaryValue, { color: textColor }]}>
                    {permissionModalRoleLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.permissionModalSummaryMetrics}>
                <View style={styles.permissionMetricItem}>
                  <Text style={[styles.permissionMetricLabel, { color: textSecondary }]}>
                    Cobertura
                  </Text>
                  <Text style={[styles.permissionMetricValue, { color: textColor }]}>
                    {permissionModalDetails.coveragePercent}%
                  </Text>
                </View>

                <View style={styles.permissionMetricItem}>
                  <Text style={[styles.permissionMetricLabel, { color: textSecondary }]}>
                    Telas habilitadas
                  </Text>
                  <Text style={[styles.permissionMetricValue, { color: textColor }]}>
                    {permissionModalDetails.enabledCount} de {permissionModalDetails.totalCount}
                  </Text>
                </View>

                <View style={styles.permissionMetricItem}>
                  <Text style={[styles.permissionMetricLabel, { color: textSecondary }]}>
                    Nivel
                  </Text>
                  <Text style={[styles.permissionMetricValue, { color: textColor }]}>
                    {permissionModalDetails.accessLevelLabel}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.permissionTrack,
                  {
                    backgroundColor: withAlpha(theme.colors.primary, 0.08),
                  },
                ]}
              >
                <View
                  style={[
                    styles.permissionFill,
                    {
                      backgroundColor: permissionModalDetails.mapped
                        ? theme.colors.primary
                        : theme.colors.outline,
                      width: `${permissionModalDetails.coveragePercent}%`,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.permissionSupportText, { color: textSecondary }]}>
                {permissionModalDetails.helperText}
              </Text>
            </Surface>

            {canEditUserProfiles ? (
              <View style={styles.permissionModalEditorSection}>
                <FilterSelect
                  label="Perfil"
                  value={permissionModalRoleValue}
                  valueLabel={permissionModalRoleLabel}
                  options={permissionProfileSelectOptions}
                  onSelect={setPermissionModalRoleValue}
                  disabled={submitting || permissionProfileSelectOptions.length === 0}
                  open={permissionRoleSelectOpen}
                  onOpenChange={setPermissionRoleSelectOpen}
                  width="100%"
                  minWidth={0}
                  maxWidth={600}
                  accessibilityLabel="Selecionar perfil para atualizar permissoes"
                />

                {!isSelectedPermissionRoleAvailable ? (
                  <Text style={[styles.inlineWarningText, { color: DANGER_ACTION_COLOR }]}>
                    O perfil atual nao esta disponivel. Selecione um perfil ativo para atualizar o usuario.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.permissionList}>
              {ALL_SCREEN_KEYS.map((screenKey) => {
                const screenEnabled = permissionModalDetails.enabledScreens.includes(screenKey);
                const screenStatusLabel = screenEnabled
                  ? permissionModalDetails.accessLevelLabel === 'Acesso total'
                    ? 'Edicao'
                    : 'Leitura'
                  : 'Bloqueada';
                const screenStatusColor = screenEnabled
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant;

                return (
                  <View
                    key={screenKey}
                    style={[
                      styles.permissionListItem,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.permissionListItemText}>
                      <Text style={[styles.permissionListTitle, { color: textColor }]}>
                        {SCREEN_LABELS[screenKey]}
                      </Text>
                      <Text style={[styles.permissionListDescription, { color: textSecondary }]}>
                        {screenEnabled
                          ? permissionModalDetails.accessLevelLabel === 'Acesso total'
                            ? 'Tela liberada para consulta e alteracao.'
                            : 'Tela liberada apenas para consulta.'
                          : 'Tela bloqueada para este perfil.'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.permissionStatusPill,
                        {
                          backgroundColor: screenEnabled
                            ? withAlpha(theme.colors.primary, 0.1)
                            : theme.colors.surfaceVariant,
                          borderColor: screenEnabled
                            ? withAlpha(theme.colors.primary, 0.26)
                            : theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <Text style={[styles.permissionStatusPillText, { color: screenStatusColor }]}>
                        {screenStatusLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </AppModalFrame>

      <AppModalFrame
        visible={isStatusConfirmModalVisible}
        title="Inativar usuário"
        subtitle={'Deseja inativar ' + (statusConfirmTarget?.name ?? 'este usuário') + '?'}
        onDismiss={closeStatusConfirm}
        dismissDisabled={submitting || savingPassword}
        maxWidth={460}
        maxHeightRatio={0.8}
        actions={[
          {
            label: 'Cancelar',
            onPress: closeStatusConfirm,
            disabled: submitting || savingPassword,
            tone: 'secondary',
          },
          {
            label: 'Inativar',
            onPress: () => {
              void confirmInactivation();
            },
            disabled: submitting || savingPassword,
            tone: 'danger',
          },
        ]}
      />
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
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  container: { gap: 12 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14, overflow: 'visible' },
  sectionCardRaised: {
    zIndex: 120,
    elevation: 8,
  },
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
  topActionBtnCompact: { flex: 1, minWidth: 0 },
  createBtn: { minWidth: 170 },
  createBtnCompact: { flex: 1, minWidth: 0 },
  actionButtonText: { flexShrink: 1, fontSize: 14, fontWeight: '800' },
  input: { marginBottom: 8 },
  profileSelectWrap: {
    marginBottom: 6,
  },
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
    overflow: 'visible',
  },
  filterControlsRowRaised: { zIndex: 140 },
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
    overflow: 'visible',
  },
  filterDropdownRowRaised: { zIndex: 150 },
  filterDropdownRowCompact: { flexDirection: 'column', gap: 10 },
  filterActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  filterActionsRowCompact: {
    width: '100%',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  filterDropdownGroup: {
    flex: 1,
    minWidth: 200,
    maxWidth: 320,
    position: 'relative',
    overflow: 'visible',
  },
  filterDropdownGroupCompact: { width: '100%', minWidth: 0, maxWidth: '100%' },
  filterDropdownGroupOpen: { zIndex: 160, elevation: 12 },
  filterLabel: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterDropdownAnchor: {
    position: 'relative',
    overflow: 'visible',
  },
  filterDropdownAnchorOpen: {
    zIndex: 180,
    elevation: 14,
  },
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
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    gap: 6,
    zIndex: 220,
    elevation: 18,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
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
  listBlock: {
    gap: 10,
    overflow: 'visible',
  },
  userCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    overflow: 'visible',
  },
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
  tagsCentered: { alignSelf: 'center' },
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
    overflow: 'visible',
  },
  userMiddleCompact: { flexDirection: 'column', alignItems: 'stretch' },
  permissionPanel: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 230,
    flex: 1,
  },
  permissionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  permissionHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  permissionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  permissionValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  permissionMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  permissionMetaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
  },
  permissionMetaCta: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  permissionTrack: { marginTop: 8, height: 6, borderRadius: 999, overflow: 'hidden' },
  permissionFill: { height: '100%', borderRadius: 999 },
  permissionSupportText: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    overflow: 'visible',
  },
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
  modalBackdropLayer:
    Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        } as any)
      : {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        },
  modalViewport:
    Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          paddingHorizontal: 14,
          paddingVertical: 16,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'visible',
        } as any)
      : {
          ...StyleSheet.absoluteFillObject,
          zIndex: 1000,
          paddingHorizontal: 14,
          paddingVertical: 16,
          justifyContent: 'center',
          alignItems: 'center',
        },
  modal: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalBodyScroll: {
    width: '100%',
    minHeight: 0,
    flexShrink: 1,
  },
  modalBodyContent: { padding: 14, paddingBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  confirmModal: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  confirmModalBodyContent: { padding: 14, paddingBottom: 18 },
  confirmTitle: { marginBottom: 4 },
  confirmMessage: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  helperText: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  inlineWarningText: {
    marginTop: 2,
    marginBottom: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  passwordSection: { marginTop: 8 },
  passwordDivider: { marginBottom: 10 },
  passwordTitle: { fontSize: 16, marginBottom: 6 },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  permissionModalSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  permissionModalSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  permissionModalSummaryBlock: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  permissionModalSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  permissionModalSummaryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  permissionModalSummaryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  permissionMetricItem: {
    flex: 1,
    minWidth: 140,
    gap: 2,
  },
  permissionMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  permissionMetricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  permissionModalEditorSection: {
    marginBottom: 14,
    position: 'relative',
    zIndex: 3200,
    elevation: 32,
  },
  permissionModalBodyScroll: {
    overflow: 'visible',
  },
  permissionModalBodyContent: {
    overflow: 'visible',
  },
  permissionList: {
    gap: 8,
    position: 'relative',
    zIndex: 1,
  },
  permissionListItem: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  permissionListItemText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  permissionListTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  permissionListDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  permissionStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  permissionStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
