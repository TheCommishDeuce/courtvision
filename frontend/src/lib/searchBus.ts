/**
 * Fill a search box from elsewhere on the page: Home's example chips fill the
 * hero search, Player's "Compare with…" pre-fills the header search with
 * "Jannik Sinner vs ". Each SearchBox listens on its `channel`; on phones the
 * header opens its full-screen sheet for the 'header' channel.
 */
export const SEARCH_EVENT = 'cv-search';

export interface SearchFill {
  channel: string;
  q: string;
}

export function fillSearch(channel: string, q: string): void {
  window.dispatchEvent(new CustomEvent<SearchFill>(SEARCH_EVENT, { detail: { channel, q } }));
}

export function onSearchFill(handler: (fill: SearchFill) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<SearchFill>).detail);
  window.addEventListener(SEARCH_EVENT, listener);
  return () => window.removeEventListener(SEARCH_EVENT, listener);
}
