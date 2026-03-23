import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Icon } from 'react-native-paper';

type SizePreset = 'small' | 'medium' | 'large';

type Props = {
  iconName: string;
  onPress: (event?: any) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number | SizePreset;
  buttonSize?: { width: number; height: number };
  borderColor: string;
  backgroundColor: string;
  iconColor: string;
  primaryColor?: string;
  stopPropagation?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const presetToPx = (value: SizePreset): number => {
  if (value === 'small') {
    return 14;
  }
  if (value === 'large') {
    return 18;
  }
  return 16;
};

const IS_WEB = Platform.OS === 'web';

export function ActionIconButton(props: Props) {
  const [hovered, setHovered] = useState(false);
  const {
    iconName,
    onPress,
    disabled,
    loading,
    size,
    buttonSize,
    borderColor,
    backgroundColor,
    iconColor,
    primaryColor,
    stopPropagation,
    style,
    testID,
  } = props;

  const iconSize = typeof size === 'number' ? size : presetToPx(size ?? 'medium');
  const iconSource = iconName === 'search1' ? 'search' : iconName;
  const width = buttonSize?.width ?? 28;
  const height = buttonSize?.height ?? 28;

  return (
    <Pressable
      testID={testID}
      onPress={(e) => {
        if (stopPropagation) {
          e?.stopPropagation?.();
        }
        if (disabled || loading) {
          return;
        }
        onPress(e);
      }}
      onHoverIn={() => {
        if (IS_WEB) {
          setHovered(true);
        }
      }}
      onHoverOut={() => {
        if (IS_WEB) {
          setHovered(false);
        }
      }}
      style={(state: any) => {
        const pressed = Boolean(state?.pressed);

        return [
          styles.btn,
          { width, height, borderColor, backgroundColor, opacity: disabled ? 0.4 : 1 },
          IS_WEB && styles.webBtnAnimated,
          hovered &&
            IS_WEB &&
            !disabled &&
            !loading &&
            ({
              borderColor: primaryColor ?? borderColor,
              backgroundColor: 'rgba(212, 163, 115, 0.08)',
              transform: [{ translateY: -1 }],
            } as any),
          pressed && !disabled && !loading && { opacity: 0.75 },
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Icon source={iconSource} size={iconSize} color={iconColor} />
      )}
    </Pressable>
  );
}

export default ActionIconButton;

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBtnAnimated: {
    transitionProperty: 'transform, background-color, border-color, opacity',
    transitionDuration: '140ms',
    transitionTimingFunction: 'ease-out',
    cursor: 'pointer',
  } as any,
});
