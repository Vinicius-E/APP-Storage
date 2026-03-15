import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ModalFrame from './ModalFrame';

type AddGradeLevelDecisionModalProps = {
  visible: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirmWithProduct: () => void;
  onConfirmWithoutProduct: () => void;
  primaryColor: string;
  surfaceColor: string;
  outlineColor: string;
  textColor: string;
};

export default function AddGradeLevelDecisionModal({
  visible,
  title,
  message,
  loading = false,
  onCancel,
  onConfirmWithProduct,
  onConfirmWithoutProduct,
  primaryColor,
  surfaceColor,
  outlineColor,
  textColor,
}: AddGradeLevelDecisionModalProps) {
  return (
    <ModalFrame
      visible={visible}
      onRequestClose={onCancel}
      containerStyle={{ backgroundColor: surfaceColor, borderColor: outlineColor }}
    >
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={[styles.button, { borderColor: outlineColor, opacity: loading ? 0.6 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: textColor }]}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={onConfirmWithoutProduct}
          disabled={loading}
          style={[styles.button, { borderColor: outlineColor, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text style={[styles.buttonText, { color: textColor }]}>Não</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onConfirmWithProduct}
          disabled={loading}
          style={[
            styles.button,
            {
              borderColor: primaryColor,
              backgroundColor: primaryColor,
              opacity: loading ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: '#ffffff' }]}>Sim</Text>
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    minWidth: 110,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
