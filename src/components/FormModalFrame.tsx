import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Button, Modal, Portal, Surface, Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type FormModalFrameProps = {
  visible: boolean;
  saving?: boolean;
  title: string;
  subtitle: string;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  primaryActionLoading?: boolean;
  onDismiss: () => void;
  onPrimaryPress: () => void;
  children: React.ReactNode;
  scrollContentStyle?: StyleProp<ViewStyle>;
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
}: FormModalFrameProps) {
  const { theme } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 720;
  const modalWidth = Math.min(width - (isCompact ? 20 : 48), isCompact ? 560 : 760);
  const modalMaxHeight = Math.max(360, height * 0.88);
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={saving ? undefined : onDismiss}
        contentContainerStyle={styles.modalOuter}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Surface
            style={[
              styles.modalSurface,
              {
                width: modalWidth,
                maxHeight: modalMaxHeight,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerTextWrap}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Fechar modal de ${title.toLowerCase()}`}
                disabled={saving}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                    opacity: saving ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={[
                styles.formContent,
                { paddingBottom: isCompact ? 18 : 22 },
                scrollContentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            <View
              style={[
                styles.actions,
                isCompact ? styles.actionsCompact : null,
                { borderTopColor: theme.colors.outline },
              ]}
            >
              <Button
                mode="text"
                onPress={onDismiss}
                disabled={saving}
                contentStyle={styles.secondaryButtonContent}
                labelStyle={{ color: theme.colors.primary, fontWeight: '800' }}
              >
                Cancelar
              </Button>

              <Button
                mode="contained"
                onPress={onPrimaryPress}
                disabled={primaryActionDisabled}
                loading={primaryActionLoading}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                contentStyle={styles.primaryButtonContent}
                labelStyle={styles.primaryButtonLabel}
              >
                {primaryActionLabel}
              </Button>
            </View>
          </Surface>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  modalSurface: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeButton: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  formScroll: {
    flexGrow: 0,
  },
  formContent: {
    paddingHorizontal: 20,
  },
  actions: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionsCompact: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  secondaryButtonContent: {
    minHeight: 46,
    paddingHorizontal: 8,
  },
  primaryButtonContent: {
    minHeight: 48,
    paddingHorizontal: 10,
  },
  primaryButtonLabel: {
    fontWeight: '800',
  },
});
