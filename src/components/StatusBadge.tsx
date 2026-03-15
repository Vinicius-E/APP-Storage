import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const expanded = color.replace(
      /^#(.)(.)(.)$/i,
      (_match, r: string, g: string, b: string) => `#${r}${r}${g}${g}${b}${b}`
    );
    return `${expanded}${hexAlpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${hexAlpha}`;
  }

  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}

function getStatusLabel(active: boolean): string {
  return active ? 'Ativo' : 'Inativo';
}

type StatusBadgeProps = {
  active: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function StatusBadge({ active, style }: StatusBadgeProps) {
  const { theme } = useThemeContext();
  const accent = active ? '#2E7D32' : theme.colors.error;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: withAlpha(accent, active ? 0.1 : 0.08),
          borderColor: withAlpha(accent, 0.24),
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: accent }]}>{getStatusLabel(active)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
});
