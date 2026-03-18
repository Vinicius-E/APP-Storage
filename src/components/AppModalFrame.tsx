import React, { ReactNode, useEffect, useMemo } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
  type PressableStateCallbackType,
} from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BodyPortal from './BodyPortal';
import { useThemeContext } from '../theme/ThemeContext';

type HoverablePressableState = PressableStateCallbackType & {
  focused?: boolean;
  hovered?: boolean;
};

export type ModalActionTone = 'primary' | 'secondary' | 'danger' | 'success';

export type ModalAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  tone?: ModalActionTone;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type AppModalFrameProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onDismiss: () => void;
  dismissDisabled?: boolean;
  children?: ReactNode;
  actions?: ModalAction[];
  footerContent?: ReactNode;
  headerAccessory?: ReactNode;
  maxWidth?: number;
  maxHeightRatio?: number;
  minHeight?: number;
  closeAccessibilityLabel?: string;
  stackActionsOnCompact?: boolean;
  scrollContentStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
};

type ModalActionButtonProps = ModalAction & {
  compact: boolean;
};

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

function ModalActionButton({
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  loading = false,
  tone = 'secondary',
  icon,
  compact,
}: ModalActionButtonProps) {
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & { text?: string };
  const textColor = colors.text ?? theme.colors.onSurface;

  const palette = useMemo(() => {
    if (tone === 'primary') {
      return {
        background: theme.colors.primary,
        hoverBackground: withAlpha(theme.colors.primary, 0.92),
        pressedBackground: withAlpha(theme.colors.primary, 0.84),
        border: theme.colors.primary,
        activeBorder: withAlpha(theme.colors.primary, 0.96),
        text: theme.colors.onPrimary,
        activeText: theme.colors.onPrimary,
        iconColor: theme.colors.onPrimary,
        shadowColor: theme.colors.primary,
      };
    }

    if (tone === 'danger') {
      const accent = '#B3261E';
      return {
        background: theme.colors.surfaceVariant,
        hoverBackground: withAlpha(accent, 0.12),
        pressedBackground: withAlpha(accent, 0.18),
        border: withAlpha(accent, 0.5),
        activeBorder: withAlpha(accent, 0.8),
        text: accent,
        activeText: accent,
        iconColor: accent,
        shadowColor: accent,
      };
    }

    if (tone === 'success') {
      const accent = '#2E7D32';
      return {
        background: theme.colors.surfaceVariant,
        hoverBackground: withAlpha(accent, 0.12),
        pressedBackground: withAlpha(accent, 0.18),
        border: withAlpha(accent, 0.5),
        activeBorder: withAlpha(accent, 0.8),
        text: accent,
        activeText: accent,
        iconColor: accent,
        shadowColor: accent,
      };
    }

    return {
      background: theme.colors.surface,
      hoverBackground: withAlpha(theme.colors.primary, 0.08),
      pressedBackground: withAlpha(theme.colors.primary, 0.14),
      border: theme.colors.outline,
      activeBorder: withAlpha(theme.colors.primary, 0.7),
      text: textColor,
      activeText: theme.colors.primary,
      iconColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
    };
  }, [
    textColor,
    theme.colors.onPrimary,
    theme.colors.onSurface,
    theme.colors.outline,
    theme.colors.primary,
    theme.colors.surface,
    theme.colors.surfaceVariant,
    tone,
  ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || loading}
      onPress={onPress}
      style={(state) => {
        const pressed = Boolean(state.pressed);
        const hovered = Boolean((state as HoverablePressableState).hovered);
        const focused = Boolean((state as HoverablePressableState).focused);
        const active = !disabled && (pressed || hovered || focused);

        return [
          styles.actionButton,
          compact ? styles.actionButtonCompact : null,
          Platform.OS === 'web' ? styles.interactiveWeb : null,
          {
            backgroundColor: disabled
              ? palette.background
              : pressed
                ? palette.pressedBackground
                : active
                  ? palette.hoverBackground
                  : palette.background,
            borderColor: active ? palette.activeBorder : palette.border,
            shadowColor: palette.shadowColor,
            shadowOpacity: tone === 'primary' ? (active ? 0.22 : 0.16) : active ? 0.12 : 0.05,
            shadowRadius: active ? 14 : 10,
            shadowOffset: { width: 0, height: active ? 8 : 4 },
            elevation: active ? 3 : 1,
            opacity: disabled ? 0.48 : pressed ? 0.96 : 1,
            transform: [{ translateY: hovered ? -1 : 0 }],
            ...(Platform.OS === 'web'
              ? ({
                  outlineWidth: focused ? 2 : 0,
                  outlineStyle: 'solid',
                  outlineColor: withAlpha(palette.shadowColor, 0.3),
                } as any)
              : null),
          },
        ];
      }}
    >
      {(state) => {
        const pressed = Boolean(state.pressed);
        const hovered = Boolean((state as HoverablePressableState).hovered);
        const focused = Boolean((state as HoverablePressableState).focused);
        const active = !disabled && (pressed || hovered || focused);
        const resolvedColor = active ? palette.activeText : palette.text;

        return (
          <>
            {loading ? (
              <ActivityIndicator size="small" color={resolvedColor} />
            ) : icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={compact ? 16 : 18}
                color={active ? palette.activeText : palette.iconColor}
              />
            ) : null}
            <Text style={[styles.actionButtonLabel, compact ? styles.actionButtonLabelCompact : null, { color: resolvedColor }]}>
              {label}
            </Text>
          </>
        );
      }}
    </Pressable>
  );
}

