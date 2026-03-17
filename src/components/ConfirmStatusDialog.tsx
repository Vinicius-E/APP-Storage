import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppModalFrame from './AppModalFrame';

type ConfirmStatusDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  confirmTone?: 'danger' | 'success';
  processing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmStatusDialog({
  visible,
  title,
  description,
  confirmLabel,
  confirmIcon,
  confirmTone = 'danger',
  processing = false,
  onCancel,
  onConfirm,
}: ConfirmStatusDialogProps) {
  return (
    <AppModalFrame
      visible={visible}
      title={title}
      subtitle={description}
      onDismiss={onCancel}
      dismissDisabled={processing}
      maxWidth={480}
      maxHeightRatio={0.8}
      actions={[
        {
          label: 'Cancelar',
          icon: 'close',
          onPress: onCancel,
          disabled: processing,
          tone: 'secondary',
        },
        {
          label: confirmLabel,
          icon: confirmIcon,
          onPress: onConfirm,
          disabled: processing,
          tone: confirmTone,
        },
      ]}
    />
  );
}
