import { useContext } from 'react';

import type { Theme } from '@/constants/theme';
import { ThemeContext } from '@/lib/theme/ThemeProvider';

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
