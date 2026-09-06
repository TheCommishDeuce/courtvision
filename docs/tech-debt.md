# Technical debt and functionality audit

Baseline reviewed: `8b19c07`. Scope agreed: the entire stack, preserve existing
capabilities, prioritize correctness and maintainability. No framework migration,
visual redesign, feature removal, production deployment, scraping, or real-data
reload is part of these cleanup batches.

This is a source-and-test audit, not an assertion that every production workflow
has been exercised. Findings below distinguish reproduced failures from
code-inspected risks. Live infrastructure, historical credential rotation, real
data prevalence, and production latency remain unverified. Browser checks below
use synthetic data, not the production database.

## Completed in the first batch

| Change | Files | Regression evidence |
|---|---|---|
| Atomic database refresh | `run_pipeline.py`, `pipeline/loader.py` | Failed match, ATP-reference, and WTA-reference inserts retain the previous matches and both player tours. Interruptions roll back. Success is repeatable. Connections close on failure and success. |
| Prepare before opening the database; clean/enrich once | `run_pipeline.py` | A failed master write does not leave an open DB connection. The writer remains the owner of cleaning/enrichment; the duplicate preparation call was removed. |
| Per-field URL recovery | `frontend/src/state/useUrlFilters.ts` | Invalid years/enums do not discard valid player, tour, or board values. Patches use recovered state, remove invalid optional fields, preserve unrelated parameters, and replace history. Navigation and last-value-wins repeated keys are covered. |
| One dashboard HTTP client | `frontend/src/api/client.ts`, existing `api/http.ts` | GET and SQL POST helpers use the shared client, retaining the base URL, dashboard header, and response unwrapping. No endpoint or hook was removed. |

The transaction covers **matches and player-reference data**, not schema changes,
the master parquet, or per-player scraper files. Low-level loader helpers leave
transaction ownership to the pipeline entrypoint. This does not yet solve
incomplete input snapshots or atomic publication of files (D03).

Tests added/extended: `tests/test_pipeline_safety.py`,
`frontend/src/state/useUrlFilters.test.tsx`, `frontend/src/api/http.test.ts`.
The initial regressions failed against the old implementation before being fixed.

First-batch validation: 59 backend tests and 94 frontend tests passed; zero-warning
frontend lint, TypeScript/production build, `pip check`, and `git diff --check`
passed. Direct `pip-audit -r requirements.txt` and `npm audit --omit=dev` reported
no known vulnerabilities. The existing Starlette/httpx test-client deprecation
warning remains. No browser or latency benchmark was run.

## Completed in the statistics batch

Scope confirmed by the user: match totals, rates, and titles follow the selected
filters. Biography, milestones, career-high rank, percentiles, and similarity
profiles remain career-wide. Ranking-history charts retain their selected-year
scope and now say that they span all surfaces/levels.

- Player summary, serve, return, and common-opponent endpoints now accept and
  apply `level`. Player and Versus propagate surface, level, and years
  consistently, including H2H and both players' records. Headline totals use the
  summary rather than re-summing potentially incomplete surface/year groups.
- Summary wins/losses and titles use the same match filters. Career-high rank has
  its own career-wide query; biography and milestones keep their existing scope.
- `All Tour` reaches the backend instead of becoming an unfiltered request.
  `All Dev` includes ITF as documented. `All` is an explicit unrestricted level
  value so selecting it survives URL defaults; empty legacy values still work.
- Player serve/return rates and percentile inputs share per-metric paired-row
  calculations. Missing inputs and nonpositive denominators produce nulls;
  genuine zero values stay zero. Return data uses the opponent's points in both
  winner/loser orientations, excluding walkovers consistently with match records.
- Percentiles exclude unknown values independently for each axis. Ties and a
  one-player population retain `PERCENT_RANK` semantics; the 20-stat-bearing-match
  eligibility floor remains. `tour_size` counts eligible players, not a guaranteed
  observation count for every metric, which the footer now makes explicit.
- Recharts maps null radar values to radius zero. Partial profiles therefore use
  `AdaptiveTable` with available values and missing markers; fully populated
  profiles retain their radars. Both comparison players remain visible.
