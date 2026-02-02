import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';

const IS_WEB = Platform.OS === 'web';

type SizePreset = 'small' | 'medium' | 'large';
type ButtonSize = { width: number; height: number; radius?: number };

type Props = {
  iconName: 'plus' | 'minus';
  onPress: () => void;

  disabled?: boolean;
  loading?: boolean;

  size?: number | SizePreset;
  buttonSize?: ButtonSize;

  borderColor: string;
  backgroundColor?: string;
  iconColor: string;

  primaryColor: string; // ✅ usado no hover da borda

  stopPropagation?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function resolveIconSize(size?: number | SizePreset): number {
  if (typeof size === 'number') {
    return size;
  }

  if (size === 'large') {
    return 18;
  }

  if (size === 'small') {
    return 14;
  }

  return 16;
}

function resolveButtonSize(buttonSize?: ButtonSize) {
  const width = buttonSize?.width ?? 26;
  const height = buttonSize?.height ?? 22;
  const radius = buttonSize?.radius ?? 6;
  return { width, height, radius };
}

export function ActionIconButton({
  iconName,
  onPress,
  disabled = false,
  loading = false,
  size = 'medium',
  buttonSize,
  borderColor,
  backgroundColor = 'transparent',
  iconColor,
  primaryColor,
  stopPropagation = true,
  style,
  testID,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const iconSize = resolveIconSize(size);

  const { width, height, radius } = useMemo(() => {
    return resolveButtonSize(buttonSize);
  }, [buttonSize]);

  const effectiveBorderColor =
    IS_WEB && hovered && !disabled && !loading ? primaryColor : borderColor;

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={(e) => {
        if (stopPropagation && (e as any)?.stopPropagation) {
          (e as any).stopPropagation();
        }

        if (disabled || loading) {
          return;
        }

        onPress();
      }}
      style={[
        styles.root,
        {
          width,
          height,
          borderRadius: radius,
          borderColor: effectiveBorderColor,
          backgroundColor,
          opacity: disabled ? 0.55 : 1,
        },
        hovered && IS_WEB && !disabled && !loading ? styles.hovered : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <AntDesign name={iconName} size={iconSize} color={disabled ? borderColor : iconColor} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',

    ...(IS_WEB
      ? ({
          cursor: 'pointer',
          transitionProperty: 'transform, box-shadow, background-color, border-color',
          transitionDuration: '120ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null),
  },

  hovered: IS_WEB
    ? ({
        transform: [{ scale: 1.05 }],
        boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
      } as any)
    : ({} as any),
});
