import React from 'react';
import {
  Modal,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type ModalFrameProps = {
  visible: boolean;
  onRequestClose?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export default function ModalFrame({
  visible,
  onRequestClose,
  containerStyle,
  children,
}: ModalFrameProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, containerStyle]}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  container: {
    width: '90%',
    maxWidth: 520,
    maxHeight: '86%',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingRight: 4,
  },
});
