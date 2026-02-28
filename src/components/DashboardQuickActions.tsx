import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

const IS_WEB = Platform.OS === 'web';

type DrawerRouteName = 'Armazém' | 'Histórico' | 'Usuários' | 'Perfil' | 'Dashboard';

type QuickAction = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route: DrawerRouteName;
};

type DashboardQuickActionsProps = {
  navigation: NavigationProp<ParamListBase>;
  isWide: boolean;
  user: unknown;
};

function normalizeRole(user: any): string {
  const rawRoleCandidates = [
    user?.role,
    user?.perfil,
    user?.claims?.role,
    user?.claims?.perfil,
    user?.authorities?.[0],
    user?.roles?.[0],
  ];

  for (const candidate of rawRoleCandidates) {
    if (typeof candidate !== 'string') {
      continue;
    }
    const normalized = candidate
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '');
    if (normalized) {
      return normalized;
    }
  }

  return 'OPERADOR';
}

export const canAccessUsers = (user: any): boolean => {
  const role = normalizeRole(user);
  return role === 'ADMIN' || role === 'ADMINISTRADOR' || role === 'GERENTE';
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

function getAvailableRouteNames(navigation: NavigationProp<ParamListBase>): Set<string> {
  const routeNames = new Set<string>();

  const currentState = navigation.getState?.();
  currentState?.routeNames?.forEach((name) => routeNames.add(String(name)));

  const parentState = navigation.getParent?.()?.getState?.();
  parentState?.routeNames?.forEach((name) => routeNames.add(String(name)));

  return routeNames;
}

export default function DashboardQuickActions({
  navigation,
  isWide,
  user,
}: DashboardQuickActionsProps) {
  const { theme } = useThemeContext();
  const colors = theme.colors;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const availableRouteNames = getAvailableRouteNames(navigation);
  const hasRoute = (route: DrawerRouteName): boolean => availableRouteNames.has(route);

  const thirdAction: QuickAction = hasRoute('Usuários')
    ? {
        key: 'users',
        label: 'Usuários',
        icon: 'account-group-outline',
        route: 'Usuários',
      }
    : hasRoute('Perfil')
      ? {
          key: 'profile',
          label: 'Perfil',
          icon: 'account',
          route: 'Perfil',
        }
      : {
          key: 'dashboard',
          label: 'Dashboard',
          icon: 'view-dashboard-outline',
          route: 'Dashboard',
        };

  const candidates: QuickAction[] = [
    { key: 'warehouse', label: 'Armazém', icon: 'warehouse', route: 'Armazém' },
    { key: 'history', label: 'Histórico', icon: 'history', route: 'Histórico' },
    thirdAction,
  ];
  const actions = candidates.filter((action) => hasRoute(action.route));

  if (actions.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.surface, borderColor: colors.outlineVariant },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Ações rápidas</Text>

      <View style={[styles.grid, isWide ? styles.gridWide : styles.gridCompact]}>
        {actions.map((action) => {
          const hovered = IS_WEB && hoveredKey === action.key;

          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={`action-dashboard-quick-${action.key}`}
              onPress={() => navigation.navigate(action.route)}
              onHoverIn={IS_WEB ? () => setHoveredKey(action.key) : undefined}
              onHoverOut={IS_WEB ? () => setHoveredKey(null) : undefined}
              style={({ pressed }) => [
                styles.actionButton,
                isWide ? styles.actionButtonWide : styles.actionButtonCompact,
                {
                  backgroundColor: pressed
                    ? withAlpha(colors.primary, 0.18)
                    : hovered
                      ? withAlpha(colors.primary, 0.12)
                      : colors.surfaceVariant,
                  borderColor: hovered || pressed ? withAlpha(colors.primary, 0.7) : colors.outline,
                  shadowColor: colors.primary,
                  shadowOpacity: hovered ? 0.2 : 0.12,
                  shadowRadius: hovered ? 14 : 10,
                  shadowOffset: { width: 0, height: hovered ? 8 : 4 },
                  elevation: hovered ? 3 : 1,
                  opacity: pressed ? 0.96 : 1,
                  transform: [{ translateY: hovered ? -1 : 0 }],
                },
              ]}
            >
              <MaterialCommunityIcons name={action.icon} size={24} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  gridWide: {
    flexWrap: 'nowrap',
  },
  gridCompact: {
    flexWrap: 'wrap',
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonWide: {
    flex: 1,
    minWidth: 0,
  },
  actionButtonCompact: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
