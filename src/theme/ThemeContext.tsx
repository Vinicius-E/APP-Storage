import React, { createContext, useContext, useState } from 'react';
import { MD3LightTheme } from 'react-native-paper';
// Importe StyleSheet, View, Text, TouchableOpacity para o componente ThemeSwitcherButton
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const warehouseThemes = {
  // ... (definições de steel, wood, neon permanecem as mesmas)
  steel: {
    ...MD3LightTheme,
    id: 'steel',
    /* colors: {
      ...MD3LightTheme.colors,
      background: '#432f00ff',
      surface: '#f8f9fb',
      primary: '#a98400',
      onPrimary: '#ffffff',
      text: '#1a1f2f',
    }, */
    colors: {
      ...MD3LightTheme.colors,
      background: '#e8e0d7',
      surface: '#f8f2ea',
      primary: '#b67a20',
      onPrimary: '#ffffff',
      text: '#2a1c11',
    },
  },
  wood: {
    ...MD3LightTheme,
    id: 'wood',
    colors: {
      ...MD3LightTheme.colors,
      background: '#e8e0d7',
      surface: '#f8f2ea',
      primary: '#b67a20',
      onPrimary: '#ffffff',
      text: '#2a1c11',
    },
  },
  neon: {
    ...MD3LightTheme,
    id: 'neon',
    colors: {
      ...MD3LightTheme.colors,
      background: '#e3ffe6',
      surface: '#f8fff9',
      primary: '#99ff14',
      onPrimary: '#000000',
      text: '#1a1a1a',
    },
  },
};

const ThemeContext = createContext({
  theme: warehouseThemes.steel,
  setTheme: (name) => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(warehouseThemes.steel);

  const switchTheme = (name) => {
    if (warehouseThemes[name]) {
      setTheme(warehouseThemes[name]);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);

// Componente de botão de alternância de tema aprimorado
export const ThemeSwitcherButton = () => {
  const { theme, setTheme } = useThemeContext();
  const themes = Object.keys(warehouseThemes);

  const currentIndex = themes.indexOf(theme.id);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextThemeName = themes[nextIndex];
  const nextThemeDisplayName = nextThemeName.charAt(0).toUpperCase() + nextThemeName.slice(1);

  // Definindo estilos usando StyleSheet.create com valores literais corretos
  const styles = StyleSheet.create({
    buttonStyle: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 8,
      // CORREÇÃO: Usando o valor literal 'center' em vez de uma string genérica
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      minHeight: 44, // Boa prática de usabilidade: área de toque mínima
    },
    buttonTextStyle: {
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <TouchableOpacity
      style={styles.buttonStyle}
      onPress={() => setTheme(nextThemeName)}
      accessibilityLabel={`Switch to ${nextThemeDisplayName} theme`}
    >
      <Text style={styles.buttonTextStyle}>Mudar para o Tema {nextThemeDisplayName}</Text>
    </TouchableOpacity>
  );
};
