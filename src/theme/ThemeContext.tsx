import React, { createContext, useContext, useMemo, useState } from 'react';
import { MD3LightTheme } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const warehouseThemes = {
  steel: {
    ...MD3LightTheme,
    id: 'steel',
    colors: {
      ...MD3LightTheme.colors,

      background: '#EFE7DF',
      surface: '#FFF7EE',
      surfaceVariant: '#EFE1D3',

      primary: '#9C5B17',
      onPrimary: '#FFFFFF',
      secondary: '#B3742A',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#F3DFC4',
      onSecondaryContainer: '#5E3B14',
      tertiary: '#C0863D',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FBE8CF',
      onTertiaryContainer: '#5A370E',

      outline: '#D6C6B9',
      outlineVariant: '#E1D4C9',

      text: '#2A1C11',
      textSecondary: '#6B5A4B',

      error: '#B3261E',
      onSurface: '#2A1C11',
      onSurfaceVariant: '#6B5A4B',
    },
  },

  wood: {
    ...MD3LightTheme,
    id: 'wood',
    colors: {
      ...MD3LightTheme.colors,

      background: '#F0E3D2',
      surface: '#FFF4E6',
      surfaceVariant: '#F3E5D2',

      primary: '#7A4A21',
      onPrimary: '#FFFFFF',
      secondary: '#9A6127',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#EED9BC',
      onSecondaryContainer: '#4C2F10',
      tertiary: '#A87139',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#F7E2C5',
      onTertiaryContainer: '#4F2F12',

      outline: '#D1B99F',
      outlineVariant: '#DFCAB3',

      text: '#2A1C11',
      textSecondary: '#6D513B',

      error: '#B3261E',
      onSurface: '#2A1C11',
      onSurfaceVariant: '#6D513B',
    },
  },

  neon: {
    ...MD3LightTheme,
    id: 'neon',
    colors: {
      ...MD3LightTheme.colors,

      background: '#07120B',
      surface: '#0B1A10',
      surfaceVariant: '#162018',

      primary: '#99FF14',
      onPrimary: '#07120B',
      secondary: '#7EDB1A',
      onSecondary: '#07120B',
      secondaryContainer: '#223E16',
      onSecondaryContainer: '#DFF7CD',
      tertiary: '#57C46C',
      onTertiary: '#07120B',
      tertiaryContainer: '#1C3323',
      onTertiaryContainer: '#D8F6DE',

      outline: '#1E3A27',
      outlineVariant: '#284A33',

      text: '#E9FFE1',
      textSecondary: '#B9DDB0',

      error: '#FF5A5A',
      onSurface: '#E9FFE1',
      onSurfaceVariant: '#B9DDB0',
    },
  },
};

const ThemeContext = createContext({
  theme: warehouseThemes.steel,
  setTheme: (name: string) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState(warehouseThemes.steel);

  const switchTheme = (name: string) => {
    if (warehouseThemes[name as keyof typeof warehouseThemes]) {
      setThemeState(warehouseThemes[name as keyof typeof warehouseThemes]);
    }
  };

  const value = useMemo(() => ({ theme, setTheme: switchTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeSwitcherButton = () => {
  const { theme, setTheme } = useThemeContext();
  const themes = Object.keys(warehouseThemes);

  const currentIndex = themes.indexOf(theme.id);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextThemeName = themes[nextIndex];
  const nextThemeDisplayName = nextThemeName.charAt(0).toUpperCase() + nextThemeName.slice(1);

  const styles = StyleSheet.create({
    buttonStyle: {
      backgroundColor: theme.colors.primary,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      minHeight: 44,
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
