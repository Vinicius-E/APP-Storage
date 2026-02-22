import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import { Provider } from 'react-redux';
import store from './src/store';
import { Platform } from 'react-native';

import { PaperProvider } from 'react-native-paper';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { PaperIcon } from './src/PaperIcon';

function AppWithTheme() {
  const { theme } = useThemeContext();

  return (
    <PaperProvider theme={theme} settings={{ icon: PaperIcon }}>
      <NavigationContainer>
        <DrawerNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <AppWithTheme />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}