- Tiebreak enrichment recognizes 7–6 and 6–7 with all four supported dash forms.
  This fixes future preparation only: **stored data was not reloaded**.

Regression suites: `tests/test_player_statistics.py`,
`tests/test_score_enrichment.py`, `frontend/src/pages/FilterScopes.test.tsx`, and
`frontend/src/components/charts/PercentileRadarChart.test.tsx`. Initial statistics
and score tests reproduced 52 failing cases before the implementation; frontend
scope and partial-radar failures were also reproduced first.

Browser verification used a local FastAPI instance with an in-memory synthetic
DuckDB and the production frontend build: partial/complete Player profiles and
Versus at 390px, plus a partial Player profile at 1440px. Screenshots were inspected;
no horizontal page overflow, API errors, or uncaught browser exceptions occurred.
No external tennis data source or real database was used for the preview.

Statistics-batch validation: **145 backend tests and 106 frontend tests pass**;
zero-warning frontend lint, TypeScript/production build, `pip check`, and
`git diff --check` pass. The existing Starlette/httpx deprecation warning remains.
`EXPLAIN ANALYZE` was exercised for the changed summary/rate/percentile queries on
tiny synthetic fixtures; this is a plan sanity check, not a production benchmark.

Remaining D02/D04 work below is deliberately not marked complete: separate
leaderboard, similarity, tournament, round-order, and broader score conventions
still need their own tests and reconciliation.

## Capabilities to retain

| Workflow | Existing implementation | Main cleanup concern |
|---|---|---|
| Home stories, champions, upsets | `HomePage`, meta/tournament endpoints | Meaning of recency and source freshness; reuse existing consumers rather than adding more endpoints. |
| Player dossier | `PlayerPage`, player endpoints | Filter scope, missing statistics, partial request failures. |
| H2H and career comparison | `VersusPage`, H2H/Career sections, h2h/player/compare endpoints | Preserve aligned match filters and explicitly career-wide facts; improve request-state consistency. |
| Tournament recap and draw strength | `TournamentPage`, tournament endpoints | Resolve the year before requesting a recap; shared round ordering and complete round display. |
| Player records, match extremes, scatter, nationalities | `RecordsPage`, leaders/analysis endpoints | Shared statistical definitions, cohort freshness, accurate qualification thresholds. |
| SQL builder, CSV, player-vs-cohort search | `SearchPage`, query/search endpoints | Preserve SQL containment; result/query consistency; test full request/response contracts. |
| Offline scraping and database refresh | `scraper/`, `pipeline/`, CLI entrypoints | Source completeness, safe publication, scraper transport, deterministic deduplication. |
| Deployment and operation | CI, `deploy/deploy.sh`, systemd reference | Fail-closed gates, reproducibility, rollback, readiness, and externally managed configuration. |

## Ordered backlog

P1 = correctness, data-loss, or safety exposure. P2 = resilience or maintainability.
Ordering is by dependency and risk, not by file size. A large file alone is not a
reason to split it, and an unused frontend hook alone is not proof its endpoint
can be deleted.

### D01 — resolved: establish and enforce filter scopes

**Resolved in the statistics batch. Original findings:**

- `PlayerPage.tsx` sends `level` to summary/serve/return, but the handlers in
  `api/routers/player.py` do not accept it. `PlayerParams` permits the unsupported
  field, so TypeScript does not catch the mismatch.
- Player translates `All Tour` into no level filter; Records sends `All Tour` to
  `_level_condition` in `db/queries/_helpers.py`, which excludes development and
  qualifying matches.
- `q_player_summary` applies `surface` to titles but not its win/loss CTE.
  With 20 Hard wins and 20 Clay wins, `surface=Hard` returned 40 summary wins
  while `q_player_matches(..., surface='Hard')` returned 20 matches.
- `All Dev` is described as Challenger/ITF plus qualifying in
  `api/routers/meta.py`, but `_level_condition` omits ITF. A fixture containing
  20 ITF matches returned zero under `All Dev`.
- Versus originally omitted level from career requests. The user explicitly
  approved aligning match-derived totals/rates/titles with the selected filters;
  the old exception and its UI copy have now been replaced.

