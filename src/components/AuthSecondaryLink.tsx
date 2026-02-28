import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useThemeContext } from '../theme/ThemeContext';

type AuthSecondaryLinkProps = {
  label: string;
  onPress: () => void;
};

export default function AuthSecondaryLink({ label, onPress }: AuthSecondaryLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useThemeContext();
  const webLinkStyle =
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transitionDuration: '140ms',
          transitionProperty: 'transform, opacity',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null;
  const webTextStyle =
    Platform.OS === 'web'
      ? ({
          transitionDuration: '140ms',
          transitionProperty: 'transform, opacity',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.linkButton,
        webLinkStyle,
        {
          backgroundColor: 'transparent',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.linkText,
          webTextStyle,
          {
            color: theme.colors.primary,
            opacity: isHovered ? 0.88 : 1,
            transform: [{ translateY: isHovered ? -1 : 0 }],
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    marginTop: 14,
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
