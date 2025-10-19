import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface AlertDialogProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning';
}

export default function AlertDialog({
  visible,
  onDismiss,
  title = 'Aviso',
  message,
  type = 'success',
}: AlertDialogProps) {
  const getColor = () => {
    switch (type) {
      case 'error': return '#D32F2F';
      case 'warning': return '#FFA000';
      case 'success':
      default: return '#388E3C';
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title style={{ color: getColor() }}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
