import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

type PaperIconProps = {
  name?: string;
  color?: string;
  size?: number;
  direction?: 'ltr' | 'rtl';
  testID?: string;
};

const warnedMissingIcons = new Set<string>();

// Compatibility aliases for legacy icon names used across the app.
const antGlyphMapCompat = (AntDesign as any).glyphMap as Record<string, number> | undefined;
if (antGlyphMapCompat) {
  if (!antGlyphMapCompat.search1 && antGlyphMapCompat.search) {
    antGlyphMapCompat.search1 = antGlyphMapCompat.search;
  }
}

export function PaperIcon(props: PaperIconProps) {
  const { name = 'help-circle-outline', color = '#5B4633', size = 20, testID } = props;

  const materialMap = (MaterialCommunityIcons as any).glyphMap as Record<string, number> | undefined;
  const antMap = (AntDesign as any).glyphMap as Record<string, number> | undefined;
  const materialIconsMap = (MaterialIcons as any).glyphMap as Record<string, number> | undefined;
  const ionMap = (Ionicons as any).glyphMap as Record<string, number> | undefined;
  const featherMap = (Feather as any).glyphMap as Record<string, number> | undefined;

  const hasGlyph = (map: Record<string, number> | undefined, icon: string) =>
    !!map && Object.prototype.hasOwnProperty.call(map, icon);

  const aliases: Record<string, string[]> = {
    search: ['magnify', 'search1'],
    search1: ['search', 'magnify'],
    filter: ['filter-variant', 'funnel', 'filter'],
    'filter-outline': ['filter-variant', 'funnel'],
    close: ['close', 'closecircleo', 'x'],
    menu: ['menu', 'bars'],
    'arrow-left': ['arrow-left', 'left', 'chevron-left'],
    'arrow-right': ['arrow-right', 'right', 'chevron-right'],
  };

  const normalized = String(name ?? '').trim();
  const normalizedLower = normalized.toLowerCase();
  const normalizedDash = normalizedLower.replace(/_/g, '-');
  const noPrefix = normalizedDash.replace(/^mdi[-:]/, '');

  // Force a clear magnifier for all search variants.
  if (normalizedLower === 'search' || normalizedLower === 'search1' || noPrefix === 'search') {
    return (
      <MaterialCommunityIcons name="magnify" size={size} color={color} testID={testID} />
    );
  }

  const candidates = Array.from(
    new Set([
      normalized,
      normalizedLower,
      normalizedDash,
      noPrefix,
      ...(aliases[normalized] ?? []),
      ...(aliases[normalizedLower] ?? []),
      ...(aliases[normalizedDash] ?? []),
      ...(aliases[noPrefix] ?? []),
    ])
  ).filter((x) => x !== '');

  for (const iconName of candidates) {
    if (hasGlyph(materialMap, iconName)) {
      return (
        <MaterialCommunityIcons
          name={iconName as any}
          size={size}
          color={color}
          testID={testID}
        />
      );
    }
    if (hasGlyph(antMap, iconName)) {
      return <AntDesign name={iconName as any} size={size} color={color} testID={testID} />;
    }
    if (hasGlyph(materialIconsMap, iconName)) {
      return <MaterialIcons name={iconName as any} size={size} color={color} testID={testID} />;
    }
    if (hasGlyph(ionMap, iconName)) {
      return <Ionicons name={iconName as any} size={size} color={color} testID={testID} />;
    }
    if (hasGlyph(featherMap, iconName)) {
      return <Feather name={iconName as any} size={size} color={color} testID={testID} />;
    }
  }

  if (__DEV__ && !warnedMissingIcons.has(normalized)) {
    warnedMissingIcons.add(normalized);
    // Helps identify unresolved icon names coming from Paper/Navigation.
    console.warn(`[PaperIcon] Unknown icon name: "${normalized}"`);
  }

  return (
    <MaterialCommunityIcons
      name={'help-circle-outline' as any}
      size={size}
      color={color}
      testID={testID}
    />
  );
}

export default PaperIcon;
