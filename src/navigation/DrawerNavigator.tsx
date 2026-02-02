// src/navigation/DrawerNavigator.tsx
import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';

//import WarehouseScreen from '../screens/WarehouseScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WarehouseScreen from '../screens/WarehouseScreen';
import Warehouse2DView from '../components/Warehouse2DView';
import { useThemeContext } from '../theme/ThemeContext';

const Drawer = createDrawerNavigator();

function ThemedDrawerContent(props) {
  const { theme } = useThemeContext();
  const { colors } = theme;

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ backgroundColor: colors.surface }}
    >
      {props.state.routes.map((route, index) => {
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

export default function DrawerNavigator() {
  const { theme } = useThemeContext();

  return (
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
      <Drawer.Screen name="Register" component={RegisterScreen} options={{ title: 'Registrar' }} />
      <Drawer.Screen name="Warehouse" component={Warehouse2DView} options={{ title: 'Armazém' }} />
    </Drawer.Navigator>
  );
}
