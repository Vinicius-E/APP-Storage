import React from 'react';
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
      style={(state: any) => {
        const pressed = Boolean(state?.pressed);
        const hovered = Boolean(state?.hovered);

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
              transform: [{ translateY: -1 }],
              boxShadow: '0 4px 10px rgba(0,0,0,0.14)',
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
    transitionProperty: 'transform, box-shadow, border-color, opacity',
    transitionDuration: '140ms',
    transitionTimingFunction: 'ease-out',
  } as any,
});
