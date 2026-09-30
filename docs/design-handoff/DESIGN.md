# Handoff: courtvision — v1 frontend (all six screens + shell)

## Overview
courtvision is a tennis statistics site ("find the story in the numbers") for journalists, fans and power users, over 1,069,410 ATP & WTA matches (1910–2026, data through 10 Aug 2026). This package contains the v1 design for the global shell and six screens: **Home, Player, Matchup, Tournament, Records, Lab**, plus an **About the data** page. The product brief (what each screen does, the data dictionary, constraints, engineering gaps) is in `../design-brief/` (symlinked into `prototype/uploads/design-brief/` so the prototypes can fetch the samples) — read `README.md` there first; it is the source of truth for behaviour and data meaning. This README documents the **visual and interaction design** layered on top of it.

## About the design files
The files in `prototype/` are **design references built in HTML** — working prototypes showing intended look and behaviour, not production code. Recreate them in the target codebase's environment (framework, router, component library, data layer) using its established patterns. If no environment exists yet, a React + TypeScript SPA (or Next.js/Remix for SSR-friendly shareable URLs) with CSS variables for theming is a good fit.

The `.dc.html` files are self-contained "Design Components": markup with inline styles, plus a small logic class. Open any of them in a browser served from `prototype/` (they fetch the sample JSON from `uploads/design-brief/samples/`, so use a local static server, e.g. `npx serve prototype`). `Board.dc.html` shows every screen at 1280 px and 390 px, light and dark, plus all states, as live iframes.

