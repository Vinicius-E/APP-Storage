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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { PaperIcon } from './src/PaperIcon';

function AppWithTheme() {
  const { theme } = useThemeContext();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const doc = (globalThis as any).document;

    if (!doc?.head) {
      return;
    }

    const styleId = 'storage-system-web-autofill-override';
    let styleTag = doc.getElementById(styleId);

    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = styleId;
      doc.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      textarea:-webkit-autofill,
      textarea:-webkit-autofill:hover,
      textarea:-webkit-autofill:focus {
        -webkit-text-fill-color: ${theme.colors.onSurface} !important;
        -webkit-box-shadow: 0 0 0 1000px ${theme.colors.surface} inset !important;
        box-shadow: 0 0 0 1000px ${theme.colors.surface} inset !important;
        caret-color: ${theme.colors.primary} !important;
        border-radius: 16px !important;
        transition: background-color 999999s ease-out 0s;
      }
    `;
  }, [theme.colors.onSurface, theme.colors.primary, theme.colors.surface]);

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
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppWithTheme />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
