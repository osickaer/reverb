/**
 * Legacy hook kept for backward compatibility.
 * Prefer using useThemeColors() from @/contexts/theme-context directly.
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { colorScheme } = useAppTheme();
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[colorScheme][colorName];
  }
}
