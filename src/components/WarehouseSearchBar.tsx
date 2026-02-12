// src/components/WarehouseSearchBar.tsx
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useThemeContext } from '../theme/ThemeContext';
import { useWarehouseSearch } from '../search/WarehouseSearchContext';

const IS_WEB = Platform.OS === 'web';

export default function WarehouseSearchBar() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { searchOpen, searchText, setSearchText } = useWarehouseSearch();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hoverClear, setHoverClear] = useState(false);

  const borderColor = useMemo(() => {
    if (focused || hovered) {
      return colors.primary;
    }
    return colors.outline;
  }, [colors.outline, colors.primary, focused, hovered]);

  const shadowStyle = useMemo(() => {
    if (!IS_WEB) {
      return focused || hovered
        ? {
            shadowColor: colors.primary,
            shadowOpacity: 0.18,
            shadowRadius: 10,
            elevation: 6,
          }
        : {
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          };
    }

    return (
      focused || hovered
        ? { boxShadow: `0 10px 22px rgba(0,0,0,0.12)` }
        : { boxShadow: `0 6px 14px rgba(0,0,0,0.10)` }
    ) as any;
  }, [colors.primary, focused, hovered]);

  if (!searchOpen) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor },
        shadowStyle,
        focused || hovered ? styles.containerActive : null,
      ]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={(e) => (e as any).stopPropagation?.()}
    >
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={styles.inner}
      >
        <AntDesign name="questioncircleo" size={16} color={colors.primary} />

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar (min. 3): nome, código, cor, descrição"
          placeholderTextColor="#888"
          style={[styles.input, { color: colors.text }]}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {searchText.trim().length > 0 ? (
          <Pressable
            onPress={() => setSearchText('')}
            onHoverIn={() => setHoverClear(true)}
            onHoverOut={() => setHoverClear(false)}
            style={[
              styles.iconButton,
              hoverClear ? { backgroundColor: colors.surfaceVariant } : null,
            ]}
            hitSlop={8}
          >
            <AntDesign
              name="closecircleo"
              size={18}
              color={hoverClear ? colors.primary : colors.text}
            />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    minWidth: 360,
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerActive: IS_WEB
    ? ({
        transform: [{ scale: 1.01 }],
        transitionProperty: 'transform, box-shadow, border-color',
        transitionDuration: '120ms',
        transitionTimingFunction: 'ease-out',
      } as any)
    : ({} as any),
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '700',
    outlineStyle: 'none' as any,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
