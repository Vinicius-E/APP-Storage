import React, { useMemo, useRef, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../../theme/ThemeContext';
import { AreaDTO } from '../../types/Area';

type DropdownLayout = {
  top: number;
  left: number;
  width: number;
};

type AreaDropdownSelectorProps = {
  areas: AreaDTO[];
  selectedAreaId: number | null;
  loading?: boolean;
  onSelect: (areaId: number) => void;
};

const IS_WEB = Platform.OS === 'web';

export default function AreaDropdownSelector({
  areas,
  selectedAreaId,
  loading = false,
  onSelect,
}: AreaDropdownSelectorProps) {
  const { theme } = useThemeContext();
  const triggerRef = useRef<View | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout>({
    top: 84,
    left: 16,
    width: 260,
  });
  const activeAreas = useMemo(
    () => areas.filter((area) => area.active !== false),
    [areas]
  );

  const selectedArea = useMemo(
    () => activeAreas.find((area) => area.id === selectedAreaId) ?? activeAreas[0] ?? null,
    [activeAreas, selectedAreaId]
  );

  const openDropdown = () => {
    if (loading || activeAreas.length === 0) {
      return;
    }

    const fallbackWidth = Math.min(Math.max(240, dropdownLayout.width), Math.max(windowWidth - 32, 220));

    triggerRef.current?.measureInWindow?.((x, y, width, height) => {
      const nextWidth = Math.min(Math.max(width, 240), Math.max(windowWidth - 32, 220));
      const nextLeft = Math.max(16, Math.min(x, windowWidth - nextWidth - 16));

      setDropdownLayout({
        top: y + height + 6,
        left: nextLeft,
        width: nextWidth,
      });
      setOpen(true);
    });

    setDropdownLayout((prev) => ({
      ...prev,
      width: fallbackWidth,
    }));
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
  };

  const handleSelect = (areaId: number) => {
    closeDropdown();
    onSelect(areaId);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>ÁREA</Text>

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Selecionar área"
          disabled={loading || activeAreas.length === 0}
          onPress={() => {
            if (open) {
              closeDropdown();
            } else {
              openDropdown();
            }
          }}
          style={({ pressed }) => [
            styles.trigger,
            {
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.surface,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="warehouse" size={16} color={theme.colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.triggerText, { color: theme.colors.primary }]}
          >
            {loading ? 'Carregando áreas...' : selectedArea?.name ?? 'Selecionar área'}
          </Text>
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.colors.primary}
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <Pressable style={styles.backdrop} onPress={closeDropdown}>
          <View />
        </Pressable>

        <View
          style={[
            styles.dropdown,
            {
              top: dropdownLayout.top,
              left: dropdownLayout.left,
              width: dropdownLayout.width,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.dropdownContent}
          >
            {activeAreas.map((area) => {
              const selected = area.id === selectedAreaId;

              return (
                <Pressable
                  key={area.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => handleSelect(area.id)}
                  style={({ pressed }) => [
                    styles.option,
                    IS_WEB ? styles.optionInteractive : null,
                    {
                      backgroundColor: selected
                        ? theme.colors.surfaceVariant
                        : pressed
                          ? theme.colors.surfaceVariant
                          : 'transparent',
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.optionTitle,
                      { color: selected ? theme.colors.primary : theme.colors.text },
                    ]}
                  >
                    {area.name}
                  </Text>

                  {selected ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={theme.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    position: 'relative',
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trigger: {
    minHeight: 38,
    maxWidth: 360,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triggerText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    maxHeight: 320,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownContent: {
    paddingVertical: 6,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
  },
  optionInteractive:
    IS_WEB
      ? ({
          transitionProperty: 'background-color, opacity',
          transitionDuration: '140ms',
          transitionTimingFunction: 'ease-out',
          cursor: 'pointer',
        } as any)
      : ({} as any),
});
