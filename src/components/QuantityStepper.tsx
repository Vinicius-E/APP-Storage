import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';

type Props = {
  value: number;
  onChange: (value: number) => void;

  min?: number;
  max?: number;
  step?: number;

  disabled?: boolean;

  // Estilo opcional
  borderColor?: string;
  textColor?: string;
  primaryColor?: string;
  backgroundColor?: string;
};

const IS_WEB = Platform.OS === 'web';

export default function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  disabled = false,
  borderColor = '#ccc',
  textColor = '#222',
  primaryColor = '#6b5cff',
  backgroundColor = '#fff',
}: Props) {
  const [text, setText] = useState<string>(String(value));
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canMinus = useMemo(() => !disabled && value > min, [disabled, value, min]);
  const canPlus = useMemo(() => !disabled && value < max, [disabled, value, max]);

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const apply = (next: number) => {
    const clamped = clamp(next);
    onChange(clamped);
  };

  const inc = () => {
    if (!canPlus) {
      return;
    }
    apply(value + step);
  };

  const dec = () => {
    if (!canMinus) {
      return;
    }
    apply(value - step);
  };

  const startHold = (fn: () => void) => {
    if (disabled) {
      return;
    }

    fn();

    // segura para repetir
    holdIntervalRef.current = setInterval(() => {
      fn();
    }, 120);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const commitText = () => {
    const onlyDigits = text.replace(/[^\d]/g, '');
    const next = onlyDigits.length ? Number(onlyDigits) : min;
    setText(String(clamp(next)));
    apply(next);
  };

  return (
    <View style={[styles.container, { borderColor, backgroundColor, opacity: disabled ? 0.6 : 1 }]}>
      <Pressable
        onPressIn={() => startHold(dec)}
        onPressOut={stopHold}
        onHoverOut={stopHold}
        disabled={!canMinus}
        style={({ pressed }) => [
          styles.btn,
          { borderColor },
          pressed && !IS_WEB ? { opacity: 0.75 } : null,
          !canMinus ? styles.btnDisabled : null,
        ]}
      >
        <AntDesign name="minus" size={16} color={canMinus ? primaryColor : borderColor} />
      </Pressable>

      <View style={[styles.center, { borderColor }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commitText}
          editable={!disabled}
          keyboardType="numeric"
          inputMode="numeric"
          style={[styles.input, { color: textColor }]}
          textAlign="center"
        />
        <Text style={[styles.hint, { color: textColor, opacity: 0.55 }]}></Text>
      </View>

      <Pressable
        onPressIn={() => startHold(inc)}
        onPressOut={stopHold}
        onHoverOut={stopHold}
        disabled={!canPlus}
        style={({ pressed }) => [
          styles.btn,
          { borderColor },
          pressed && !IS_WEB ? { opacity: 0.75 } : null,
          !canPlus ? styles.btnDisabled : null,
        ]}
      >
        <AntDesign name="plus" size={16} color={canPlus ? primaryColor : borderColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  center: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRightWidth: 1,
    gap: 6,
  },
  input: {
    textAlign: 'center',
    height: 44,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 40,
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
  },
});
