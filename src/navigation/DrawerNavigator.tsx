// src/navigation/DrawerNavigator.tsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

//import WarehouseScreen from '../screens/WarehouseScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WarehouseScreen from '../screens/WarehouseScreen';
import Warehouse2DView from '../components/Warehouse2DView';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator initialRouteName="Login">
      <Drawer.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Login' }}
      />
      <Drawer.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Registrar' }}
      />
      <Drawer.Screen
        name="Warehouse"
        component={Warehouse2DView}
        options={{ title: 'Armazém' }}
      />
    </Drawer.Navigator>
  );
}
