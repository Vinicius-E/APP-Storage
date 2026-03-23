import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import ModalFrame from './ModalFrame';

type RemoveLevelDecision = 'item-only' | 'item-and-level';

type RemoveLevelDecisionModalProps = {
  visible: boolean;
  selectedDecision: RemoveLevelDecision | null;
  targetLabel: string;
  loading?: boolean;
  onSelectDecision: (decision: RemoveLevelDecision) => void;
  onCancel: () => void;
  onConfirm: () => void;
  primaryColor: string;
  surfaceColor: string;
  surfaceVariantColor: string;
  outlineColor: string;
  textColor: string;
  secondaryTextColor: string;
};

const IS_WEB = Platform.OS === 'web';

const OPTIONS: Array<{
  value: RemoveLevelDecision;
  title: string;
  description: string;
}> = [
  {
    value: 'item-only',
    title: 'Remover apenas produto',
    description: 'O nível será mantido, apenas o item de estoque será removido.',
  },
  {
    value: 'item-and-level',
    title: 'Remover produto e nível',
    description: 'O nível será removido e os níveis serão reordenados automaticamente.',
  },
];

export default function RemoveLevelDecisionModal({
  visible,
  selectedDecision,
  targetLabel,
  loading = false,
  onSelectDecision,
  onCancel,
  onConfirm,
  primaryColor,
  surfaceColor,
  surfaceVariantColor,
  outlineColor,
  textColor,
  secondaryTextColor,
}: RemoveLevelDecisionModalProps) {
  return (
    <ModalFrame
      visible={visible}
      onRequestClose={onCancel}
      containerStyle={[
        styles.container,
        {
          backgroundColor: surfaceColor,
          borderColor: outlineColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: textColor }]}>Remover conteúdo do nível</Text>
      <Text style={[styles.message, { color: secondaryTextColor }]}>{targetLabel}</Text>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = selectedDecision === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectDecision(option.value)}
              style={(state: any) => [
                styles.optionCard,
                IS_WEB ? styles.optionCardWeb : null,
                {
                  backgroundColor: selected
                    ? surfaceVariantColor
                    : state?.pressed
                      ? `${surfaceVariantColor}CC`
                      : surfaceColor,
                  borderColor: selected || Boolean(state?.hovered) ? primaryColor : outlineColor,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionTitle, { color: selected ? primaryColor : textColor }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, { color: secondaryTextColor }]}>
                  {option.description}
                </Text>
              </View>

              <View
                style={[
                  styles.optionIndicator,
                  {
                    borderColor: selected ? primaryColor : outlineColor,
                    backgroundColor: selected ? primaryColor : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={loading}
          style={[
            styles.actionButton,
            {
              borderColor: outlineColor,
              opacity: loading ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: textColor }]}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={onConfirm}
          disabled={loading || selectedDecision == null}
          style={[
            styles.actionButton,
            {
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              opacity: loading || selectedDecision == null ? 0.6 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.actionText, { color: '#ffffff' }]}>Confirmar</Text>
          )}
        </Pressable>
      </View>
    </ModalFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 620,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  options: {
    gap: 10,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardWeb:
    IS_WEB
      ? ({
          cursor: 'pointer',
          transitionProperty: 'border-color, background-color, transform, opacity',
          transitionDuration: '140ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : ({} as any),
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  optionIndicator: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 999,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 16,
  },
  actionButton: {
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
