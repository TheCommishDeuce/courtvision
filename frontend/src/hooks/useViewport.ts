import { useSyncExternalStore } from 'react';

/** Breakpoints from DESIGN.md: < 760 phone layout, < 1000 match rows as cards. */
export const PHONE_MAX = 759;
export const CARD_ROWS_MAX = 999;

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** Viewport width, re-rendering on resize. 1280 when there is no window. */
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, () => window.innerWidth, () => 1280);
}

export const useIsPhone = (): boolean => useViewportWidth() <= PHONE_MAX;
