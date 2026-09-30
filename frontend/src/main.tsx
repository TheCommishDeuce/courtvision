// Two apps share this entry while the v1 rebuild is in progress
// (docs/design-handoff/BUILD.md). `npm run dev` / `npm run build` ship the
// current site; `npm run dev:next` / `build:next` the rebuild. Phase 8 makes
// the rebuild the only app and deletes this switch.
if (import.meta.env.VITE_APP === 'next') {
  void import('./next/main');
} else {
  void import('./legacyMain');
}
