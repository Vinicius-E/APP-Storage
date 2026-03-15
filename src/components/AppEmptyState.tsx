import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import EstadoVazio, { EstadoVazioTipo } from './EstadoVazio';

type AppEmptyStateProps = {
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'default' | 'error';
  tipo?: EstadoVazioTipo;
  style?: StyleProp<ViewStyle>;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function AppEmptyState({
  title,
  description,
  icon = 'inbox-outline',
  tone = 'default',
  tipo,
  style,
  onRetry,
  retryLabel,
}: AppEmptyStateProps) {
  return (
    <EstadoVazio
      tipo={tipo ?? (tone === 'error' ? 'erro' : 'vazio')}
      titulo={title}
      subtitulo={description}
      icon={icon}
      style={style}
      onRetry={onRetry}
      retryLabel={retryLabel}
    />
  );
}