**Settled:** biography, milestones, career-high rank, percentiles, and similarity
profiles are career-wide; match-derived statistics follow filters. Section labels
state the exceptions.

**Verification:** ATP/WTA query and HTTP fixtures cover surface, years, individual
levels, All Tour, All Dev, unrestricted All, and empty match selections. Page tests
exercise initial requests and level changes, preserving career-wide comparison
parameters. A common-opponent HTTP test checks combined filters.

### D02 — P1, partly resolved: missing statistics and rate populations

**Player stats/percentiles resolved in the statistics batch. Original failures:**

- `q_player_serve_stats` raises `TypeError` when points exist but an aggregated
  numerator such as aces is NULL (`100.0 * None`).
- Percentiles rank NULL rates with `PERCENT_RANK()` instead of leaving missing
  metrics unranked. With two eligible players, the one missing ace data received
  `ace% = 100.0`.
- Separate numerator/denominator sums and different stat-bearing row predicates
  occur across player, leaders, similar-profile, and tournament calculations.
  Their effect on partially populated rows needs a shared fixture, not a blind
  deduplication of formulas.

**Verified for player endpoints:** null handling, paired denominators, per-axis
percentile populations, ties, one eligible player, no eligible players, minimum
samples, and mixed coverage. The UI no longer plots missing percentiles at zero.

**Remaining:** extend/reconcile paired-row calculations with the separate leaders,
similarity, scatter, and tournament implementations. Preserve explicit sample
rules and test identical metric populations before centralizing further.

### D03 — P1: safe database transactions still need complete, safe inputs

**Code-inspected risk.**

- `merge_all_tours_from_parquets` logs unreadable files and continues. The full
  reload can therefore commit an incomplete snapshot even after the transaction
  fix. File absence after discovery is also not tracked by a manifest.
- Deduplication uses the first row encountered without a stable file ordering or
  freshness/completeness policy. The older CSV path merges non-null columns;
  the active parquet path drops later duplicates outright.
- Match keys omit tournament and tour; `player_match_view` omits the key, so
  `perspective_stats_join` reconstructs identity from dates, rounds, and names.
  Collision prevalence has not been measured; changing keys requires a migration.
- `write_player_parquet` and `write_master_parquet` overwrite final paths directly.
  An interrupted file write is not covered by the DuckDB transaction.
- WTA scraping can replace a prior full file when only one of its two source
  files supplied valid data (`scraper/runner.py`).

**Done when:** unreadable/disappearing inputs cannot silently publish a smaller
archive; files are published atomically; completeness/freshness and conflict
resolution are explicit and tested. Measure key collisions before proposing a
new identity scheme. Keep partial-scrape salvage separate from full publication.

### D04 — P1: reconcile score-derived and round-derived facts

**Reproduced / code-inspected.**

- **Fixed for future preparation:** `_prepare_df` previously marked
  `6-7(4) 6-3 6-2` as `had_tiebreak=False`. Both directions now agree with the
  parser across supported dash forms. Existing stored flags still need a
  separately approved refresh.
- The parser/enricher accept multiple dash characters, but several comeback and
  bakery SQL expressions only recognize ASCII score fragments.
- `frontend/src/domain/rounds.ts` ranks RR/BR below early main-draw rounds and
  omits ER; Python's `ROUND_SORT_ORDER` uses different ordering.
  `DrawResults.tsx` filters main-draw display to a list excluding RR/BR.
- Walkover/retirement treatment differs across views, titles, upsets, return
  statistics, and streaks. Some differences are intentional; document and test
  them before sharing one calculation everywhere.
- Implausible durations are documented, but the pipeline has no quality flag or
  validation policy. No current real-data anomaly count was verified in this audit.

**Done when:** winner/loser orientation, both tiebreak directions, Unicode scores,
retirements, defaults, walkovers, RR/BR/ER, and missing scores have fixtures.
Corrections to stored derived values need a separately approved data refresh.

### D05 — P1: make dependency auditing fail closed

