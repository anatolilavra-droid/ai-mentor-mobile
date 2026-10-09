import { createContext, type ReactNode } from 'react';

import { theme, type Theme } from '@/constants/theme';

/**
 * Phase 1 ships a single dark theme. The context exists so a light theme
 * can be added later without touching components.
 */
export const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
