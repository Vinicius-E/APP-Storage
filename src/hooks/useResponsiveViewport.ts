import { useWindowDimensions } from 'react-native';

export const RESPONSIVE_MOBILE_BREAKPOINT = 768;
export const RESPONSIVE_DESKTOP_BREAKPOINT = 1200;

export function useResponsiveViewport() {
  const { width, height } = useWindowDimensions();
  const isMobileViewport = width < RESPONSIVE_MOBILE_BREAKPOINT;
  const isTabletViewport =
    width >= RESPONSIVE_MOBILE_BREAKPOINT && width < RESPONSIVE_DESKTOP_BREAKPOINT;
  const isDesktopViewport = width >= RESPONSIVE_DESKTOP_BREAKPOINT;

  return {
    width,
    height,
    isMobileViewport,
    isTabletViewport,
    isDesktopViewport,
  };
}
