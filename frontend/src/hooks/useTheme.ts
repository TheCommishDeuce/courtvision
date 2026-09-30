import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export const THEMES: readonly Theme[] = ['light', 'dark', 'system'];
export const THEME_LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'Auto' };

const KEY = 'cv-theme';
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'system';

function readStored(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/**
 * Light / dark / system. Persists in localStorage['cv-theme']; a `?theme=`
 * URL param overrides it for this page view without being saved (used by
 * screenshots and design review links).
 */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    return isTheme(fromUrl) ? fromUrl : readStored();
  });

  useEffect(() => apply(theme), [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode: the choice lasts for this page view */
    }
  }, []);

  return [theme, setTheme];
}
