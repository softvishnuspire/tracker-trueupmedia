/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useColorScheme } from 'react-native';

export function useTheme() {
  const { themePreference } = useAuthStore();
  const systemScheme = useColorScheme();
  
  const activeScheme = (themePreference === 'system' ? (systemScheme || 'light') : themePreference) === 'dark' ? 'dark' : 'light';

  return Colors[activeScheme];
}
