import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
  type PressableStateCallbackType,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

export type ListActionTone = 'neutral' | 'danger' | 'success';

type ListActionButtonProps = {
  label: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  fill?: boolean;
  tone?: ListActionTone;
  accessibilityLabel?: string;
  minWidth?: number;
  style?: StyleProp<ViewStyle>;
};

const SUCCESS_ACTION_COLOR = '#2E7D32';
const DANGER_ACTION_COLOR = '#B3261E';

function withAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');

  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const expanded = color.replace(
      /^#(.)(.)(.)$/i,
      (_match, r: string, g: string, b: string) => `#${r}${r}${g}${g}${b}${b}`
    );
    return `${expanded}${hexAlpha}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `${color}${hexAlpha}`;
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}

export default function ListActionButton({
  label,
  icon,
  onPress,
  disabled = false,
  compact = false,
  fill = false,
  tone = 'neutral',
  accessibilityLabel,
  minWidth,
  style,
}: ListActionButtonProps) {
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & { text?: string };
  const textColor = colors.text ?? theme.colors.onSurface;

  const palette = useMemo(() => {
    if (tone === 'danger') {
      return {
        baseBackground: theme.colors.surfaceVariant,
        hoverBackground: withAlpha(DANGER_ACTION_COLOR, 0.12),
        pressedBackground: withAlpha(DANGER_ACTION_COLOR, 0.18),
        baseBorder: withAlpha(DANGER_ACTION_COLOR, 0.55),
        activeBorder: withAlpha(DANGER_ACTION_COLOR, 0.8),
        baseText: DANGER_ACTION_COLOR,
        activeText: DANGER_ACTION_COLOR,
        baseIcon: DANGER_ACTION_COLOR,
        activeIcon: DANGER_ACTION_COLOR,
        shadowColor: DANGER_ACTION_COLOR,
      };
    }

    if (tone === 'success') {
      return {
        baseBackground: theme.colors.surfaceVariant,
        hoverBackground: withAlpha(SUCCESS_ACTION_COLOR, 0.12),
        pressedBackground: withAlpha(SUCCESS_ACTION_COLOR, 0.18),
        baseBorder: withAlpha(SUCCESS_ACTION_COLOR, 0.55),
        activeBorder: withAlpha(SUCCESS_ACTION_COLOR, 0.8),
        baseText: SUCCESS_ACTION_COLOR,
        activeText: SUCCESS_ACTION_COLOR,
        baseIcon: SUCCESS_ACTION_COLOR,
        activeIcon: SUCCESS_ACTION_COLOR,
        shadowColor: SUCCESS_ACTION_COLOR,
      };
    }

    return {
      baseBackground: theme.colors.surfaceVariant,
      hoverBackground: withAlpha(theme.colors.primary, 0.12),
      pressedBackground: withAlpha(theme.colors.primary, 0.18),
      baseBorder: theme.colors.outline,
      activeBorder: withAlpha(theme.colors.primary, 0.7),
      baseText: textColor,
      activeText: theme.colors.primary,
      baseIcon: theme.colors.primary,
      activeIcon: theme.colors.primary,
      shadowColor: theme.colors.primary,
    };
  }, [
    textColor,
    theme.colors.outline,
    theme.colors.primary,
    theme.colors.surfaceVariant,
    tone,
  ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={(state) => {
        const pressed = Boolean(state.pressed);
        const hovered = Boolean((state as HoverablePressableState).hovered);
        const active = !disabled && (pressed || hovered);

        return [
          styles.button,
          Platform.OS === 'web' ? styles.buttonWeb : null,
          compact ? styles.buttonCompact : null,
          fill ? styles.buttonFill : null,
          minWidth != null ? { minWidth } : null,
          style,
          {
            backgroundColor: disabled
              ? palette.baseBackground
              : pressed
                ? palette.pressedBackground
                : active
                  ? palette.hoverBackground
                  : palette.baseBackground,
            borderColor: active ? palette.activeBorder : palette.baseBorder,
            shadowColor: palette.shadowColor,
            shadowOpacity: active ? 0.2 : 0.12,
            shadowRadius: active ? 14 : 10,
            shadowOffset: { width: 0, height: active ? 8 : 4 },
            elevation: active ? 3 : 1,
            opacity: disabled ? 0.45 : pressed ? 0.96 : 1,
            transform: [{ translateY: hovered ? -1 : 0 }],
          },
        ];
      }}
    >
      {(state) => {
        const pressed = Boolean(state.pressed);
        const hovered = Boolean((state as HoverablePressableState).hovered);
        const active = !disabled && (pressed || hovered);
        const resolvedTextColor = disabled
          ? withAlpha(palette.baseText, 0.72)
          : active
            ? palette.activeText
            : palette.baseText;
        const resolvedIconColor = disabled
          ? withAlpha(palette.baseIcon, 0.72)
          : active
            ? palette.activeIcon
            : palette.baseIcon;

        return (
          <>
            {icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={compact ? 16 : 18}
                color={resolvedIconColor}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                compact ? styles.labelCompact : null,
                { color: resolvedTextColor },
              ]}
            >
              {label}
            </Text>
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  buttonWeb:
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transitionProperty: 'transform, background-color, border-color, box-shadow, opacity',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : ({} as any),
  buttonCompact: {
    minHeight: Platform.OS === 'web' ? 36 : 40,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 12,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
  },
  buttonFill: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
  },
});
