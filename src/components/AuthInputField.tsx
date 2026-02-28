import React, { useRef, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  View,
} from 'react-native';
import { useThemeContext } from '../theme/ThemeContext';

type AuthInputFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  errorText?: string;
  showPasswordToggle?: boolean;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
};

export default function AuthInputField({
  label,
  icon,
  errorText,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onTogglePasswordVisibility,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...rest
}: AuthInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLeadingHovered, setIsLeadingHovered] = useState(false);
  const [isTrailingHovered, setIsTrailingHovered] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & { text?: string; textSecondary?: string };
  const textColor = colors.text ?? theme.colors.onSurface;
  const secondaryText = colors.textSecondary ?? theme.colors.onSurfaceVariant;
  const webInputStyle =
    Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
          outlineStyle: 'none',
          outlineColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          WebkitTextFillColor: textColor,
          boxShadow: 'none',
          caretColor: theme.colors.primary,
          appearance: 'none',
          WebkitAppearance: 'none',
        } as any)
      : null;
  const webInteractiveIconStyle =
    Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transitionDuration: '140ms',
          transitionProperty: 'transform, opacity',
          transitionTimingFunction: 'ease-out',
        } as any)
      : null;

  const handleFocus = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.primary }]}>{label}</Text>

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
            borderWidth: isFocused ? 2 : 1.5,
            shadowColor: theme.colors.primary,
            shadowOpacity: isFocused ? 0.1 : 0,
          },
        ]}
      >
        <Pressable
          onPress={() => inputRef.current?.focus()}
          onHoverIn={Platform.OS === 'web' ? () => setIsLeadingHovered(true) : undefined}
          onHoverOut={Platform.OS === 'web' ? () => setIsLeadingHovered(false) : undefined}
          style={({ pressed }) => [
            styles.leadingIcon,
            webInteractiveIconStyle,
            {
              backgroundColor: 'transparent',
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={theme.colors.primary}
            style={{
              opacity: isLeadingHovered ? 0.9 : 1,
              transform: [{ scale: isLeadingHovered ? 1.08 : 1 }],
            }}
          />
        </Pressable>

        <TextInput
          {...rest}
          ref={inputRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={placeholderTextColor ?? secondaryText}
          cursorColor={theme.colors.primary}
          selectionColor={theme.colors.primary}
          style={[
            styles.input,
            { color: textColor },
            webInputStyle,
          ]}
        />

        {showPasswordToggle ? (
          <Pressable
            onPress={onTogglePasswordVisibility}
            hitSlop={8}
            onHoverIn={Platform.OS === 'web' ? () => setIsTrailingHovered(true) : undefined}
            onHoverOut={Platform.OS === 'web' ? () => setIsTrailingHovered(false) : undefined}
            style={({ pressed }) => [
              styles.trailingButton,
              webInteractiveIconStyle,
              {
                backgroundColor: 'transparent',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.primary}
              style={{
                opacity: isTrailingHovered ? 0.9 : 1,
                transform: [{ scale: isTrailingHovered ? 1.08 : 1 }],
              }}
            />
          </Pressable>
        ) : (
          <View style={styles.trailingSpacer} />
        )}
      </View>

      {errorText ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  field: {
    minHeight: 58,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  leadingIcon: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 56,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  trailingButton: {
    width: 50,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingSpacer: {
    width: 16,
    minHeight: 56,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
