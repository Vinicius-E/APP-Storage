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

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const int = parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function AppWithTheme() {
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & {
    text?: string;
    textSecondary?: string;
    secondaryContainer?: string;
    onSecondaryContainer?: string;
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const iconAsset = require('./assets/favicon.png') as any;
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const styleId = 'warehouse-gold-input-theme';
    const doc = document as any;
    let styleTag = doc.getElementById(styleId) as any;

    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = styleId;
      doc.head.appendChild(styleTag);
    }

    const inputFill = theme.colors.surfaceVariant;
    const inputText = colors.text ?? theme.colors.onSurface;
    const primary = theme.colors.primary;
    const outline = theme.colors.outline;
    const selection = colors.secondaryContainer ?? '#F3DFC4';
    const selectionText = colors.onSecondaryContainer ?? inputText;
    const primaryFocused = hexToRgba(primary, 0.3);
    const neutralHoverShadow = hexToRgba(primary, 0.22);
    const containedHoverShadow = hexToRgba(primary, 0.3);
    const neutralHoverBackground = colors.secondaryContainer ?? '#F3DFC4';
    const containedHoverBackground = theme.colors.secondary;
    const statusSuccess = '#2E7D32';
    const statusSuccessBackground = hexToRgba(statusSuccess, 0.12);
    const statusSuccessShadow = hexToRgba(statusSuccess, 0.24);
    const statusDanger = theme.colors.error;
    const statusDangerBackground = hexToRgba(statusDanger, 0.1);
    const statusDangerShadow = hexToRgba(statusDanger, 0.22);
    const chipHoverOutline = hexToRgba(primary, 0.38);
    const chipHoverShadow = hexToRgba(primary, 0.18);
    const activeSortOutline = hexToRgba(primary, 0.6);
    const activeSortShadow = hexToRgba(primary, 0.3);

    styleTag.textContent = `
      button,
      [role="button"] {
        transition:
          border-color 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease,
          background-color 180ms ease,
          color 180ms ease;
      }

      button:not([disabled]):not([aria-disabled="true"]):focus-visible,
      [role="button"]:not([disabled]):not([aria-disabled="true"]):focus-visible {
        box-shadow: 0 0 0 2px ${primaryFocused} !important;
        outline: none !important;
      }

      button[aria-label="action-reload-users"],
      button[aria-label="action-new-user"],
      button[aria-label^="action-edit-user-"],
      button[aria-label^="action-status-inactivate-"],
      button[aria-label^="action-status-activate-"],
      button[aria-label="action-dashboard-generate-report"],
      button[aria-label="action-dashboard-page-prev"],
      button[aria-label="action-dashboard-page-next"],
      button[aria-label^="action-historico-detalhes-"],
      button[aria-label="action-historico-limpar"],
      button[aria-label="action-historico-aplicar"],
      [role="button"][aria-label="action-reload-users"],
      [role="button"][aria-label="action-new-user"],
      [role="button"][aria-label^="action-edit-user-"],
      [role="button"][aria-label^="action-status-inactivate-"],
      [role="button"][aria-label^="action-status-activate-"],
      [role="button"][aria-label="action-dashboard-generate-report"],
      [role="button"][aria-label="action-dashboard-page-prev"],
      [role="button"][aria-label="action-dashboard-page-next"],
      [role="button"][aria-label^="action-historico-detalhes-"],
      [role="button"][aria-label="action-historico-limpar"],
      [role="button"][aria-label="action-historico-aplicar"],
      [aria-label^="action-users-filter-"],
      [aria-label^="action-historico-tipo-"],
      [aria-label^="action-dashboard-sort-"],
      [aria-label^="action-dashboard-page-size-"] {
        box-shadow: none;
      }

      button[aria-label="action-reload-users"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-reload-users"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label^="action-edit-user-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label^="action-edit-user-"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label="action-dashboard-page-prev"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-dashboard-page-prev"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label="action-dashboard-page-next"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-dashboard-page-next"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label^="action-historico-detalhes-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label^="action-historico-detalhes-"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label="action-historico-limpar"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-historico-limpar"]:not([disabled]):not([aria-disabled="true"]):hover {
        border-color: ${primary} !important;
        background-color: ${neutralHoverBackground} !important;
        box-shadow: 0 6px 14px ${neutralHoverShadow} !important;
        transform: translateY(-1px);
      }

      button[aria-label="action-new-user"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-new-user"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label="action-dashboard-generate-report"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-dashboard-generate-report"]:not([disabled]):not([aria-disabled="true"]):hover,
      button[aria-label="action-historico-aplicar"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label="action-historico-aplicar"]:not([disabled]):not([aria-disabled="true"]):hover {
        border-color: ${containedHoverBackground} !important;
        background-color: ${containedHoverBackground} !important;
        box-shadow: 0 7px 16px ${containedHoverShadow} !important;
        transform: translateY(-1px);
      }

      [aria-label^="action-users-filter-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [aria-label^="action-historico-tipo-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [aria-label^="action-dashboard-page-size-"]:not([disabled]):not([aria-disabled="true"]):hover {
        box-shadow: 0 0 0 1px ${chipHoverOutline}, 0 5px 12px ${chipHoverShadow} !important;
        transform: translateY(-1px);
      }

      [aria-label^="action-dashboard-sort-"]:not([disabled]):not([aria-disabled="true"]):hover {
        background-color: ${neutralHoverBackground} !important;
        box-shadow: 0 0 0 1px ${chipHoverOutline}, 0 6px 14px ${chipHoverShadow} !important;
        transform: translateY(-1px);
      }

      [aria-label^="action-dashboard-sort-"][aria-selected="true"]:not([disabled]):not([aria-disabled="true"]):hover,
      [aria-label^="action-dashboard-sort-"][aria-pressed="true"]:not([disabled]):not([aria-disabled="true"]):hover,
      [aria-label^="action-dashboard-sort-"][aria-checked="true"]:not([disabled]):not([aria-disabled="true"]):hover {
        background-color: ${primary} !important;
        box-shadow: 0 0 0 1px ${activeSortOutline}, 0 7px 16px ${activeSortShadow} !important;
        transform: translateY(-1px);
      }

      [aria-label^="action-dashboard-sort-"][aria-selected="true"]:not([disabled]):not([aria-disabled="true"]):hover *,
      [aria-label^="action-dashboard-sort-"][aria-pressed="true"]:not([disabled]):not([aria-disabled="true"]):hover *,
      [aria-label^="action-dashboard-sort-"][aria-checked="true"]:not([disabled]):not([aria-disabled="true"]):hover * {
        color: ${theme.colors.onPrimary} !important;
      }

      button[aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):hover {
        border-color: ${statusDanger} !important;
        background-color: ${statusDangerBackground} !important;
        box-shadow: 0 6px 14px ${statusDangerShadow} !important;
        transform: translateY(-1px);
      }

      button[aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):hover *,
      [role="button"][aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):hover * {
        color: ${statusDanger} !important;
      }

      button[aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):hover,
      [role="button"][aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):hover {
        border-color: ${statusSuccess} !important;
        background-color: ${statusSuccessBackground} !important;
        box-shadow: 0 6px 14px ${statusSuccessShadow} !important;
        transform: translateY(-1px);
      }

      button[aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):hover *,
      [role="button"][aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):hover * {
        color: ${statusSuccess} !important;
      }

      button[aria-label="action-reload-users"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-reload-users"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-new-user"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-new-user"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label^="action-edit-user-"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label^="action-edit-user-"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-dashboard-generate-report"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-dashboard-generate-report"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-dashboard-page-prev"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-dashboard-page-prev"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-dashboard-page-next"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-dashboard-page-next"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label^="action-historico-detalhes-"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label^="action-historico-detalhes-"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-historico-limpar"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-historico-limpar"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label="action-historico-aplicar"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label="action-historico-aplicar"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label^="action-status-inactivate-"]:not([disabled]):not([aria-disabled="true"]):active,
      button[aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):active,
      [role="button"][aria-label^="action-status-activate-"]:not([disabled]):not([aria-disabled="true"]):active,
      [aria-label^="action-users-filter-"]:not([disabled]):not([aria-disabled="true"]):active,
      [aria-label^="action-historico-tipo-"]:not([disabled]):not([aria-disabled="true"]):active,
      [aria-label^="action-dashboard-sort-"]:not([disabled]):not([aria-disabled="true"]):active,
      [aria-label^="action-dashboard-page-size-"]:not([disabled]):not([aria-disabled="true"]):active {
        transform: translateY(0);
      }

      input, textarea {
        caret-color: ${primary};
      }

      input:focus, textarea:focus {
        outline-color: ${primary} !important;
      }

      input::selection, textarea::selection {
        background: ${selection};
        color: ${selectionText};
      }

      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active,
      textarea:-webkit-autofill,
      textarea:-webkit-autofill:hover,
      textarea:-webkit-autofill:focus,
      select:-webkit-autofill {
        -webkit-text-fill-color: ${inputText} !important;
        caret-color: ${primary} !important;
        -webkit-box-shadow: 0 0 0 1000px ${inputFill} inset !important;
        box-shadow: 0 0 0 1000px ${inputFill} inset !important;
        border-color: ${outline} !important;
        transition: background-color 9999s ease-out 0s;
      }
    `;
  }, [colors.onSecondaryContainer, colors.secondaryContainer, colors.text, theme.colors]);

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
