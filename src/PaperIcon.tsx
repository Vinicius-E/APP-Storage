import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { IconProps } from 'react-native-paper';

export function PaperIcon(props: IconProps): React.ReactNode {
  const { name, color, size } = props;

  return <MaterialCommunityIcons name={name as any} color={color} size={size} />;
}