export default function AppModalFrame({
  visible,
  title,
  subtitle,
  onDismiss,
  dismissDisabled = false,
  children,
  actions = [],
  footerContent,
  headerAccessory,
  maxWidth = 760,
  maxHeightRatio = 0.85,
  minHeight = 280,
  closeAccessibilityLabel,
  stackActionsOnCompact = true,
  scrollContentStyle,
  bodyStyle,
}: AppModalFrameProps) {
  const { theme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 720;
  const panelWidth = Math.min(width - (isCompact ? 20 : 48), maxWidth);
  const panelMaxHeight =
    Platform.OS === 'web'
      ? (`${Math.round(maxHeightRatio * 100)}vh` as const)
      : Math.max(minHeight, Math.floor(height * maxHeightRatio));
  const textSecondary =
    (theme.colors as typeof theme.colors & { textSecondary?: string }).textSecondary ??
    theme.colors.onSurfaceVariant;

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !visible ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    const previousHtmlStyles = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'contain';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'contain';

    return () => {
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      html.style.overflow = previousHtmlStyles.overflow;
      html.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const renderBackdrop = dismissDisabled ? (
    <View pointerEvents="none" style={styles.backdrop} />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={closeAccessibilityLabel ?? `Fechar modal de ${title.toLowerCase()}`}
      onPress={onDismiss}
      style={styles.backdrop}
    />
  );

  return (
    <BodyPortal>
      {renderBackdrop}
      <View
        pointerEvents="box-none"
        style={[
          styles.viewport,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Surface
            style={[
              styles.surface,
              {
                width: panelWidth,
                maxHeight: panelMaxHeight as any,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerTextWrap}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    closeAccessibilityLabel ?? `Fechar modal de ${title.toLowerCase()}`
                  }
                  disabled={dismissDisabled}
                  onPress={onDismiss}
                  style={(state) => {
                    const pressed = Boolean(state.pressed);
                    const hovered = Boolean((state as HoverablePressableState).hovered);
                    const focused = Boolean((state as HoverablePressableState).focused);
                    const active = !dismissDisabled && (pressed || hovered || focused);

                    return [
                      styles.closeButton,
                      Platform.OS === 'web' ? styles.interactiveWeb : null,
                      {
                        backgroundColor: active
                          ? withAlpha(theme.colors.primary, pressed ? 0.16 : 0.1)
                          : theme.colors.surface,
                        borderColor: active
                          ? withAlpha(theme.colors.primary, 0.55)
                          : theme.colors.outline,
                        opacity: dismissDisabled ? 0.45 : 1,
                        transform: [{ scale: pressed ? 0.96 : hovered ? 1.02 : 1 }],
                        ...(Platform.OS === 'web'
                          ? ({
                              outlineWidth: focused ? 2 : 0,
                              outlineStyle: 'solid',
                              outlineColor: withAlpha(theme.colors.primary, 0.24),
                            } as any)
                          : null),
                      },
                    ];
                  }}
                >
                  {(state) => {
                    const hovered = Boolean((state as HoverablePressableState).hovered);
                    const focused = Boolean((state as HoverablePressableState).focused);
                    const pressed = Boolean(state.pressed);
                    const active = !dismissDisabled && (pressed || hovered || focused);

                    return (
                      <MaterialCommunityIcons
                        name="close"
                        size={18}
                        color={active ? theme.colors.primary : textSecondary}
                      />
                    );
                  }}
                </Pressable>
              </View>

              {headerAccessory ? <View style={styles.headerAccessory}>{headerAccessory}</View> : null}
            </View>

            <ScrollView
              style={[styles.bodyScroll, bodyStyle]}
              contentContainerStyle={[
                styles.bodyContent,
                { paddingBottom: insets.bottom + 16 },
                scrollContentStyle,
              ]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              automaticallyAdjustContentInsets
              automaticallyAdjustsScrollIndicatorInsets
              contentInsetAdjustmentBehavior="automatic"
              scrollIndicatorInsets={{
                top: 0,
                left: 0,
                right: 0,
                bottom: insets.bottom + 16,
              }}
            >
              {children}
            </ScrollView>

            {footerContent ? (
              <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
                {footerContent}
              </View>
            ) : actions.length > 0 ? (
              <View
                style={[
                  styles.footer,
                  { borderTopColor: theme.colors.outlineVariant },
                  isCompact && stackActionsOnCompact ? styles.footerCompact : null,
                ]}
              >
                {actions.map((action) => (
                  <ModalActionButton
                    key={`${action.label}-${action.tone ?? 'secondary'}`}
                    compact={isCompact}
                    {...action}
                  />
                ))}
              </View>
            ) : null}
          </Surface>
        </KeyboardAvoidingView>
      </View>
    </BodyPortal>
  );
}

const styles = StyleSheet.create({
  interactiveWeb:
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transitionProperty:
            'transform, background-color, border-color, box-shadow, opacity, outline-color',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as any)
      : ({} as any),
  backdrop:
    Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        } as any)
      : {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        },
  viewport:
    Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          paddingHorizontal: 14,
          paddingVertical: 16,
          justifyContent: 'center',
          alignItems: 'center',
        } as any)
      : {
          ...StyleSheet.absoluteFillObject,
          zIndex: 1000,
          paddingHorizontal: 14,
          paddingVertical: 16,
          justifyContent: 'center',
          alignItems: 'center',
        },
  surface: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
    flexShrink: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  headerAccessory: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bodyScroll: {
    width: '100%',
    minHeight: 0,
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  footerCompact: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  actionButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonCompact: {
    minHeight: 44,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionButtonLabelCompact: {
    fontSize: 13,
  },
});
