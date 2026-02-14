import React from 'react';
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
  const background = theme.colors.surfaceVariant;

  return (
    <TextInput
      {...rest}
      mode={mode}
      textColor={textColor}
      cursorColor={theme.colors.primary}
      selectionColor={theme.colors.primary}
      placeholderTextColor={secondaryText}
      activeOutlineColor={theme.colors.primary}
      outlineColor={theme.colors.outline}
      style={[styles.input, { backgroundColor: background }, style]}
      outlineStyle={[
        styles.outline,
        {
          borderColor: theme.colors.outline,
        },
        outlineStyle,
      ]}
      contentStyle={[styles.content, contentStyle]}
      left={withAdornmentSpacing(left, secondaryText)}
      right={withAdornmentSpacing(right, secondaryText)}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
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
