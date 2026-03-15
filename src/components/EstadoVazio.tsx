import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

export type EstadoVazioTipo = 'erro' | 'vazio' | 'semResultado';

type EstadoVazioProps = {
  tipo?: EstadoVazioTipo;
  titulo: string;
  subtitulo?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  style?: StyleProp<ViewStyle>;
  onRetry?: () => void;
  retryLabel?: string;
};

const TYPE_CONFIG: Record<
  EstadoVazioTipo,
  {
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    accent: string;
    background: string;
  }
> = {
  erro: {
    icon: 'alert-circle-outline',
    accent: '#C0392B',
    background: '#FDF0F0',
  },
  vazio: {
    icon: 'package-variant-closed',
    accent: '#8B6914',
    background: '#F5EDE0',
  },
  semResultado: {
    icon: 'magnify',
    accent: '#8B6914',
    background: '#F5EDE0',
  },
};

export default function EstadoVazio({
  tipo = 'vazio',
  titulo,
  subtitulo,
  icon,
  style,
  onRetry,
  retryLabel = 'Tentar novamente',
}: EstadoVazioProps) {
  const { theme } = useThemeContext();
  const textSecondary = (theme.colors as typeof theme.colors & { textSecondary?: string })
    .textSecondary ?? theme.colors.onSurfaceVariant;
  const palette = TYPE_CONFIG[tipo];

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBadge, { backgroundColor: palette.background }]}>
        <MaterialCommunityIcons
          name={icon ?? palette.icon}
          size={32}
          color={palette.accent}
        />
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>{titulo}</Text>

      {subtitulo ? (
        <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitulo}</Text>
      ) : null}

      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: theme.colors.primary,
              backgroundColor: pressed ? palette.background : 'transparent',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={16}
            color={theme.colors.primary}
            style={styles.buttonIcon}
          />
          <Text style={[styles.buttonLabel, { color: theme.colors.primary }]}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
    textAlign: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 12,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
