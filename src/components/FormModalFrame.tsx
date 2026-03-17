import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import AppModalFrame from './AppModalFrame';

type FormModalFrameProps = {
  visible: boolean;
  saving?: boolean;
  title: string;
  subtitle?: string;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  primaryActionLoading?: boolean;
  onDismiss: () => void;
  onPrimaryPress: () => void;
  children: React.ReactNode;
  scrollContentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
};

export default function FormModalFrame({
  visible,
  saving = false,
  title,
  subtitle,
  primaryActionLabel,
  primaryActionDisabled = false,
  primaryActionLoading = false,
  onDismiss,
  onPrimaryPress,
  children,
  scrollContentStyle,
  maxWidth = 760,
}: FormModalFrameProps) {
  return (
    <AppModalFrame
      visible={visible}
      title={title}
      subtitle={subtitle}
      onDismiss={onDismiss}
      dismissDisabled={saving}
      maxWidth={maxWidth}
      scrollContentStyle={scrollContentStyle}
      actions={[
        {
          label: 'Cancelar',
          onPress: onDismiss,
          disabled: saving,
          tone: 'secondary',
        },
        {
          label: primaryActionLabel,
          onPress: onPrimaryPress,
          disabled: primaryActionDisabled,
          loading: primaryActionLoading,
          tone: 'primary',
        },
      ]}
    >
      {children}
    </AppModalFrame>
  );
}
