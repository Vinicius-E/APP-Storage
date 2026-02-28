import React from 'react';
import { Modal, View, StyleSheet, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';

interface Props {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
  onDismiss: () => void;
}

export default function AlertDialog({ visible, message, type, onDismiss }: Props) {
  const { width, height } = useWindowDimensions();
  if (!visible) return null;
  const isCompact = width < 420;
  const dialogWidth = Math.min(width - (isCompact ? 24 : 32), 520);
  const dialogMaxHeight = Math.max(220, height * 0.84);
  const messageMaxHeight = Math.max(80, Math.min(height * 0.28, isCompact ? 180 : 320));

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
      <View
        style={[
          styles.overlay,
          {
            paddingHorizontal: isCompact ? 12 : 16,
            paddingVertical: isCompact ? 16 : 20,
          },
        ]}
      >
        <View
          style={[
            styles.modalContainer,
            {
              width: dialogWidth,
              maxHeight: dialogMaxHeight,
              borderColor: tone.accent,
              shadowColor: tone.accent,
              backgroundColor: '#fff',
              borderRadius: isCompact ? 16 : 18,
              paddingVertical: isCompact ? 22 : 28,
              paddingHorizontal: isCompact ? 18 : 24,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: tone.accent,
                fontSize: isCompact ? 20 : 22,
                marginBottom: isCompact ? 10 : 12,
              },
            ]}
          >
            {getTitle()}
          </Text>
          <ScrollView
            style={[
              styles.messageScroll,
              {
                maxHeight: messageMaxHeight,
                marginBottom: isCompact ? 18 : 22,
              },
            ]}
            contentContainerStyle={styles.messageScrollContent}
            showsVerticalScrollIndicator
          >
            <Text
              style={[
                styles.message,
                {
                  fontSize: isCompact ? 15 : 16,
                  lineHeight: isCompact ? 21 : 22,
                },
              ]}
            >
              {message}
            </Text>
          </ScrollView>

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: tone.accent,
                alignSelf: isCompact ? 'stretch' : 'flex-end',
                minWidth: isCompact ? 0 : 100,
              },
            ]}
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
    paddingVertical: 20,
  },

  modalContainer: {
    maxWidth: 520, // melhor proporcional com sua UI
    maxHeight: '84%',
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

  messageScroll: {
    maxHeight: 320,
    marginBottom: 22,
  },

  messageScrollContent: {
    paddingRight: 4,
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
