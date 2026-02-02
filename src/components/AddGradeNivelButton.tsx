import React, { useMemo, useState } from 'react';
import { Pressable, Text, StyleSheet, Platform, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';

const IS_WEB = Platform.OS === 'web';

type Props = {
  onPress: () => void;
  borderColor: string;
  primaryColor: string;
  mode?: 'add' | 'remove';
};

export function AddGradeNivelButton({ onPress, borderColor, primaryColor, mode = 'add' }: Props) {
  const [hovered, setHovered] = useState(false);

  const label = mode === 'add' ? 'Adicionar Produto' : 'Remover Produto';
  const iconName = mode === 'add' ? 'plus' : 'minus';

  const hoverStyle = useMemo(() => {
    if (!IS_WEB || !hovered) {
      return null;
    }

    return {
      transform: [{ scale: 1.005 }],
      borderColor: primaryColor,
      backgroundColor: 'rgba(0,0,0,0.015)',
      boxShadow: '0 8px 18px rgba(0,0,0,0.10)',
    } as any;
  }, [hovered, primaryColor]);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.addGradeButton, { borderColor }, hoverStyle]}
    >
      <AntDesign name={iconName} size={22} color={primaryColor} />

      {IS_WEB && hovered && (
        <View style={styles.labelWrapper}>
          <Text style={[styles.addGradeLabel, { color: primaryColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addGradeButton: {
    maxWidth: 110,
    height: 150,
    minHeight: 150,

    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,

    paddingVertical: 12,
    paddingHorizontal: 10,

    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,

    ...(IS_WEB
      ? ({
          cursor: 'pointer',
          transitionProperty: 'transform, box-shadow, background-color, border-color',
          transitionDuration: '120ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null),
  },

  labelWrapper: {
    marginTop: 4,
  },

  addGradeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});
