// App.tsx
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import { Provider } from 'react-redux';
import store from './src/store';

import { PaperProvider } from 'react-native-paper';
import { ThemeProvider, useThemeContext } from './src/theme/ThemeContext';

// Wrap Navigation inside a provider that has access to the theme
function AppWithTheme() {
  const { theme } = useThemeContext();
  return (
    <PaperProvider theme={theme}>
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
        <AppWithTheme />
      </ThemeProvider>
    </Provider>
  );
}
