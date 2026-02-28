import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeContext } from '../theme/ThemeContext';

type AuthCardProps = {
  badge: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function AuthCard({ badge, title, subtitle, children }: AuthCardProps) {
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & { text?: string; textSecondary?: string };
  const textColor = colors.text ?? theme.colors.onSurface;
  const secondaryText = colors.textSecondary ?? theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{badge}</Text>
      </View>

      {title ? <Text style={[styles.title, { color: textColor }]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: secondaryText }]}>{subtitle}</Text>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 2,
  },
  badge: {
    alignSelf: 'center',
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  title: {
    marginTop: 18,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
});