**Reproduced without network access.** `frontend/audit-production.mjs` interprets
an npm failure containing valid JSON but no `vulnerabilities` field as success.
Simulating `{status: 1, stdout: '{"error":{"code":"ENOTFOUND"}}'}` printed
“No unreviewed high or critical production dependency vulnerabilities.”

**Done when:** process launch failures, unexpected exit codes, registry errors,
malformed JSON, and invalid report shapes fail the gate. Valid reports with only
reviewed allowlisted findings continue to work. Test this with mocked subprocess
results; do not weaken the existing advisory policy.

### D06 — P1: scraper transport guarantees are weaker than documented

**Code-inspected.** `scraper/fetcher.py` disables TLS certificate verification
(`TCPConnector(..., ssl=False)`). The rate limiter runs before the retry loop,
not before each attempt. Its pause check occurs before acquiring the spacing
lock, and the deadline is not rechecked after a pause extension. Per-request
jitter occurs after the spacing timestamp, so actual send spacing can be shorter
than the configured minimum.

**Done when:** verified TLS works with the actual network/proxy setup; fake-clock
and fake-response tests cover initial requests, retries, concurrent workers,
pause extensions, and 429 exhaustion. Do not test by hammering Tennis Abstract
or silently add an insecure fallback.

### D07 — P2: distinguish loading, empty, failed, and stale sections

**Code-inspected.** `PlayerPage` and Versus `CareerSection` check only some of their
queries and pass other sections just `.data`. `ServeReturnSection` and
`SimilarProfilesSection` can vanish on failure. The single `ErrorBoundary`
around all routes retains its error when navigating via the SPA navbar.

**Done when:** each independently loaded section has truthful loading/empty/error
states and retry behavior, without blocking the whole page on secondary data.
A render failure on one route must not trap navigation to other routes. Add
component integration tests and a 390px browser pass.

### D08 — P2: stabilize draft, submitted, and result state

**Code-inspected.** URL and Player/Versus filter-propagation tests now exist, but
other page-state transitions remain uncovered. Versus tour changes retain selected
player names/submission. Tournament recap
fetching is enabled before a default year resolves; the backend's omitted-year
query spans all years. Tournament input state is also synchronized from the URL
while edits clear the selected event. Query Builder allows controls/relation to
change during an outstanding request; old responses can populate the new view.

**Done when:** browser/component tests cover deep links, tour switches, editing an
existing selection, submit, navigation, default-year resolution, and responses
arriving after controls change. Decide whether edits cancel requests or retain
results explicitly labeled with their submitted query. Do not drop capabilities
to simplify state.

### D09 — P2: consolidate contracts before consolidating endpoints

**Code-inspected.** Most API responses have no `response_model`; TypeScript
interfaces are maintained separately in `types/tennis.ts` and `api/client.ts`.
Records casts heterogeneous source data through `Record<string, unknown>`.
Empty and populated tournament responses expose different stat keys.

**Done when:** active workflows have request/response contract tests, especially
empty and partially populated data. Add typed response contracts by domain before
considering generated client types; public OpenAPI exposure is not required.
Split large files only where ownership or contract clarity actually improves.

### D10 — P2: retire duplicate plumbing only after mapping its consumers

**Code-inspected.** `useSearchMatches`, several individual leaderboard hooks, and
`useSurfaceHeatmap` have no current UI callers. Records already uses five source
endpoints, including `activity-combined`. Older CSV ingestion helpers remain next
to the active parquet path. Round, level, score, and player-perspective logic are
repeated across Python, SQL, and TypeScript.

**Done when:** every retained capability maps to a UI consumer, hook, endpoint,
and tested query. Classify unused entries as internal legacy or intentional
compatibility before proposing removal. Share definitions after D01/D02/D04
establish their meaning; do not merge endpoints just to reduce their count.

### D11 — P2: make live ranking provenance an explicit architecture choice

**Code-inspected.** `api/routers/analysis.py` performs blocking HTTP ranking fetches
on the scatter request path, with a 20-second timeout, hourly process-local cache,
and stored-ranking fallback. This contradicts the blanket “offline API” account
in the local reference. The response does name its source; preserve that benefit.
The scraper has a separate ranking parser and name-normalization path.

