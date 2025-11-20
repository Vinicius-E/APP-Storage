import React, { createContext, useContext, useState } from 'react';
import { MD3LightTheme } from 'react-native-paper';

const warehouseThemes = {
  steel: {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      background: '#fafafa',
      surface: '#ffffff',
      primary: '#a98400',
      onPrimary: '#ffffff',
      outline: '#c0c0c0',
      text: '#1a1a1a',
    },
  },

  wood: {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      background: '#7c2525ff',
      surface: '#ffffff',
      primary: '#c49b3a',
      onPrimary: '#ffffff',
      outline: '#caa874',
      text: '#1a1a1a',
    },
  },

  neon: {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      background: '#fafafa',
      surface: '#ffffff',
      primary: '#99ff14',
      onPrimary: '#000000',
      outline: '#88dd14',
      text: '#1a1a1a',
    },
  },
};

const ThemeContext = createContext({
  theme: warehouseThemes.steel,
  setTheme: (name: 'steel' | 'wood' | 'neon') => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(warehouseThemes.steel);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: (name) => setTheme(warehouseThemes[name]) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
