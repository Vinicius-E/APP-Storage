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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const iconAsset = require('./assets/favIcon.png') as any;
    const rawUri =
      typeof iconAsset === 'string'
        ? iconAsset
        : iconAsset?.default ?? iconAsset?.uri ?? null;

    if (!rawUri) {
      return;
    }

    const uri = `${rawUri}${rawUri.includes('?') ? '&' : '?'}v=orange-20260212`;
    const links = Array.from(document.querySelectorAll('link[rel*="icon"]')) as any[];

    links.forEach((link) => {
      link.href = uri;
      if (String(link.rel ?? '').includes('icon')) {
        link.type = 'image/png';
      }
    });

    const ensureShortcut = () => {
      let shortcut = document.querySelector('link[rel="shortcut icon"]') as any;
      if (!shortcut) {
        shortcut = document.createElement('link');
        shortcut.rel = 'shortcut icon';
        document.head.appendChild(shortcut);
      }
      shortcut.type = 'image/png';
      shortcut.href = uri;
    };

    ensureShortcut();
  }, []);

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