Prototype-only shortcuts to **not** replicate: every player link opens Sinner's data; only sample pairs/years/boards/example queries return data; figures don't fully recompute under filters. Replace all of these with real API calls (endpoints are named in each sample JSON's `request` field).

## Fidelity
**High fidelity.** Colours, typography, spacing, states and interactions are final for v1. Recreate the layouts closely; exact pixel values are listed below and are readable in the inline styles.

---

## Design tokens

### Colour (CSS custom properties on `:root`)
Light and dark are both first-class; theme is `light | dark | system`. Implementation in the prototype: variables on `:root`, dark set on `:root[data-theme=dark]` and inside `@media (prefers-color-scheme: dark) { :root:not([data-theme=light]) {…} }`. Authoritative values are oklch; hex is the sRGB approximation.

| Token | Light | Dark |
|---|---|---|
| `--bg` | oklch(0.985 0.004 85) · #fbfaf7 | oklch(0.175 0.008 60) · #13100d |
| `--bg2` (hover, subtle fills, table headers) | oklch(0.955 0.006 85) · #f2f0ec | oklch(0.21 0.009 60) · #1b1714 |
| `--card` | oklch(0.997 0.002 85) · #fffefd | oklch(0.205 0.009 60) · #1a1613 |
| `--ink` (text, strong rules) | oklch(0.21 0.012 60) · #1d1713 | oklch(0.94 0.008 80) · #eeebe5 |
| `--ink2` (secondary text) | oklch(0.45 0.012 60) · #5a544f | oklch(0.74 0.01 80) · #aeaaa4 |
| `--line` (borders) | oklch(0.86 0.008 80) · #d4d0cb | oklch(0.34 0.01 70) · #3b3732 |
| `--line2` (row dividers) | oklch(0.92 0.006 80) · #e7e4e0 | oklch(0.27 0.01 70) · #2a2621 |
| `--acc` (links, wins, chart marks, player B) | oklch(0.47 0.16 275) · #444cb2 | oklch(0.76 0.12 275) · #9babfd |
| `--onacc` (text on accent) | oklch(0.99 0 0) · #fcfcfc | oklch(0.18 0.01 60) · #15110d |
| `--loss` (losses, upset tag, errors) | oklch(0.5 0.17 28) · #af2b25 | oklch(0.74 0.14 28) · #f68678 |
| `--hard` | oklch(0.5 0.13 245) · #0068a7 | oklch(0.74 0.11 245) · #6cb2ec |
| `--clay` | oklch(0.54 0.15 42) · #b34917 | oklch(0.74 0.13 45) · #ee8f63 |
| `--grass` | oklch(0.5 0.13 145) · #27762f | oklch(0.76 0.13 145) · #79c77c |
| `--carpet` | oklch(0.5 0.05 330) · #745971 | oklch(0.74 0.05 330) · #bea0ba |
| `--skel` (skeleton fill) | oklch(0.93 0.006 80) · #eae7e3 | oklch(0.26 0.01 70) · #27231f |

Shadow `--shadow`: light `0 12px 32px oklch(0.2 0.02 60 / .12)`, dark `0 12px 32px oklch(0 0 0 / .5)` — used only on the search dropdown.

Heat cells (surface × level grid): `background: color-mix(in oklch, var(--acc) X%, transparent)` where `X = clamp(4, (winPct − 40) × 0.8, 42)`.

### Typography
- **Schibsted Grotesk** (Google Fonts, wght 400–800) for everything: UI, body, headings, figures. **No italics anywhere.** No narrow/condensed faces.
- **IBM Plex Mono** 400/500 for scores, round codes, SQL, schema names, and the freshness line.
- Do **not** set `font-variant-numeric: tabular-nums` globally — in Schibsted Grotesk it also widens punctuation ("77 .6%"). Apply it only to tabular data: match rows, Records full table, Lab results table.
- Wordmark: `courtvision` — **always lowercase**, Schibsted Grotesk 800, 24px, letter-spacing −0.035em, `--ink`. Also lowercase in `<title>` and citation text.

| Role | Size / weight / tracking |
|---|---|
| Home hero H1 | clamp(38px, 6.4vw, 68px) / 700 / −0.025em, line-height 1, max-width 13ch, `text-wrap: balance` |
| Page H1 (Player name, Tournament, Records, Lab) | clamp(34–40px … 52–72px) / 700 / −0.025 to −0.03em |
| Section H2 | 26–30px / 700 |
| Block question line (under H2) | 16px / 400 / `--ink2` |
| Card headline (Home "Leading") | 22px / 700, line-height 1.15 |
| Big figure | 26–42px / 600–700 / −0.01 to −0.02em |
| Body | 15–16px / 400, line-height 1.45 |
| Secondary / meta | 13–14px / `--ink2` |
| Eyebrow / group labels | 11–13px / 600–700 / uppercase / letter-spacing .06–.08em |
| Tour tag | 10px / 600 / .06em, 1px `--line` border, radius 3px, padding 1px 5px |

### Spacing, radius, layout
- Content max-width **1200px** (Lab 1320px), centred; side padding `clamp(16px, 4vw, 40px)`.
- Section rhythm: 36–44px vertical padding, separated by 1px `--line` top rules. Filtered regions start with a 1px `--ink` rule (the sticky filter bar's top border).
- Radius: 4px cards/panels, 6px controls/inputs, 2–3px chips and bars, 999px example chips on Home.
- Touch targets ≥ 44px on phone; desktop controls 40–42px.
- Breakpoints: **< 760px** phone layout (header collapses, filters behind a button, cards). **< 1000px** match rows switch to the card layout. **≥ 1100px** Lab schema column widens from 280px to 340px.
- Surfaces always carry a glyph **and** a label: Hard ■, Clay ●, Grass ▲, Carpet ◆ (glyph 10–11px in the surface colour).
- Win/loss chips: 24×24 (22 on phone), radius 3px, 12px/700. W = `--acc` fill + `--onacc` text; L = transparent + 1px `--loss` border + `--loss` text.

---

## Shell

### Header (`SiteHeader`)
- 64px tall, `--bg`, bottom border 1px `--line`. Row: wordmark · search (flex 1, max 440px, 40px tall, 15px text, `min-width:0` so it takes the shrink) · nav (Records · Tournaments · Lab; 15px, 10px 12px padding; current page 600 weight + 2px underline offset 6px; `flex:none`) · theme segmented control (Light / Dark / Auto; 13px; selected = `--ink` fill, `--bg` text; `flex:none`).
- Phone (< 760): wordmark · search icon button (44×44) · theme button cycling Light→Dark→Auto showing its current label. Nav moves to a second row of three equal-width links (44px tall) separated by a `--line2` rule. The search icon opens a **full-screen sheet** (`--bg`, 48px search + "Cancel" in `--acc`).
- Theme persists in `localStorage['cv-theme']`; a `?theme=` URL param overrides without persisting.

### Global search (`SearchBox`)
- Input: `--card`, 1px `--line`, radius 6px, magnifier icon 16px `--ink2`, `/` kbd hint on the right when empty (only on the instance that owns the `/` shortcut).
- Dropdown: absolute, 6px below, `--card`, 1px `--line`, radius 6px, `--shadow`, max-height min(70vh, 520px). Groups with 11px uppercase headers: **Matchup** / **Tournament** (year match) / **ATP players** / **WTA players** / **Tournaments**. Item min-height 44px, padding 10px 14px: name (500, or 600 for matchup/tournament-year) + tour tag + sub-line (`country · 2018–2026 · career high #1`). Active item bg `--bg2`. Footer hint row: "↑ ↓ move · Enter open · Esc close".
- Logic: see brief `02-shell.md`. Rank results by career-high rank, then match count (never alphabetically). Two fragments (with or without `vs`/`v`) → the matchup first if both resolve to players on the same tour. `name + year` → tournament-year first. Empty and focused → recent searches (`localStorage['cv-recent']`, max 5). No match → "No player or tournament matches "…" — try asking the Lab" (link).
- Variants used: `players-only` + `tour` + `exclude` (Matchup pair picker, returns via `onPick` instead of navigating), `events-only` (Tournament browse).
- Channels: pages trigger the header search programmatically (e.g. Player's **Compare with…** opens it pre-filled "Jannik Sinner vs "; Home chips fill the hero search).

### Footer (`SiteFooter`)
Top border 1px `--line`, 72px top margin. Left: "Data through 10 Aug 2026" (15px/600) and the mono line `1,069,410 matches · 1910–2026 · ATP & WTA` (13px, `--ink2`). Right: "Match data from Tennis Abstract / Jeff Sackmann" (underlined ink link) · "About the data".

### Shared patterns
- **Filter bar (`FilterBar`)**: sticky at top:0, `--bg`, 1px `--ink` top and 1px `--line` bottom borders, 12px vertical padding, full bleed. Controls: optional Tour segmented (ATP/WTA) · Surface segmented (All/Hard/Clay/Grass/Carpet with glyphs; selected = ink fill, and the glyph turns `--bg`) · Level select · From–To year selects · "Reset filters" text button (only when something is active). On the right (desktop): the active-filter summary in words ("Clay · Grand Slams · 2023–2026") plus a detail line (record or count). Phone: a single "Filters (n)" button + the summary; tapping expands the controls inline. The Player page currently has an inline copy of this bar; consolidate it onto the shared component.
- **Match row (`MatchRow`)**: desktop grid `30px 100px minmax(0,1.1fr) 36px 70px minmax(0,1.6fr) minmax(0,1.6fr) minmax(0,1.3fr) 40px 32px` (gap 12px; columns result · date · event · round · surface · winner · loser · score · time · expand). Winner 650 weight; ranks in `--ink2` `(56)` kept `nowrap`; names wrap (never ellipsis). Optional red outlined **UPSET** tag after the winner. Score mono 13px, printed exactly as stored (don't append RET if the score already has it). The whole row toggles; the ▼ button is the keyboard target. Card layout (< 1000px): meta line (chip · date · event · round … surface), winner line with "WON", loser line, then score + time + expand button. Expanded **stats panel**: max 560px centred, three columns (label · winner · loser): Aces, Double faults, 1st serve in (`63.6% · 35/55`), 1st serve won, 2nd serve won, Break points saved (`3/5`). No stats → "No point statistics for this match." on a `--bg2` box.
- **Record**: `64.4% · 67–37`; fewer than 10 matches → figure in `--ink2` + dotted-underline "low sample" with a tooltip giving the count.
- **States**: skeletons in the block's final shape (`--skel`, `cvpulse` 1.4s opacity 1→.45); block error = inline `--bg2` panel with message + outlined **Retry**; empty = centred H2 explaining why + primary action (Reset / Clear filters).

---

## Screens

### Home `/` (`Home.dc.html`)
1. **Hero**: H1 "Find the story in a century of tennis results"; hero search (max 720px, 60px tall, 19px, placeholder "A player, a tournament, or two names", owns `/`); "Try" + 4 pill chips (40px, 1px `--line`, radius 999) *Sinner vs Alcaraz · Iga Swiatek · Wimbledon 2025 · Roland Garros* that fill the search; mono freshness line.
2. **Leading this season**: 4 cards in `repeat(auto-fit, minmax(250px,1fr))`, gap 14px. Card: `--card`, 1px `--line`, radius 4, padding 20, min-height 218. Tour tag + uppercase label · headline (22/700) · value (42/600) · detail · "See the leaderboard →". The whole card links to the Records board.
3. **Try asking**: 2-column list (min 420px) of the 6 Lab questions (18/500) with a teaser line (`--ink2`), → arrow; "Write your own →".
4. **Latest champions**: ATP | WTA columns (min 440px each, stacked on phone); column header 12/700 over a 1px `--ink` rule. Row: tournament (15/600 link) · level · surface · date (right) / champion (650) d. runner-up · score (mono, right).
5. **Recent upsets**: same columns, sorted by gap desc. Row: gap `+695` (22/600, 60px column) · "Winner (999) d. Loser (304)" · tournament · round · score · date.
6. Freshness is in the hero line and the footer.

### Player `/player/:slug` (`Player.dc.html`)
- **Identity**: tour tag + country; name H1; facts line (age + born, plays, height); a 4-column figure row above a `--line2` rule: Career record (`77.6%` / `425–123 · 548 matches`), Current rank, Career high (+ first reached), Titles `4 · 26 · 3 · 2` (Slams · tour · Challenger · ITF). Actions: **Compare with…** (ink fill), **Copy link**, **Copy citation** (label changes to "Link copied" / "Citation copied" for 1.8s).
- **Sticky filter bar** (surface, level, years limited to the career span). The summary and the filtered record sit on its right.
- **Form**: three windows (Last 10 / Last 20 / Last 52 weeks) over 2px `--ink` top rules; last-20 W/L strip (20 equal cells, 26px tall, oldest → latest, a tooltip per match); two lists "Recent wins over top-50 players" and "Recent losses to lower-ranked players".
- **Career shape**:
  - *Win % by year*: left axis 0/50/100%; 160px bar area; dashed 50% line drawn over the bars; the % label sits directly on top of each bar; the year (600) and the W–L record (e.g. `73–6`) sit underneath. Years outside the filter drop to 0.3 opacity.
  - *Ranking trajectory*: SVG line (2px `--acc`, non-scaling stroke), rank 1 at top. Toggle **All ranks** (log scale, gridlines 1/10/100/1,000) / **Top 100** (linear 1–100; weeks outside the top 100 aren't drawn); current-rank dot; caption with the key dates; a "Show as a table" disclosure with per-year best and last rank.
  - *Record by surface and level*: table with levels as rows (Grand Slam, Tour Finals, Masters 1000, ATP 250/500, Davis Cup, Challenger, ITF, then All levels) and columns Hard · Clay · Grass · All. Cells are 48px tall heat tints showing win % (600) and W–L (11px); empty cells stay blank; cells outside the active filters go to 0.3 opacity.
- **Record against ranked opponents**: vs top 5/10/20/50/100: % (30/600), a 6px bar, W–L.
- **Splits**: column header row (Career · Last 5 years · Last 52 weeks); groups Opponent / Situation / Stage. Each row is a label plus three cells (% 16/600 + W–L) plus an expand button; rows wrap so the label sits on its own line on phone. Expanding shows match rows plus a note and "Open in Lab →" (pre-filled SQL). The note under the table defines low sample and walkover/retirement handling.
- **Serve and return**: the note "499 of 548 matches have point statistics · figures: <filters> · percentiles: career vs 2,525 ATP players, not filtered". Two tables (Serve / Return) with columns figure · value · percentile bar (8px track, `--ink` fill, median tick) · ordinal ("96th"). Double-fault % has no percentile. No-stats state: an explanatory panel.
- **Milestones** (labelled "Career · not filtered"): 6 items over 2px `--ink` rules.
- **Recent matches**: header row + match rows, 10 shown then "Show all 20", "All matches in the Lab →".
- **States**: loading (every block skeleton), Splits error + Retry, filters with zero matches (one empty panel replaces all filtered blocks; e.g. Carpet → "Sinner has never played a match on carpet."), not found ("No player called 'jannik-sinnr'" + suggestions + search), no point stats.

### Matchup `/versus/:a/:b` (`Versus.dc.html`)
- **Pair picker**: two 48px slots (player name 17–22/700 + "Change") around a 44×48 ⇄ swap button. "Change" turns a slot into a players-only search limited to the same tour, excluding the other player.
- No pair → "Popular rivalries" cards (6).
- Sticky filter bar (applies to the head-to-head blocks only).
- **Headline**: the score is huge (clamp(56px, 11vw, 120px) / 800). The leader's number is in full colour (A `--ink`, B `--acc`) and the trailer's in `--ink2`, with a "LEADS" tag under the leader's name. Then the filter summary and three facts: first meeting, last meeting, current run ("Sinner has won the last 2").
- **Where they've met**: Surface and Level tables. Each row: label, A wins, a proportional two-part bar (A ink | B acc), B wins; the winner of the row in bold. Combinations where they've never met are omitted.
- **Momentum**: one column per meeting in date order. A win = a filled ink cell above the line; a B win = a filled acc cell below. The round code sits inside the cell (hidden on phone) and the year underneath. Each cell links to its match row.
- **Every meeting**: match rows, newest first; W/L from A's side.
- **The two careers** (always the whole career): 3-column table A value · label · B value, with ● and bold marking the better figure; unknown values show "—".
- **States**: never met under the filters ("Sinner and Nadal never met on grass." + Clear filters; the careers block stays), never met at all, loading.

### Tournament `/tournament/:slug/:year` (`Tournament.dc.html`, event param `event=`)
- **Browse** (no event): H1 "Tournaments", an events-only search (54px), an ATP/WTA toggle, and the latest champions list.
- **Event**: "← All tournaments"; tour toggle; year switcher (‹ · jump-to-year select · ›, where › is disabled on the latest year). Meta line (tour tag · level · surface · start date · match count), H1 "Wimbledon 2025", then the **FINAL** band (2px ink top rule): "Jannik Sinner (1) d. Carlos Alcaraz (2)" at clamp(24px, 3.6vw, 38px) / 800, score mono, duration.
- **The draw**: a qualifying toggle (off by default); "Sinner's path" strip on `--bg2` (clickable per round); round tabs (mono chips, selected = ink fill; horizontal scroll on phone); round title + count; match rows with the champion's matches marked ◆ and an UPSET tag.
- **Storylines**: Biggest upsets (gap), Longest matches (with the dotted "durations can be wrong" caveat), Toughest runs (average opponent rank, lower = tougher). Main draw by default.
- **Stat leaders**: 6 top-5 boards (Aces, Double faults, 1st serve won, 2nd serve won, Return points won, Break points saved), main draw by default, with a scope note.
- **States**: "No 2020 edition" with the nearest years; not in data; unknown slug.

### Records `/records` (`Records.dc.html`)
- H1 + sub + Copy link; sticky filter bar **with the Tour toggle** (defaults: ATP, Tour level, current season).
- **Grid**: 3 groups (Winning / On serve / On return and margins) × 8 boards, `repeat(auto-fill, minmax(270px,1fr))`, gap 20. Board: `--card`, 1px `--line`, radius 4. The title button (16/700 + "Full table →") sits over a 1px ink rule; 10 rows (rank · name · optional detail · figure 700); a fixed 380px list height so boards in a group stay equal; the qualifier footnote at 12px.
- **Full table** (`?board=<id>&sort=<col>`): "← All records"; the sticky-left rank and player columns; every column header is a sort button (`aria-sort`, ↓/↑; the sorted column in bold); paging footer. On phone: a "Sort by" select plus cards showing the rank, name, the sorted figure (20/700) and 6 other figures in a 3-column grid.
- **Empty**: filters with no data → message + Reset.

### Lab `/lab` (`Lab.dc.html`)
- H1 "Lab" + sub. **Example questions**: 6 buttons in `repeat(auto-fit, minmax(300px,1fr))`; the selected one gets an ink border, `--bg2` fill and 600 weight; picking one loads its SQL **and runs it**.
- Layout: `minmax(0,1fr) 280px` (340px at ≥ 1100px); a single column on phone.
- **Build a query** (`<details>`): Relation, Tour, Surface, Level, From, To, Order by, Limit selects + a Player name input → "Write SQL ↓" writes editable SQL into the editor.
- **Editor**: a highlighted `<pre>` under a transparent `<textarea>` (IBM Plex Mono 14px, line-height 1.6, padding 14px 16px, min-height 220, max-height 520 with scroll). Token colours: keywords `--acc` 600, strings `--clay`, numbers `--hard`, functions `--grass`, comments `--ink2`. Character counter "n / 20,000" (turns `--loss` over the limit). **Run** (ink fill) + "⌘ / Ctrl + Enter"; Tab inserts two spaces; Copy link writes `?example=` or `?sql=`.
- **Errors**: `--loss` bordered panel, title + the database message verbatim in mono `pre-wrap`. Non-SELECT/WITH queries and multiple statements are rejected client-side with a plain message; timeout copy per the brief.
- **Results**: status "89 rows · 19 ms" (+ the capped note); sticky-header table with horizontal scroll, sortable client-side, numbers right-aligned, scores in mono, name columns (`winner_name`, `loser_name`, `player_name`, `opponent_name`, `name`, `player`, `opponent`, `player_a`, `player_b`) linked; **Download CSV**; the limits line.
- **Schema**: a sticky right column on desktop, a full-screen drawer on phone ("Schema" button / "Done"). The 4 relations as `<details>` (name + row count + description); each column is a button (name in mono `--acc`, type, plain-English meaning) that inserts the name at the cursor.

### About the data (`About.dc.html`)
Coverage figures, known caveats (durations, missing ranks, implausible aces, qualifying mixed in, thin samples), and the terms glossary, all from `04-data-dictionary.md`.

---

## Interactions and state (summary)
- **URL is state.** Every filter, board, sort, example, pair, event and year writes to the URL with `history.replaceState` (filter changes replace history). An invalid param falls back to its default without resetting the others. See the URL scheme in `02-shell.md`.
- Blocks load independently, each with its own loading/error/empty state; never a page-wide spinner.
- Keyboard: `/` focuses search (it opens the sheet on phone); ↑ ↓ Enter Esc in search; all toggles are buttons with `aria-pressed` / `aria-expanded`; table headers are buttons with `aria-sort`; ⌘/Ctrl+Enter runs SQL.
- Charts have text equivalents (per-bar `aria-label`s, the rank table disclosure, the grid is a real table).
- Transitions: none beyond the skeleton pulse; keep interactions instant.

## Assets
No images or icon files. The only drawn icons are the search magnifier (a circle plus a line, inline SVG) and the text glyphs ■ ● ▲ ◆ ⇄ ▼ ▲. Fonts come from Google Fonts: Schibsted Grotesk, IBM Plex Mono. Credit Tennis Abstract / Jeff Sackmann; don't imitate their or any tour's branding.

## Files
- `prototype/Board.dc.html`: overview of every screen and state (start here).
- Screens: `prototype/Home.dc.html`, `Player.dc.html`, `Versus.dc.html`, `Tournament.dc.html`, `Records.dc.html`, `Lab.dc.html`, `About.dc.html`.
- Shared components: `SiteHeader.dc.html`, `SiteFooter.dc.html`, `SearchBox.dc.html`, `FilterBar.dc.html`, `MatchRow.dc.html`.
- `prototype/support.js`: the runtime for the prototype files only (not needed in the real build).
- `../design-brief/` (symlinked into `prototype/uploads/design-brief/` so the prototypes can fetch the samples): the full product brief and the real sample API responses the designs use.

State URLs worth opening: `?state=loading`, `?state=error`, `?state=notfound` (Player), `?state=nostats` (Player), `?surface=Carpet` (Player empty), `Versus.dc.html?b=rafael-nadal&surface=Grass`, `Versus.dc.html?state=nopair`, `Tournament.dc.html` (browse), `Tournament.dc.html?event=wimbledon&year=2020`, `Records.dc.html?board=ace_pct`, `Lab.dc.html?state=error`. Add `&theme=dark` to any of them.
