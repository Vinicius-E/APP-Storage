import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useThemeContext } from '../theme/ThemeContext';

type AuthPrimaryButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function withAlpha(color: string, alpha: number): string {
  const normalized = color.replace('#', '');

  if (normalized.length !== 6) {
    return color;
  }

  const value = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, '0');

  return `#${normalized}${value}`;
}

export default function AuthPrimaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
}: AuthPrimaryButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useThemeContext();

  const baseBackground = theme.colors.surfaceVariant;
  const hoverBackground = useMemo(
    () => withAlpha(theme.colors.primary, 0.12),
    [theme.colors.primary]
  );
  const pressedBackground = useMemo(
    () => withAlpha(theme.colors.primary, 0.18),
    [theme.colors.primary]
  );
  const activeBorder = useMemo(
    () => withAlpha(theme.colors.primary, 0.7),
    [theme.colors.primary]
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.button,
        Platform.OS === 'web' && styles.buttonWeb,
        {
          backgroundColor: pressed ? pressedBackground : isHovered ? hoverBackground : baseBackground,
          borderColor: isHovered || pressed ? activeBorder : theme.colors.primary,
          shadowColor: theme.colors.primary,
          shadowOpacity: isHovered ? 0.2 : 0.12,
          shadowRadius: isHovered ? 14 : 10,
          shadowOffset: { width: 0, height: isHovered ? 8 : 4 },
          elevation: isHovered ? 3 : 1,
          opacity: disabled ? 0.5 : pressed ? 0.96 : 1,
          transform: [{ translateY: isHovered ? -1 : 0 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Text style={[styles.label, { color: theme.colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 56,
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWeb: {
    cursor: 'pointer' as any,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
});
