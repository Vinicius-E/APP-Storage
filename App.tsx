// App.tsx
import 'react-native-gesture-handler';      // ← MUST be firstimport 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import { PaperProvider } from 'react-native-paper';
import { Provider } from 'react-redux';
import store from './src/store';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <PaperProvider>
          <NavigationContainer>
            <DrawerNavigator />
          </NavigationContainer>
        </PaperProvider>
      </ThemeProvider>
    </Provider>
  );
}
