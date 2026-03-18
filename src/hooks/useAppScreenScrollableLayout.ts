import { useMemo } from 'react';
import { type ScrollViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppScreenScrollableLayout = {
  bottomSpacing: number;
  contentContainerStyle: ViewStyle;
  scrollViewProps: Pick<
    ScrollViewProps,
    | 'automaticallyAdjustContentInsets'
    | 'automaticallyAdjustsScrollIndicatorInsets'
    | 'contentInsetAdjustmentBehavior'
    | 'scrollIndicatorInsets'
  >;
};

export function useAppScreenScrollableLayout(
  extraBottomSpacing = 16
): AppScreenScrollableLayout {
  const insets = useSafeAreaInsets();
  const bottomSpacing = insets.bottom + extraBottomSpacing;

  const contentContainerStyle = useMemo<ViewStyle>(
    () => ({
      flexGrow: 1,
      paddingBottom: bottomSpacing,
    }),
    [bottomSpacing]
  );

  const scrollViewProps = useMemo<AppScreenScrollableLayout['scrollViewProps']>(
    () => ({
      automaticallyAdjustContentInsets: true,
      automaticallyAdjustsScrollIndicatorInsets: true,
      contentInsetAdjustmentBehavior: 'automatic',
      scrollIndicatorInsets: {
        bottom: bottomSpacing,
        left: 0,
        right: 0,
        top: 0,
      },
    }),
    [bottomSpacing]
  );

  return {
    bottomSpacing,
    contentContainerStyle,
    scrollViewProps,
  };
}
