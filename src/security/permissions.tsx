import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import AppEmptyState from '../components/AppEmptyState';
import { useAuth } from '../auth/AuthContext';
import { useThemeContext } from '../theme/ThemeContext';
import { ActionKey, ProfileDTO, ScreenKey } from '../types/ProfileDTO';

export const SCREEN_LABELS: Record<ScreenKey, string> = {
  DASHBOARD: 'Dashboard',
  REPORTS: 'Relatorios',
  WAREHOUSE: 'Armazem',
  PRODUCTS: 'Produtos',
  USERS: 'Usuarios',
  HISTORY: 'Historico',
  PROFILES: 'Perfis',
};

const ALL_SCREENS: ScreenKey[] = [
  'DASHBOARD',
  'REPORTS',
  'WAREHOUSE',
  'PRODUCTS',
  'USERS',
  'HISTORY',
  'PROFILES',
];

const DEFAULT_PROFILE_SEED: ProfileDTO[] = [
  {
    id: 1,
    type: 'FULL_ACCESS',
    description: 'Administrador',
    allowedScreens: ALL_SCREENS,
    active: true,
  },
  {
    id: 2,
    type: 'FULL_ACCESS',
    description: 'Operador',
    allowedScreens: ['DASHBOARD', 'REPORTS', 'WAREHOUSE', 'PRODUCTS', 'HISTORY'],
    active: true,
  },
  {
    id: 3,
    type: 'READ_ONLY',
    description: 'Leitura',
    allowedScreens: ['DASHBOARD', 'REPORTS', 'WAREHOUSE', 'PRODUCTS', 'HISTORY'],
    active: true,
  },
];

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toUpperCase()
    .trim();
}

function findDefaultProfile(rawPerfil?: string | null): ProfileDTO {
  const normalized = normalizeToken(String(rawPerfil ?? ''));

  if (normalized.includes('ADMIN')) {
    return DEFAULT_PROFILE_SEED[0];
  }

  if (
    normalized.includes('LEITURA') ||
    normalized.includes('READ_ONLY') ||
    normalized.includes('READONLY')
  ) {
    return DEFAULT_PROFILE_SEED[2];
  }

  if (
    normalized.includes('OPERADOR') ||
    normalized.includes('FULL_ACCESS') ||
    normalized.includes('FULLACCESS')
  ) {
    return DEFAULT_PROFILE_SEED[1];
  }

  return DEFAULT_PROFILE_SEED[1];
}

export function getDefaultProfilesSeed(): ProfileDTO[] {
  return DEFAULT_PROFILE_SEED.map((profile) => ({
    ...profile,
    allowedScreens: [...profile.allowedScreens],
  }));
}

export function resolveProfileForUser(rawPerfil?: string | null): ProfileDTO {
  const fallback = findDefaultProfile(rawPerfil);
  const now = new Date().toISOString();

  return {
    ...fallback,
    createdAt: fallback.createdAt ?? now,
    updatedAt: fallback.updatedAt ?? now,
  };
}

export function canAccessScreenWithProfile(
  profile: Pick<ProfileDTO, 'type' | 'allowedScreens' | 'active'> | null | undefined,
  screenKey: ScreenKey
): boolean {
  if (!profile || profile.active === false) {
    return false;
  }

  return profile.allowedScreens.includes(screenKey);
}

export function canPerformActionWithProfile(
  profile: Pick<ProfileDTO, 'type' | 'allowedScreens' | 'active'> | null | undefined,
  screenKey: ScreenKey,
  action: ActionKey
): boolean {
  if (!canAccessScreenWithProfile(profile, screenKey)) {
    return false;
  }

  if (action === 'VIEW') {
    return true;
  }

  return profile?.type === 'FULL_ACCESS';
}

export function getScreenKeyFromRouteName(routeName: string): ScreenKey | null {
  const normalized = normalizeToken(routeName);

  if (normalized === 'DASHBOARD') return 'DASHBOARD';
  if (normalized === 'RELATORIOS') return 'REPORTS';
  if (normalized === 'ARMAZEM') return 'WAREHOUSE';
  if (normalized === 'PRODUTOS') return 'PRODUCTS';
  if (normalized === 'USUARIOS') return 'USERS';
  if (normalized === 'HISTORICO') return 'HISTORY';
  if (normalized === 'PERFIS') return 'PROFILES';

  return null;
}

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  const profile = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    return resolveProfileForUser(user?.perfil);
  }, [isAuthenticated, user?.perfil]);

  const canAccessScreen = useMemo(
    () => (screenKey: ScreenKey) => canAccessScreenWithProfile(profile, screenKey),
    [profile]
  );

  const hasPermission = useMemo(
    () => (screenKey: ScreenKey, action: ActionKey = 'VIEW') =>
      canPerformActionWithProfile(profile, screenKey, action),
    [profile]
  );

  const canPerform = useMemo(
    () => (screenKey: ScreenKey, action: ActionKey) =>
      canPerformActionWithProfile(profile, screenKey, action),
    [profile]
  );

  return {
    currentProfile: profile,
    canAccessScreen,
    canPerform,
    hasPermission,
  };
}

export function AccessDeniedState({ screenKey }: { screenKey: ScreenKey }) {
  const { theme } = useThemeContext();
  const screenLabel = SCREEN_LABELS[screenKey];

  return (
    <View style={[styles.accessDeniedRoot, { backgroundColor: theme.colors.background }]}>
      <AppEmptyState
        icon="shield-lock-outline"
        tone="error"
        title="Sem permissao"
        description={`Seu perfil nao possui acesso a ${screenLabel}.`}
        style={styles.accessDeniedInner}
      />
      <Text style={[styles.accessDeniedHint, { color: theme.colors.onSurfaceVariant }]}>
        Solicite liberacao para um administrador se precisar acessar esta tela.
      </Text>
    </View>
  );
}

export function RequireScreenAccess({
  screenKey,
  children,
}: {
  screenKey: ScreenKey;
  children: React.ReactNode;
}) {
  const { canAccessScreen } = usePermissions();

  if (!canAccessScreen(screenKey)) {
    return <AccessDeniedState screenKey={screenKey} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  accessDeniedRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 10,
  },
  accessDeniedInner: {
    minHeight: 0,
  },
  accessDeniedHint: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
});
