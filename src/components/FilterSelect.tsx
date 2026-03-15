import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type HoverablePressableState = PressableStateCallbackType & { hovered?: boolean };

export type FilterSelectOption = {
  value: string;
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
};

type FilterSelectProps = {
  label: string;
  value: string;
  valueLabel: string;
  options: FilterSelectOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  accessibilityLabel?: string;
  width?: ViewStyle['width'];
  minWidth?: ViewStyle['minWidth'];
  maxWidth?: ViewStyle['maxWidth'];
  style?: StyleProp<ViewStyle>;
};

const IS_WEB = Platform.OS === 'web';

export default function FilterSelect({
  label,
  value,
  valueLabel,
  options,
  onSelect,
  disabled = false,
  compact = false,
  open,
  onOpenChange,
  accessibilityLabel,
  width = 240,
  minWidth = 200,
  maxWidth = 320,
  style,
}: FilterSelectProps) {
  const { theme } = useThemeContext();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? Boolean(open) : internalOpen;

  const setOpenState = useMemo(
    () => (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <View
      style={[
        styles.wrap,
        { width, minWidth, maxWidth },
        compact ? styles.wrapCompact : null,
        isOpen ? styles.wrapOpen : null,
        style,
      ]}
    >
      <Text style={[styles.label, { color: theme.colors.primary }]}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `Selecionar ${label}`}
        accessibilityState={{ expanded: isOpen }}
        disabled={disabled}
        onPress={() => setOpenState(!isOpen)}
        style={(state) => {
          const pressed = Boolean(state.pressed);
          const hovered = Boolean((state as HoverablePressableState).hovered);
          const active = isOpen || hovered || pressed;

          return [
            styles.trigger,
            IS_WEB ? styles.interactiveWeb : null,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: active ? theme.colors.primary : theme.colors.outline,
              shadowColor: theme.colors.primary,
              shadowOpacity: active ? 0.12 : 0.04,
              shadowRadius: active ? 14 : 8,
              shadowOffset: { width: 0, height: active ? 8 : 4 },
              elevation: active ? 3 : 1,
              opacity: disabled ? 0.5 : pressed ? 0.96 : 1,
              transform: [{ translateY: hovered ? -1 : 0 }],
            },
          ];
        }}
      >
        {(state) => {
          const pressed = Boolean(state.pressed);
          const hovered = Boolean((state as HoverablePressableState).hovered);
          const active = isOpen || hovered || pressed;
          const triggerTextColor = active ? theme.colors.primary : theme.colors.text;

          return (
            <>
              <Text numberOfLines={1} style={[styles.value, { color: triggerTextColor }]}>
                {valueLabel}
              </Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.primary}
              />
            </>
          );
        }}
      </Pressable>

      {isOpen ? (
        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              shadowColor: theme.colors.primary,
            },
          ]}
        >
          {options.map((option) => {
            const selected = value === option.value;

            return (
              <Pressable
                key={option.value || 'empty'}
                accessibilityRole="button"
                accessibilityLabel={option.accessibilityLabel ?? option.label}
                accessibilityState={{ selected, disabled: option.disabled }}
                disabled={option.disabled}
                onPress={() => {
                  onSelect(option.value);
                  setOpenState(false);
                }}
                style={(state) => {
                  const pressed = Boolean(state.pressed);
                  const hovered = Boolean((state as HoverablePressableState).hovered);
                  const active = selected || (!option.disabled && (hovered || pressed));

                  return [
                    styles.option,
                    IS_WEB ? styles.interactiveWeb : null,
                    {
                      backgroundColor: active ? theme.colors.surfaceVariant : 'transparent',
                      borderColor: active ? theme.colors.primary : theme.colors.outline,
                      opacity: option.disabled ? 0.5 : pressed ? 0.96 : 1,
                      transform: [{ translateY: option.disabled ? 0 : hovered ? -1 : 0 }],
                    },
                  ];
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: option.disabled
                        ? theme.colors.onSurfaceVariant
                        : selected
                          ? theme.colors.primary
                          : theme.colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={16} color={theme.colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 240,
    minWidth: 200,
    maxWidth: 320,
    flexShrink: 0,
    position: 'relative',
    zIndex: 80,
    overflow: 'visible',
  },
  wrapCompact: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  wrapOpen: {
    zIndex: 320,
    elevation: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    gap: 6,
    zIndex: 420,
    elevation: 22,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  option: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  interactiveWeb:
    IS_WEB
      ? ({
          transitionProperty:
            'transform, box-shadow, background-color, border-color, opacity, color',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
          cursor: 'pointer',
        } as any)
      : ({} as any),
});
