import React, { createContext, useContext, useState } from 'react';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const warehouseThemes = {
  steel: { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, primary: '#9ea7aa' } },
  wood: { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, primary: '#a67c52' } },
  neon: { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, primary: '#39ff14' } },
};

const ThemeContext = createContext({
  theme: warehouseThemes.steel,
  setTheme: (name: 'steel' | 'wood' | 'neon') => {}
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
