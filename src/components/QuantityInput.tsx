import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { useThemeContext } from '../theme/ThemeContext';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}

export default function QuantityInput({ value, onChange, min = 0, max, style }: Props) {
  const { theme } = useThemeContext();
  const colors = theme.colors;

  const clamp = (num: number) => {
    const lower = min ?? Number.NEGATIVE_INFINITY;
    const upper = max ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(num, lower), upper);
  };

  const handleStep = (delta: number) => {
    const next = clamp(value + delta);
    onChange(next);
  };

  const handleTextChange = (text: string) => {
    const parsed = parseInt(text.replace(/[^0-9-]/g, ''), 10);
    if (Number.isNaN(parsed)) {
      onChange(clamp(0));
    } else {
      onChange(clamp(parsed));
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        style,
        { borderColor: colors.outline, backgroundColor: colors.surface },
      ]}
    >
      <Pressable
        onPress={() => handleStep(-1)}
        style={[
          styles.stepper,
          styles.stepperLeft,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
        ]}
        android_ripple={{ color: colors.outline }}
      >
        <Text style={[styles.stepText, { color: colors.text }]}>-</Text>
      </Pressable>

      <TextInput
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={handleTextChange}
        style={[styles.input, { color: colors.text }]}
        placeholder="0"
        placeholderTextColor={colors.outline}
      />

      <Pressable
        onPress={() => handleStep(1)}
        style={[
          styles.stepper,
          styles.stepperRight,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
        ]}
        android_ripple={{ color: colors.outline }}
      >
        <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 46,
    flex: 1,
    minWidth: 0,
  },
  stepper: {
    width: 36,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLeft: {
    borderRightWidth: 1,
  },
  stepperRight: {
    borderLeftWidth: 1,
  },
  stepText: {
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    minWidth: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
});
