import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Modal, Portal, Surface, Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';
import ListActionButton, { type ListActionTone } from './ListActionButton';

type ConfirmStatusDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  confirmTone?: ListActionTone;
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
  const { theme } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 640;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={processing ? undefined : onCancel}
        contentContainerStyle={styles.confirmModalOuter}
      >
        <Surface
          style={[
            styles.confirmModalSurface,
            {
              width: Math.min(width - 24, 480),
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>{title}</Text>

          <Text style={[styles.confirmDescription, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>

          <View style={[styles.confirmActions, isCompact ? styles.confirmActionsCompact : null]}>
            <ListActionButton
              label="Cancelar"
              icon="close"
              onPress={onCancel}
              disabled={processing}
              compact
            />

            <ListActionButton
              label={confirmLabel}
              icon={confirmIcon}
              onPress={onConfirm}
              disabled={processing}
              compact
              tone={confirmTone}
            />
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  confirmModalOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  confirmModalSurface: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  confirmDescription: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  confirmActionsCompact: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
});