**Done when:** decide whether to retain request-time live rankings or publish
ranking snapshots offline. Preserve cohort selection and visible provenance;
test failures, stale snapshots, name matching, and both tours. Measure latency
before adding caching infrastructure or aggregate endpoints.

### D12 — P2: SQL containment needs resource and streaming tests too

**Code-inspected risk; no bypass claimed.** Existing containment tests pass.
`api/routers/query.py` caps SQL length, row count, and execution time, but row count
alone does not cap cell width/response bytes or concurrent work. `_execute`'s timer
does not enclose response serialization or the entire CSV iteration.

**Done when:** retain all current containment tests and add bounded tests for
large cells, timeout cleanup, CSV iteration/disconnect, and concurrent requests.
Choose resource budgets from the deployment's actual memory/CPU limits. The
browser-header gate remains a deterrent, never authentication.

### D13 — P2: deployment/readiness/configuration remain operational debt

**Follow-up fixed: local preflight environment.** A deployment attempt reproduced
an old DuckDB 0.10.3 primary-key/index limitation in the system Python, while the
same repeatable-reload test passed with the pinned DuckDB 1.5.5 in `.venv`.
`deploy.sh` now prefers the project virtualenv, honors an explicit `PYTHON`, and
prints the interpreter and DuckDB version. Isolated shell-block tests cover
selection, spaces in paths, overrides, fallback, and failure propagation without
running the deploy entrypoint. The pipeline transaction and rollback tests remain
unchanged; old, unsupported DuckDB versions are not worked around.

**Remaining code-inspected concerns; remote state not verified.**

- Deploy rsyncs in place, mutates the live virtualenv, then restarts; it has smoke
  checks but no automatic prior-release rollback.
- The deploy preflight no longer matches all CI gates (dependency audits and
  Python lock verification are CI-only). Branch protection is external.
- Health opens the database and runs `SELECT 1`; it does not establish that the
  required tables contain a usable snapshot.
- `run_pipeline.py` uses a fixed database path while API connections honor
  `TENNIS_DB`; cron, systemd, Cloudflare rules, and data refresh coordination are
  managed outside the repository.

**Done when:** rehearse failed-release recovery, verify data readiness without
exposing sensitive detail, document snapshot publication and API restart/locking,
and make the active configuration/runbook reproducible. Check actual branch
protection and edge limits rather than assuming their presence.

### D14 — P2: reconcile the documentation and test map

**Verified locally.** `.gitignore` previously excluded all Markdown except
README files, including `AGENTS.md` and rebuild plans. The local reference still
claims missing CI, hardcoded CORS, and no pipeline/API tests even though the code
has moved on. This register now has a narrow ignore exception and a README link;
the historical local plans remain untracked and unchanged.

**Done when:** choose a maintained, versioned reference and reconcile it with
code and CI. Do not repeat historical secret-exposure claims as current findings:
`.env` is ignored and not in the inspected Git history, but this does not verify
credential rotation or copies outside this checkout.

## Suggested next batches and acceptance gates

1. **Statistics correctness:** reproduce D01/D02/D04 in persistent regression
   fixtures. Settle scope labels; fix missing-data handling and score facts.
   Cross-check Player, Versus, Records, and Tournament with the same fixture.
2. **Data acquisition/publication and audit safety:** D03/D05/D06. Fault-inject
   failed reads, partial scrapes, writes, retries, and dependency-registry errors.
3. **Workflow reliability and contracts:** D07/D08/D09, then consumer-backed
   consolidation in D10. Exercise every retained workflow with both tours and
   empty/error states; verify desktop and 390px behavior.
4. **Operational simplification:** D11/D12/D13/D14. Make remaining architecture
   choices explicit, measure bottlenecks, and rehearse recovery. No stack rewrite
   or endpoint deletion is a prerequisite.

For each batch: show a failing regression first where possible, make the smallest
fix, run backend tests, frontend tests, zero-warning lint, and the production
build; preserve SQL containment tests. Re-run direct dependency audits when
changing dependencies. Do not treat a passing test count as complete functional
coverage.
