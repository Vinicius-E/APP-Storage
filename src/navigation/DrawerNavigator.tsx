// src/navigation/DrawerNavigator.tsx
import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AntDesignBase from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLoadingState from '../components/AppLoadingState';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import UserScreen from '../screens/UserScreen';
import Warehouse2DView from '../components/Warehouse2DView';
import { useThemeContext } from '../theme/ThemeContext';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthContext';
import { WarehouseSearchProvider, useWarehouseSearch } from '../search/WarehouseSearchContext';

const Drawer = createDrawerNavigator();
const IS_WEB = Platform.OS === 'web';

function ThemedDrawerContent(props: any) {
  const { theme } = useThemeContext();
  const { isAuthenticated, signOut } = useAuth();
  const { colors } = theme;

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ backgroundColor: colors.surface }}
    >
      {props.state.routes.map((route: any, index: number) => {
        if (
          !isAuthenticated &&
          (route.name === 'Dashboard' ||
            route.name === 'Armazém' ||
            route.name === 'Usuários' ||
            route.name === 'Histórico')
        ) {
          return null;
        }
        if (isAuthenticated && (route.name === 'Login' || route.name === 'Register')) {
          return null;
        }

        const focused = props.state.index === index;

        return (
          <DrawerItem
            key={route.key}
            label={route.name}
            focused={focused}
            onPress={() => props.navigation.navigate(route.name)}
            labelStyle={{
              color: colors.primary,
              fontWeight: '700',
              paddingBottom: 4,
            }}
            style={{
              backgroundColor: focused ? colors.surfaceVariant : colors.surface,
              borderRadius: 12,
              marginHorizontal: 8,
              borderLeftWidth: focused ? 4 : 0,
              borderLeftColor: focused ? colors.primary : 'transparent',
            }}
            pressColor={colors.surfaceVariant}
          />
        );
      })}
      {isAuthenticated ? (
        <DrawerItem
          label="Sair"
          onPress={async () => {
            await signOut();
            props.navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}
          labelStyle={{
            color: colors.error,
            fontWeight: '700',
            paddingBottom: 4,
          }}
          style={{
            borderRadius: 12,
            marginHorizontal: 8,
          }}
        />
      ) : null}
    </DrawerContentScrollView>
  );
}

function WarehouseHeaderRight({ screenWidth }: { screenWidth: number }) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { searchText, setSearchText } = useWarehouseSearch();
  const hasText = searchText.trim().length > 0;

  const placeholderColor = `${colors.primary}99`;

  return (
    <View style={[styles.headerRight, { width: screenWidth * 0.5 }]}>
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
          placeholder="Buscar por nome do produto, código, cor ou descrição (mínimo 3 caracteres)"
          placeholderTextColor={placeholderColor}
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
        />

        {hasText && (
          <Pressable onPress={() => setSearchText('')} style={styles.clearBtn}>
            <AntDesign name="close" size={14} color={colors.primary} />
          </Pressable>
        )}
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

export default function DrawerNavigator() {
  const { theme } = useThemeContext();
  const { isAuthenticated, isRestoring } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const showHeaderSearch = IS_WEB && screenWidth >= 900;

  if (isRestoring) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingHorizontal: 20,
        }}
      >
        <AppLoadingState message="Carregando sessão..." style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <WarehouseSearchProvider>
      <Drawer.Navigator
        initialRouteName={isAuthenticated ? 'Dashboard' : 'Login'}
        drawerContent={(props) => <ThemedDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.primary, fontWeight: '700' },
          headerTintColor: theme.colors.primary,
          drawerActiveTintColor: theme.colors.text,
          drawerInactiveTintColor: theme.colors.text,
          drawerStyle: { backgroundColor: theme.colors.surface },
          drawerContentStyle: { backgroundColor: theme.colors.surface },
          overlayColor: 'transparent',
          sceneContainerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Drawer.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Drawer.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Registrar' }}
        />

        {isAuthenticated ? (
          <Drawer.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: 'Dashboard' }}
          />
        ) : (
          <Drawer.Screen
            name="Dashboard"
            component={() => (
              <RequireAuth>
                <DashboardScreen />
              </RequireAuth>
            )}
            options={{ title: 'Dashboard', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Armazém"
            component={Warehouse2DView}
            options={{
              title: 'Armazém',
              headerRightContainerStyle: {
                width: screenWidth * 0.5 + 20,
                paddingRight: 10,
              },
              headerRight: () =>
                showHeaderSearch ? <WarehouseHeaderRight screenWidth={screenWidth} /> : null,
            }}
          />
        ) : (
          <Drawer.Screen
            name="Armazém"
            component={() => (
              <RequireAuth>
                <Warehouse2DView />
              </RequireAuth>
            )}
            options={{
              title: 'Armazém',
              drawerItemStyle: { display: 'none' },
              headerRightContainerStyle: {
                width: screenWidth * 0.5 + 20,
                paddingRight: 10,
              },
              headerRight: () =>
                showHeaderSearch ? <WarehouseHeaderRight screenWidth={screenWidth} /> : null,
            }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Usuários"
            component={UserScreen}
            options={{ title: 'Usuários' }}
          />
        ) : (
          <Drawer.Screen
            name="Usuários"
            component={() => (
              <RequireAuth>
                <UserScreen />
              </RequireAuth>
            )}
            options={{ title: 'Usuários', drawerItemStyle: { display: 'none' } }}
          />
        )}

        {isAuthenticated ? (
          <Drawer.Screen
            name="Histórico"
            component={HistoryScreen}
            options={{ title: 'Histórico' }}
          />
        ) : (
          <Drawer.Screen
            name="Histórico"
            component={() => (
              <RequireAuth>
                <HistoryScreen />
              </RequireAuth>
            )}
            options={{ title: 'Histórico', drawerItemStyle: { display: 'none' } }}
          />
        )}
      </Drawer.Navigator>
    </WarehouseSearchProvider>
  );
}

const styles = StyleSheet.create({
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
});
