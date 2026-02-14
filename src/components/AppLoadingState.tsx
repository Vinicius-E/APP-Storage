import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type AppLoadingStateProps = {
  message: string;
  variant?: 'block' | 'inline';
  style?: StyleProp<ViewStyle>;
};

export default function AppLoadingState({
  message,
  variant = 'block',
  style,
}: AppLoadingStateProps) {
  const { theme } = useThemeContext();
  const textSecondary = (theme.colors as any).textSecondary ?? theme.colors.text;
  const isInline = variant === 'inline';

  return (
    <View style={[styles.base, isInline ? styles.inline : styles.block, style]}>
      <ActivityIndicator size={isInline ? 'small' : 'large'} color={theme.colors.primary} />
      <Text style={[styles.text, isInline ? styles.textInline : styles.textBlock, { color: textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    minHeight: 148,
    paddingVertical: 20,
    gap: 10,
  },
  inline: {
    flexDirection: 'row',
    minHeight: 36,
    paddingVertical: 4,
    gap: 8,
  },
  text: {
    textAlign: 'center',
  },
  textBlock: {
    fontSize: 14,
    fontWeight: '700',
  },
  textInline: {
    fontSize: 12,
    fontWeight: '700',
  },
});
