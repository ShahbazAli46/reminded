import { useColorScheme } from 'react-native';
import { lightColors, darkColors, typography, spacing, radius, shadows, fontFamily } from './tokens';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    typography,
    spacing,
    radius,
    shadows,
    fontFamily,
  };
}
