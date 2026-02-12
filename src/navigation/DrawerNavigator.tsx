// src/navigation/DrawerNavigator.tsx
import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { View, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import AntDesignBase from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import Warehouse2DView from '../components/Warehouse2DView';
import { useThemeContext } from '../theme/ThemeContext';
import { RequireAuth } from '../auth/RequireAuth';
import { useAuth } from '../auth/AuthContext';
import { WarehouseSearchProvider, useWarehouseSearch } from '../search/WarehouseSearchContext';

const Drawer = createDrawerNavigator();
const IS_WEB = Platform.OS === 'web';

function ThemedDrawerContent(props: any) {
  const { theme } = useThemeContext();
  const { isAuthenticated } = useAuth();
  const { colors } = theme;

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ backgroundColor: colors.surface }}
    >
      {props.state.routes.map((route: any, index: number) => {
        if (!isAuthenticated && (route.name === 'Dashboard' || route.name === 'Armazem')) {
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
    </DrawerContentScrollView>
  );
}

function WarehouseHeaderRight() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { searchOpen, searchText, setSearchText, toggle, clear } = useWarehouseSearch();

  const placeholderColor = `${colors.primary}99`;

  return (
    <View style={styles.headerRight}>
      {searchOpen && (
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
            placeholder="Buscar produto, código, cor ou descrição (mín. 3)"
            placeholderTextColor={placeholderColor}
            style={[
              styles.searchInput,
              {
                color: colors.text,
              },
            ]}
          />

          {searchText !== '' && (
            <Pressable onPress={clear} style={styles.iconBtn}>
              <AntDesign name="close" size={14} color={colors.primary} />
            </Pressable>
          )}
        </View>
      )}

      <Pressable
        onPress={toggle}
        style={[styles.iconBtn, searchOpen && { backgroundColor: colors.surfaceVariant }]}
      >
        <AntDesign name={searchOpen ? 'close' : 'search1'} size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const AntDesign = (props: any) => {
  const iconName = String(props?.name ?? '').toLowerCase();
  if (iconName === 'search' || iconName === 'search1') {
    const normalizedSize =
      typeof props?.size === 'number' ? Math.max(props.size, 18) : 18;
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
  const { isAuthenticated } = useAuth();

  return (
    <WarehouseSearchProvider>
      <Drawer.Navigator
        initialRouteName="Login"
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
            name="Armazem"
            component={Warehouse2DView}
            options={{
              title: 'Armazém',
              headerRight: () => (IS_WEB ? <WarehouseHeaderRight /> : null),
            }}
          />
        ) : (
          <Drawer.Screen
            name="Armazem"
            component={() => (
              <RequireAuth>
                <Warehouse2DView />
              </RequireAuth>
            )}
            options={{
              title: 'Armazém',
              drawerItemStyle: { display: 'none' },
              headerRight: () => (IS_WEB ? <WarehouseHeaderRight /> : null),
            }}
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
    width: 440,
    maxWidth: 520,
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
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
