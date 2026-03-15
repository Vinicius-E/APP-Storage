// src/navigation/DrawerNavigator.tsx
import React, { useMemo, useState } from 'react';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Modal,
  ScrollView,
} from 'react-native';
import AntDesignBase from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLoadingState from '../components/AppLoadingState';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AreaManagement from '../screens/areas/AreaManagement';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import UserScreen from '../screens/UserScreen';
import ProductManagement from '../screens/products/ProductManagement';
import ProfileManagement from '../screens/profiles/ProfileManagement';
import Warehouse2DView from '../components/Warehouse2DView';
import { useThemeContext } from '../theme/ThemeContext';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthContext';
import { WarehouseSearchProvider, useWarehouseSearch } from '../search/WarehouseSearchContext';
import {
  getScreenKeyFromRouteName,
  RequireScreenAccess,
  usePermissions,
} from '../security/permissions';

const Drawer = createDrawerNavigator();
const IS_WEB = Platform.OS === 'web';

function getInitials(raw?: string) {
  const value = String(raw ?? '').trim();
  if (!value) {
    return 'U';
  }

  const base = value.includes('@') ? value.split('@')[0] : value;
  const parts = base
    .split(/[._\-\s]+/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return base.slice(0, 2).toUpperCase();
  }

  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[1].charAt(0) : parts[0].charAt(1);
  const result = `${first}${second ?? ''}`.toUpperCase();

  return result || 'U';
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

function ProfileScreen() {
  const { theme } = useThemeContext();
  const { user, signOut } = useAuth() as any;
  const { colors } = theme;
  const { width: screenWidth } = useWindowDimensions();

  const isWide = IS_WEB && screenWidth >= 900;
  const dangerButtonWebStyle = IS_WEB
    ? ({
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow, background-color, border-color, opacity, color',
        transitionDuration: '160ms',
        transitionTimingFunction: 'ease-out',
      } as any)
    : null;

  const name = String(user?.nome ?? user?.name ?? 'Usuário');
  const email = String(user?.email ?? user?.username ?? user?.login ?? '');
  const role = String(user?.perfil ?? user?.role ?? user?.authorities?.[0] ?? 'OPERADOR');
  const id = user?.id != null ? String(user.id) : '';
  const createdAt = user?.createdAt ? String(user.createdAt) : '';
  const initials = getInitials(name || email);

  const onSignOut = async () => {
    await signOut();
  };

  return (
    <ScrollView
      style={[styles.profileRoot, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[
        styles.profileContent,
        { paddingHorizontal: 16, paddingVertical: 16 },
      ]}
    >
      <View
        style={[
          styles.profileHeaderCard,
          { backgroundColor: colors.surface, borderColor: colors.outline },
        ]}
      >
        <View style={styles.profileHeaderRow}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.profileAvatarText, { color: colors.onPrimary }]}>{initials}</Text>
          </View>

          <View style={styles.profileHeaderInfo}>
            <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>

            <Text style={[styles.profileEmail, { color: `${colors.text}99` }]} numberOfLines={1}>
              {email || '—'}
            </Text>

            <View style={styles.profileChipsRow}>
              <View style={[styles.profileChip, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.profileChipText, { color: colors.primary }]} numberOfLines={1}>
                  {role}
                </Text>
              </View>

              {id ? (
                <View style={[styles.profileChip, { backgroundColor: colors.surfaceVariant }]}>
                  <Text
                    style={[styles.profileChipText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    ID: {id}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.profileDivider, { backgroundColor: colors.outline }]} />

        <View style={[styles.profileActionsRow, { flexDirection: isWide ? 'row' : 'column' }]}>
          <Pressable
            onPress={onSignOut}
            style={(state) => {
              const pressed = Boolean(state.pressed);
              const hovered = Boolean((state as any).hovered);
              const active = hovered || pressed;

              return [
                styles.profileDangerButton,
                dangerButtonWebStyle,
                {
                  backgroundColor: pressed
                    ? withAlpha(colors.error, 0.18)
                    : active
                      ? withAlpha(colors.error, 0.12)
                      : 'transparent',
                  borderColor: active ? withAlpha(colors.error, 0.8) : colors.error,
                  shadowColor: colors.error,
                  shadowOpacity: active ? 0.2 : 0,
                  shadowRadius: active ? 14 : 0,
                  shadowOffset: { width: 0, height: active ? 8 : 0 },
                  elevation: active ? 3 : 0,
                  opacity: pressed ? 0.96 : 1,
                  transform: [{ translateY: hovered ? -1 : 0 }],
                  alignSelf: isWide ? 'flex-start' : 'stretch',
                },
              ];
            }}
          >
            <Text style={[styles.profileDangerText, { color: colors.error }]}>Sair</Text>
          </Pressable>

          {createdAt ? (
            <Text style={[styles.profileMeta, { color: `${colors.text}88` }]}>
              Criado em: {createdAt}
            </Text>
          ) : (
            <Text style={[styles.profileMeta, { color: `${colors.text}88` }]}>Conta ativa</Text>
          )}
        </View>
      </View>

      <View
        style={[
          styles.profileGrid,
          {
            flexDirection: isWide ? 'row' : 'column',
            gap: isWide ? 18 : 12,
          },
        ]}
      >
        <View
          style={[
            styles.profileSectionCard,
            { backgroundColor: colors.surface, borderColor: colors.outline },
          ]}
        >
          <Text style={[styles.profileSectionTitle, { color: colors.text }]}>Informações</Text>

          <View style={styles.profileFieldRow}>
            <Text style={[styles.profileFieldLabel, { color: `${colors.text}99` }]}>Nome</Text>
            <Text style={[styles.profileFieldValue, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
          </View>

          <View style={[styles.profileFieldDivider, { backgroundColor: colors.outline }]} />

          <View style={styles.profileFieldRow}>
            <Text style={[styles.profileFieldLabel, { color: `${colors.text}99` }]}>E-mail</Text>
            <Text style={[styles.profileFieldValue, { color: colors.text }]} numberOfLines={1}>
              {email || '—'}
            </Text>
          </View>

          <View style={[styles.profileFieldDivider, { backgroundColor: colors.outline }]} />

          <View style={styles.profileFieldRow}>
            <Text style={[styles.profileFieldLabel, { color: `${colors.text}99` }]}>Perfil</Text>
            <Text style={[styles.profileFieldValue, { color: colors.text }]} numberOfLines={1}>
              {role}
            </Text>
          </View>

          <View style={[styles.profileFieldDivider, { backgroundColor: colors.outline }]} />

          <View style={styles.profileFieldRow}>
            <Text style={[styles.profileFieldLabel, { color: `${colors.text}99` }]}>ID</Text>
            <Text style={[styles.profileFieldValue, { color: colors.text }]} numberOfLines={1}>
              {id || '—'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.profileSectionCard,
            { backgroundColor: colors.surface, borderColor: colors.outline },
          ]}
        >
          <Text style={[styles.profileSectionTitle, { color: colors.text }]}>Sessão</Text>

          <Text style={[styles.profileHint, { color: `${colors.text}88` }]}>
            Para segurança, use “Sair” quando estiver em computadores compartilhados.
          </Text>

          <View style={[styles.profileDivider, { backgroundColor: colors.outline }]} />

          <Text style={[styles.profileHint, { color: `${colors.text}88` }]}>
            Dica: no Armazém você pode usar a busca do topo para encontrar produtos rápido.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ThemedDrawerContent(props: any) {
  const { theme } = useThemeContext();
  const { isAuthenticated, user } = useAuth() as any;
  const { canAccessScreen } = usePermissions();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const drawerOrder = useMemo(
    () =>
      new Map([
        ['Dashboard', 1],
        ['Armazém', 2],
        ['Produtos', 3],
        ['Histórico', 4],
        ['Áreas', 5],
        ['Perfis', 6],
        ['Usuários', 7],
        ['Perfil', 8],
      ]),
    []
  );

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [hoveredRouteKey, setHoveredRouteKey] = useState<string | null>(null);

  const userName = useMemo(() => {
    const name = user?.nome ?? user?.name ?? '';
    if (name) {
      return String(name);
    }
    const email = user?.email ?? user?.username ?? user?.login ?? '';
    if (email) {
      return String(email);
    }
    return 'Usuário';
  }, [user]);

  const userEmail = useMemo(() => {
    const email = user?.email ?? user?.username ?? user?.login ?? '';
    return String(email ?? '');
  }, [user]);

  const initials = useMemo(() => getInitials(userName || userEmail), [userName, userEmail]);

  const closeProfileMenu = () => setIsProfileMenuOpen(false);

  const goProfile = () => {
    closeProfileMenu();
    props.navigation.navigate('Perfil');
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surfaceVariant }}
      contentContainerStyle={[
        styles.drawerScrollContent,
        {
          backgroundColor: colors.surfaceVariant,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {isAuthenticated ? (
        <>
          <Pressable
            onPress={goProfile}
            style={[
              styles.drawerHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.outline,
              },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{initials}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.userTitle, { color: colors.text }]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={[styles.userSubtitle, { color: `${colors.text}99` }]} numberOfLines={1}>
                {userEmail || 'Logado'}
              </Text>
            </View>
          </Pressable>

          <Modal
            visible={isProfileMenuOpen}
            transparent
            animationType="fade"
            onRequestClose={closeProfileMenu}
          >
            <Pressable style={styles.modalOverlay} onPress={closeProfileMenu}>
              <Pressable
                onPress={() => {}}
                style={[styles.profileMenu, { backgroundColor: colors.surface }]}
              >
                <Pressable
                  onPress={goProfile}
                  style={({ pressed }) => [
                    styles.profileMenuItem,
                    { backgroundColor: pressed ? colors.surfaceVariant : 'transparent' },
                  ]}
                >
                  <Text style={[styles.profileMenuItemText, { color: colors.text }]}>
                    Abrir perfil
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      ) : null}

      <View style={styles.drawerMenuWrap}>
        {[...props.state.routes]
          .sort((left: any, right: any) => {
            const leftOrder = drawerOrder.get(left.name) ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = drawerOrder.get(right.name) ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
          })
          .map((route: any) => {
          const routeIndex = props.state.routes.findIndex((item: any) => item.key === route.key);
          const screenKey = getScreenKeyFromRouteName(route.name);
          const descriptor = props.descriptors?.[route.key];
          const routeLabel =
            descriptor?.options?.drawerLabel ??
            descriptor?.options?.title ??
            route.name;

          if (
            !isAuthenticated &&
            (route.name === 'Dashboard' ||
              route.name === 'Armazém' ||
              route.name === 'Áreas' ||
              route.name === 'Produtos' ||
              route.name === 'Usuários' ||
              route.name === 'Perfis' ||
              route.name === 'Histórico' ||
              route.name === 'Perfil')
          ) {
            return null;
          }
          if (
            isAuthenticated &&
            (route.name === 'Login' || route.name === 'Register' || route.name === 'Criar conta')
          ) {
            return null;
          }
          if (
            isAuthenticated &&
            ((screenKey && !canAccessScreen(screenKey)) ||
              (route.name === 'Áreas' && !canAccessScreen('WAREHOUSE')))
          ) {
            return null;
          }

          const focused = props.state.index === routeIndex;
          const hovered = hoveredRouteKey === route.key;
          const showHover = hovered && !focused;
          const backgroundColor = focused
            ? colors.surfaceVariant
            : showHover
              ? `${colors.primary}14`
              : 'transparent';
          const borderLeftWidth = focused ? 4 : showHover ? 2 : 0;
          const borderLeftColor = focused
            ? colors.primary
            : showHover
              ? `${colors.primary}A0`
              : 'transparent';

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                setHoveredRouteKey(null);
                props.navigation.navigate(route.name);
              }}
              onHoverIn={IS_WEB ? () => setHoveredRouteKey(route.key) : undefined}
              onHoverOut={IS_WEB ? () => setHoveredRouteKey(null) : undefined}
              style={({ pressed }) => [
                styles.drawerItemButton,
                {
                  backgroundColor: pressed && !focused ? `${colors.primary}1D` : backgroundColor,
                  borderLeftWidth,
                  borderLeftColor,
                  borderColor: showHover ? `${colors.primary}4D` : 'transparent',
                  opacity: pressed ? 0.95 : 1,
                  transform: [{ translateX: showHover ? 2 : 0 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.drawerItemLabel,
                  {
                    fontWeight: focused ? '800' : '700',
                    color: focused
                      ? colors.primary
                      : showHover
                        ? colors.primary
                        : `${colors.primary}D0`,
                  },
                ]}
              >
                {routeLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </DrawerContentScrollView>
  );
}

function WarehouseHeaderRight({ screenWidth }: { screenWidth: number }) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { searchText, setSearchText } = useWarehouseSearch();
  const hasText = searchText.trim().length > 0;
  const searchWidth = Math.max(260, Math.min(screenWidth * 0.42, 560));

  const placeholderColor = `${colors.primary}99`;

  return (
    <View style={[styles.headerRight, { width: searchWidth, maxWidth: '100%' }]}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
          },
        ]}
      >
        <AntDesign name="search1" size={16} color={placeholderColor} style={{ marginTop: 1 }} />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Digite nome, código, cor ou descrição (mín. 3 caracteres)"
          placeholderTextColor={placeholderColor}
          style={[styles.searchInput, { color: colors.text }]}
        />

        {hasText ? (
          <Pressable onPress={() => setSearchText('')} style={styles.clearBtn}>
            <AntDesign name="close" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const AntDesign = (props: any) => {
  const iconName = String(props?.name ?? '').toLowerCase();
  if (iconName === 'search' || iconName === 'search1') {
    const normalizedSize = typeof props?.size === 'number' ? Math.max(props.size, 18) : 18;
    return (
      <MaterialCommunityIcons
        name="magnify"
        size={normalizedSize}
        color={props?.color}
        style={props?.style}
        testID={props?.testID}
      />
    );
  }
  return <AntDesignBase {...props} />;
};

function ScreenFrame({
  title,
  navigation,
  right,
  fullWidth = false,
  contentMaxWidth = 1440,
  children,
}: {
  title: string;
  navigation: any;
  right?: React.ReactNode;
  fullWidth?: boolean;
  contentMaxWidth?: number | null;
  children: React.ReactNode;
}) {
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const shellBackground =
    (theme.colors as typeof theme.colors & { appShellBackground?: string }).appShellBackground ??
    '#F7F1E8';
  const pageBackground =
    (theme.colors as typeof theme.colors & { pageBackground?: string }).pageBackground ??
    theme.colors.background;
  const bodyHorizontalPadding = width < 768 ? 16 : 24;
  const shouldConstrain = !fullWidth;
  const showLargeCanvas = IS_WEB && width > 1440;

  return (
    <SafeAreaView
      style={[styles.screenFrame, { backgroundColor: shellBackground }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[
          styles.screenHeader,
          {
            backgroundColor: theme.colors.surfaceVariant,
          },
        ]}
      >
        <View style={styles.screenHeaderLeft}>
          <Pressable
            onPress={() => navigation.toggleDrawer()}
            style={styles.screenHeaderMenuButton}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="menu" size={24} color={theme.colors.primary} />
          </Pressable>

          <Text
            style={[styles.screenHeaderTitle, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {right ? <View style={styles.screenHeaderRight}>{right}</View> : null}
      </View>

      <View
        style={[
          styles.screenBody,
          showLargeCanvas
            ? ({
                backgroundColor: shellBackground,
                backgroundImage:
                  'linear-gradient(rgba(139,105,20,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,105,20,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              } as any)
            : { backgroundColor: shellBackground },
        ]}
      >
        <View
          style={[
            styles.screenBodyInner,
            shouldConstrain
              ? {
                  maxWidth: contentMaxWidth ?? 1440,
                  width: '100%',
                  alignSelf: 'center',
                  paddingLeft: bodyHorizontalPadding,
                  paddingRight: bodyHorizontalPadding,
                  paddingTop: 16,
                  paddingBottom: 16,
                  backgroundColor: pageBackground,
                  borderColor: withAlpha(theme.colors.outline, 0.78),
                  shadowColor: '#000000',
                  shadowOpacity: 0.05,
                  shadowRadius: 30,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 2,
                }
              : [
                  styles.screenBodyInnerFullWidth,
                  contentMaxWidth == null
                    ? styles.screenBodyInnerFullBleed
                    : {
                        maxWidth: contentMaxWidth,
                        width: '100%',
                        alignSelf: 'center',
                      },
                ],
          ]}
        >
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function DrawerNavigator() {
  const { theme } = useThemeContext();
  const { isAuthenticated, isRestoring } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const shellBackground =
    (theme.colors as typeof theme.colors & { appShellBackground?: string }).appShellBackground ??
    '#F7F1E8';
  const showHeaderSearch = IS_WEB && screenWidth >= 760;

  const drawerWidth = useMemo(() => {
    if (!IS_WEB) {
      return undefined;
    }
    if (screenWidth >= 1400) {
      return 360;
    }
    return 320;
  }, [screenWidth]);

  if (isRestoring) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: shellBackground, paddingHorizontal: 20 }}
        edges={['top', 'left', 'right']}
      >
        <AppLoadingState message="Carregando sessão..." style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <WarehouseSearchProvider>
      <Drawer.Navigator
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
        drawerContent={(props) => <ThemedDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,

          drawerType: 'front',
          drawerStyle: {
            backgroundColor: theme.colors.surfaceVariant,
            width: drawerWidth,
            borderRightWidth: 0,
            borderRightColor: 'transparent',
          },
          drawerContentStyle: {
            backgroundColor: theme.colors.surfaceVariant,
          },

          overlayColor: 'rgba(0,0,0,0.08)',
          sceneContainerStyle: {
            backgroundColor: shellBackground,
          },
        }}
      >
        <Drawer.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Drawer.Screen
          name="Criar conta"
          component={RegisterScreen}
          options={{ title: 'Criar conta' }}
        />

        <Drawer.Screen
          name="Perfil"
          component={(props: any) => (
            <RequireAuth>
              <ScreenFrame title="Perfil" navigation={props.navigation}>
                <ProfileScreen />
              </ScreenFrame>
            </RequireAuth>
          )}
          options={{ title: 'Perfil', drawerItemStyle: { display: 'none' } }}
        />

        {isAuthenticated ? (
          <Drawer.Screen
            name="Dashboard"
            component={(props: any) => (
              <RequireScreenAccess screenKey="DASHBOARD">
                <ScreenFrame title="Dashboard" navigation={props.navigation} fullWidth>
                  <DashboardScreen {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Dashboard' }}
          />
        ) : (
          <Drawer.Screen
            name="Dashboard"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="DASHBOARD">
                  <ScreenFrame title="Dashboard" navigation={props.navigation} fullWidth>
                    <DashboardScreen {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Dashboard', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Armazém"
            component={(props: any) => (
              <RequireScreenAccess screenKey="WAREHOUSE">
                <ScreenFrame
                  title="Armazém"
                  navigation={props.navigation}
                  fullWidth
                  contentMaxWidth={null}
                  right={
                    showHeaderSearch ? <WarehouseHeaderRight screenWidth={screenWidth} /> : null
                  }
                >
                  <Warehouse2DView {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Armazém' }}
          />
        ) : (
          <Drawer.Screen
            name="Armazém"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="WAREHOUSE">
                <ScreenFrame
                  title="Armazém"
                  navigation={props.navigation}
                  fullWidth
                  contentMaxWidth={null}
                  right={
                    showHeaderSearch ? <WarehouseHeaderRight screenWidth={screenWidth} /> : null
                  }
                  >
                    <Warehouse2DView {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Armazém', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Áreas"
            component={(props: any) => (
              <RequireScreenAccess screenKey="WAREHOUSE">
                <ScreenFrame title="Setores" navigation={props.navigation} fullWidth={IS_WEB}>
                  <AreaManagement {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Setores' }}
          />
        ) : (
          <Drawer.Screen
            name="Áreas"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="WAREHOUSE">
                  <ScreenFrame title="Setores" navigation={props.navigation} fullWidth={IS_WEB}>
                    <AreaManagement {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Setores', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Produtos"
            component={(props: any) => (
              <RequireScreenAccess screenKey="PRODUCTS">
                <ScreenFrame title="Produtos" navigation={props.navigation} fullWidth={IS_WEB}>
                  <ProductManagement {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Produtos' }}
          />
        ) : (
          <Drawer.Screen
            name="Produtos"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="PRODUCTS">
                  <ScreenFrame title="Produtos" navigation={props.navigation} fullWidth={IS_WEB}>
                    <ProductManagement {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Produtos', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Perfis"
            component={(props: any) => (
              <RequireScreenAccess screenKey="PROFILES">
                <ScreenFrame title="Perfis" navigation={props.navigation}>
                  <ProfileManagement {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Perfis' }}
          />
        ) : (
          <Drawer.Screen
            name="Perfis"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="PROFILES">
                  <ScreenFrame title="Perfis" navigation={props.navigation}>
                    <ProfileManagement {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Perfis', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Histórico"
            component={(props: any) => (
              <RequireScreenAccess screenKey="HISTORY">
                <ScreenFrame title="Histórico" navigation={props.navigation}>
                  <HistoryScreen {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Histórico' }}
          />
        ) : (
          <Drawer.Screen
            name="Histórico"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="HISTORY">
                  <ScreenFrame title="Histórico" navigation={props.navigation}>
                    <HistoryScreen {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Histórico', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Usuários"
            component={(props: any) => (
              <RequireScreenAccess screenKey="USERS">
                <ScreenFrame title="Usuários" navigation={props.navigation}>
                  <UserScreen {...props} />
                </ScreenFrame>
              </RequireScreenAccess>
            )}
            options={{ title: 'Usuários' }}
          />
        ) : (
          <Drawer.Screen
            name="Usuários"
            component={(props: any) => (
              <RequireAuth>
                <RequireScreenAccess screenKey="USERS">
                  <ScreenFrame title="Usuários" navigation={props.navigation}>
                    <UserScreen {...props} />
                  </ScreenFrame>
                </RequireScreenAccess>
              </RequireAuth>
            )}
            options={{ title: 'Usuários', drawerItemStyle: { display: 'none' } }}
          />
        )}
      </Drawer.Navigator>
    </WarehouseSearchProvider>
  );
}

const styles = StyleSheet.create({
  drawerScrollContent: {
    paddingTop: 0,
    paddingBottom: 12,
  },
  screenFrame: {
    flex: 1,
  },
  screenHeader: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  screenHeaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenHeaderMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  screenHeaderRight: {
    flexShrink: 1,
    minWidth: 0,
  },
  screenBody: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  screenBodyInner: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'visible',
    paddingTop: 0,
    paddingBottom: 0,
  },
  screenBodyInnerFullWidth: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  screenBodyInnerFullBleed: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  userTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  userSubtitle: {
    fontSize: 12,
    fontWeight: '700',
  },

  drawerMenuWrap: {
    paddingTop: 10,
  },
  drawerItemButton: {
    borderRadius: 8,
    marginHorizontal: 10,
    marginVertical: 4,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
  },
  drawerItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    paddingBottom: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 70,
    paddingLeft: 14,
  },
  profileMenu: {
    width: 280,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileMenuItem: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  profileMenuItemText: {
    fontSize: 14,
    fontWeight: '800',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  searchBox: {
    height: 34,
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    outlineStyle: 'none' as any,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileRoot: {
    flex: 1,
  },
  profileContent: {
    gap: 14,
  },
  profileHeaderCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '900',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
  },
  profileEmail: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
  },
  profileChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  profileChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  profileDivider: {
    height: 1,
    marginVertical: 14,
  },
  profileActionsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileDangerButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  profileDangerText: {
    fontSize: 14,
    fontWeight: '900',
  },
  profileMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileGrid: {
    width: '100%',
  },
  profileSectionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  profileFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  profileFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  profileFieldValue: {
    fontSize: 13,
    fontWeight: '900',
    maxWidth: '65%',
    textAlign: 'right',
  },
  profileFieldDivider: {
    height: 1,
    opacity: 0.8,
  },
  profileHint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
