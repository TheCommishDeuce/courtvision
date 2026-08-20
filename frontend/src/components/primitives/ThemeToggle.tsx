import { useCallback, useState } from 'react';

type Theme = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'cv-theme';

/** Auto is the absence of a choice, so it is stored by removing the key. */
function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode — the choice just does not persist */
  }
}

const NEXT: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Theme, string> = { auto: 'Auto', light: 'Day', dark: 'Night' };

/**
 * Three states rather than two, because "follow the system" is a real
 * preference and a two-way switch silently discards it. The button shows the
 * state it is *in*; its accessible name says what pressing it will do.
 */
export default function ThemeToggle() {
  // Read straight from storage on first render rather than syncing in an
  // effect: this is a client-only SPA, so there is no server pass to diverge
  // from, and the inline script in index.html has already applied the same
  // value to <html> before React mounted.
  const [theme, setTheme] = useState<Theme>(readStored);

  const cycle = useCallback(() => {
    setTheme(prev => {
      const next = NEXT[prev];
      apply(next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Colour theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
      title={`Theme: ${LABEL[theme]} — click for ${LABEL[NEXT[theme]]}`}
      className="ba-chip"
    >
      <span aria-hidden="true" className="text-clay">
        {theme === 'dark' ? '◓' : theme === 'light' ? '◒' : '◑'}
      </span>
      {LABEL[theme]}
    </button>
  );
}
