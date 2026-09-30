# courtvision frontend

React 19 + TypeScript SPA built with Vite. In production the FastAPI app
serves `dist/`; in development Vite proxies `/api` to `localhost:8000`.

```bash
npm ci
npm run dev        # http://localhost:5173 (start the API first)
npm test           # vitest
npm run lint       # eslint, zero warnings in CI
npm run build      # tsc -b && vite build → dist/
```

- Screens and behaviour: `docs/design-brief/` (what each screen does) and
  `docs/design-handoff/DESIGN.md` (how it looks). `docs/design-handoff/prototype/`
  renders every screen and state.
- Design tokens and shared component styles: `src/styles.css`. Colours exist
  only as tokens there; pages keep their layout CSS beside the page.
- Routes: `src/App.tsx`. Pages: `src/pages/`. Shared components:
  `src/components/`. Pure logic (formatting, filters, slugs, chart maths):
  `src/lib/`, each with tests.
- All requests go through `src/api/http.ts`, which sends the header the API's
  access gate requires.
- `src/lib/slug.ts` must agree with `api/directory.py`; both test against
  `tests/fixtures/slug_vectors.json`.
