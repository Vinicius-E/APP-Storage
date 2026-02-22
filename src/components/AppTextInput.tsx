import React from 'react';
import { Platform } from 'react-native';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';
import { useThemeContext } from '../theme/ThemeContext';

type IconProps = {
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function withAdornmentSpacing(adornment: React.ReactNode, fallbackColor: string): React.ReactNode {
  if (!React.isValidElement<IconProps>(adornment)) {
    return adornment;
  }

  return React.cloneElement(adornment, {
    color: adornment.props.color ?? fallbackColor,
    style: [styles.iconAdornment, adornment.props.style],
  });
}

export default function AppTextInput({
  mode = 'outlined',
  style,
  outlineStyle,
  contentStyle,
  left,
  right,
  ...rest
}: TextInputProps) {
  const { theme } = useThemeContext();
  const colors = theme.colors as typeof theme.colors & { text?: string; textSecondary?: string };
  const textColor = colors.text ?? theme.colors.onSurface;
  const secondaryText = colors.textSecondary ?? theme.colors.onSurfaceVariant;
  const accent = theme.colors.primary;
  const assistiveTextColor = Platform.OS === 'web' ? accent : secondaryText;
  const background = theme.colors.surfaceVariant;
  const webContentStyle =
    Platform.OS === 'web'
      ? ({
          boxShadow: 'none',
          backgroundColor: 'transparent',
        } as any)
      : null;

  return (
    <TextInput
      {...rest}
      mode={mode}
      theme={{
        ...theme,
        colors: {
          ...theme.colors,
          onSurfaceVariant: assistiveTextColor,
        },
      }}
      textColor={textColor}
      cursorColor={theme.colors.primary}
      selectionColor={theme.colors.primary}
      placeholderTextColor={assistiveTextColor}
      activeOutlineColor={theme.colors.primary}
      outlineColor={accent}
      style={[styles.input, { backgroundColor: background }, style]}
      outlineStyle={[
        styles.outline,
        {
          borderColor: accent,
        },
        outlineStyle,
      ]}
      contentStyle={[styles.content, webContentStyle, contentStyle]}
      left={withAdornmentSpacing(left, accent)}
      right={withAdornmentSpacing(right, accent)}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    borderRadius: 12,
  },
  outline: {
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  iconAdornment: {
    marginHorizontal: 4,
    alignSelf: 'center',
  },
});
