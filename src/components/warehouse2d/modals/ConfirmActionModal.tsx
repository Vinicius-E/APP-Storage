import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ModalFrame from './ModalFrame';

type ConfirmActionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  warningText?: string;
  cancelText?: string;
  confirmText?: string;
  surfaceColor: string;
  outlineColor: string;
  textColor: string;
  confirmColor: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmActionModal({
  visible,
  title,
  message,
  warningText,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  surfaceColor,
  outlineColor,
  textColor,
  confirmColor,
  confirmLoading = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <ModalFrame
      visible={visible}
      onRequestClose={onCancel}
      containerStyle={{ backgroundColor: surfaceColor, borderColor: outlineColor }}
    >
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      {warningText ? <Text style={[styles.warning, { color: textColor }]}>{warningText}</Text> : null}

      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={[styles.button, { borderColor: outlineColor }]}>
          <Text style={[styles.buttonText, { color: textColor }]}>{cancelText}</Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          style={[styles.button, { backgroundColor: confirmColor, borderColor: confirmColor }]}
          disabled={confirmDisabled}
        >
          {confirmLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, { color: '#fff' }]}>{confirmText}</Text>
          )}
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  message: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  warning: { fontSize: 13, opacity: 0.85, marginBottom: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700' },
});
