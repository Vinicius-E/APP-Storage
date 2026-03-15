import React, { useMemo, useState } from 'react';
import { Pressable, Text, StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';

const IS_WEB = Platform.OS === 'web';

type Props = {
  onPress: () => void;
  primaryColor: string;
  creating: boolean;
};

export function AddFileiraButton({ onPress, primaryColor, creating }: Props) {
  const [hovered, setHovered] = useState(false);

  const hoverStyle = useMemo(
    () => (IS_WEB && hovered ? styles.addFileiraButtonHover : null),
    [hovered]
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={creating}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.addFileiraButton,
        { borderColor: primaryColor, opacity: creating ? 0.6 : 1 },
        hoverStyle,
      ]}
    >
      {creating ? (
        <ActivityIndicator size="small" color={primaryColor} />
      ) : (
        <AntDesign name="plus" size={26} color={primaryColor} />
      )}

      {IS_WEB && hovered && !creating && (
        <View style={styles.labelWrapper}>
          <Text style={[styles.addFileiraButtonText, { color: primaryColor }]}>
            Adicionar Fileira
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addFileiraButton: {
    width: 164,
    minWidth: 164,
    height: 230,

    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,

    ...(IS_WEB
      ? ({
          cursor: 'pointer',
          transitionProperty: 'box-shadow, background-color, border-color',
          transitionDuration: '140ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null),
  },

  addFileiraButtonHover: IS_WEB
    ? ({
        backgroundColor: 'rgba(0,0,0,0.025)',
        boxShadow: '0 6px 14px rgba(0,0,0,0.10)',
      } as any)
    : ({} as any),

  labelWrapper: {
    marginTop: 4,
  },

  addFileiraButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});
