import React from 'react';
import { Modal, View, StyleSheet, Text, Pressable } from 'react-native';

interface Props {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
  onDismiss: () => void;
}

export default function AlertDialog({ visible, message, type, onDismiss }: Props) {
  if (!visible) return null;

  const tone =
    {
      success: { accent: '#2e7d32', subtle: '#e8f5e9' },
      error: { accent: '#d32f2f', subtle: '#fdecea' },
      warning: { accent: '#edb100', subtle: '#fff7e0' },
    }[type] ?? { accent: '#edb100', subtle: '#fff7e0' };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Aviso';
      default:
        return 'Aviso';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { borderColor: tone.accent, shadowColor: tone.accent, backgroundColor: '#fff' },
          ]}
        >
          <Text style={[styles.title, { color: tone.accent }]}>{getTitle()}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={[styles.button, { backgroundColor: tone.accent }]}
            android_ripple={{ color: tone.subtle }}
            onPress={onDismiss}
          >
            <Text style={styles.buttonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContainer: {
    width: '92%',
    maxWidth: 520, // melhor proporcional com sua UI
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: '#a98400', // seu gold padrão
    textAlign: 'left',
  },

  message: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1a1a1a',
    marginBottom: 28,
  },

  button: {
    backgroundColor: '#a98400',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'flex-end', // mantém alinhamento elegante
    minWidth: 100,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
