import { useEffect } from 'react';

const SITE = 'courtvision';
export const DEFAULT_TITLE = 'courtvision — find the story in the numbers';

/**
 * The browser tab title, "<name> — courtvision". The server renders the same
 * titles for link previews (api/link_preview.py); this keeps them right as the
 * reader navigates inside the app.
 */
export function useDocumentTitle(name: string | null | undefined): void {
  useEffect(() => {
    document.title = name ? `${name} — ${SITE}` : DEFAULT_TITLE;
  }, [name]);
}
