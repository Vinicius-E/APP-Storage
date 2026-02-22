import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ModalFrame from './ModalFrame';

type FeedbackModalProps = {
  visible: boolean;
  title: string;
  message: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  onClose: () => void;
  messageNumberOfLines?: number;
};

export default function FeedbackModal({
  visible,
  title,
  message,
  accentColor,
  surfaceColor,
  textColor,
  onClose,
  messageNumberOfLines,
}: FeedbackModalProps) {
  return (
    <ModalFrame
      visible={visible}
      onRequestClose={onClose}
      containerStyle={[
        styles.container,
        {
          backgroundColor: surfaceColor,
          borderColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
      <Text
        numberOfLines={messageNumberOfLines}
        ellipsizeMode={messageNumberOfLines ? 'tail' : undefined}
        style={[styles.message, { color: textColor }]}
      >
        {message}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          style={[
            styles.button,
            {
              backgroundColor: accentColor,
              borderColor: accentColor,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>OK</Text>
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700' },
});
