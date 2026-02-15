import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type AppEmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'default' | 'error';
  style?: StyleProp<ViewStyle>;
};

export default function AppEmptyState({
  title,
  description,
  icon = 'inbox-outline',
  tone = 'default',
  style,
}: AppEmptyStateProps) {
  const { theme } = useThemeContext();
  const textSecondary = (theme.colors as any).textSecondary ?? theme.colors.onSurfaceVariant;
  const iconColor = tone === 'error' ? '#B3261E' : textSecondary;

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: textSecondary }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
