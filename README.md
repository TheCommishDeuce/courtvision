# CourtVision

CourtVision is a public tennis statistics dashboard covering ATP and WTA match
history. It scrapes per-player data from
[Tennis Abstract](https://www.tennisabstract.com), cleans and enriches the data
into DuckDB, and renders an interactive React dashboard.

> All credit for the underlying match data goes to Jeff Sackmann
> ([tennis_atp](https://github.com/JeffSackmann/tennis_atp)) and Tennis Abstract.

## Features

- Player profiles with career, serve, return, ranking, milestone, and form data
- Head-to-head records with surface, level, and year filters
- Tournament recaps and draw-strength analysis
- Leaderboards, records, match superlatives, and relational match search
- Side-by-side player comparison

## Architecture

```text
React + TypeScript SPA (Vite)
        │  dashboard-only /api/* requests
FastAPI (uvicorn)
        │  read-only
DuckDB  data/tennis.duckdb
```

FastAPI is an internal data backend for the public dashboard, not a supported
external API. Dashboard requests carry a fixed client header and browser-source
metadata as a deterrent against casual direct access. This is not authentication
and must not be treated as a security boundary.

The offline data pipeline is decoupled from the web process:

```text
run_scraper.py  ──► data/parquet/{atp,wta}/*.parquet
run_pipeline.py ──► data/parquet/master/matches.parquet
                └─► data/tennis.duckdb
```

## Prerequisites

- Python 3.12+
- Node.js 20+
- A populated `data/tennis.duckdb`

## Local setup

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd frontend && npm ci && cd ..
```

Build or refresh local data when needed:

```bash
.venv/bin/python run_scraper.py --mode incremental
.venv/bin/python run_pipeline.py
```

Start both development servers:

```bash
./start.sh
```

The Vite dashboard runs at `http://localhost:5173` and proxies `/api` to the
FastAPI process on port 8000.

## Validation

```bash
.venv/bin/python -m pytest -q
.venv/bin/pip-audit -r requirements.txt

cd frontend
npm test
npm run lint -- --max-warnings=0
npm run build
npm run audit:prod
```

GitHub Actions runs the same backend tests, frontend tests, zero-warning lint,
production build, lock-file check, and production dependency audits. Configure
GitHub branch protection so these checks are required before merging to `main`.

## Python dependency lock

Direct dependency requirements live in `requirements.in`; `requirements.txt` is
the fully pinned file used by CI and deployment. Regenerate it with:

```bash
.venv/bin/pip-compile --strip-extras --output-file=requirements.txt requirements.in
```

## Production deployment

`deploy/deploy.sh` performs a manual code deployment. It requires:

- a clean local `main` branch;
- local `HEAD` to exactly match `origin/main`;
- passing required GitHub checks before merge.

The script builds the frontend, creates an artifact from committed files, syncs
it to `/opt/courtvision`, installs the pinned Python dependencies, restarts the
existing systemd service, and waits for `/api/health` to become ready.

```bash
REMOTE_HOST=root@192.168.0.122 REMOTE_DIR=/opt/courtvision ./deploy/deploy.sh
```

Production ownership rules:

- `/opt/courtvision/.env` is server-owned and is never deployed.
- `/opt/courtvision/data/` is server-owned and is never deployed or deleted.
- The remote cron job owns scraper and pipeline scheduling.
- Application deployment does not install or update the active systemd unit.
  `deploy/courtvision.service` is a bootstrap/reference file; copy changes into
  `/etc/systemd/system/` manually when intentionally updating the unit.

Cloudflare should apply a managed challenge for roughly one minute after an IP
exceeds approximately 120 requests per minute to `/api/*`, with `/api/health`
excluded. This rule is configured and verified outside this repository.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TENNIS_DB` | `data/tennis.duckdb` | DuckDB database path |
| `TENNIS_DB_THREADS` | `1` | DuckDB threads per request connection |
| `CORS_ORIGINS` | local Vite origins | Comma-separated development origins |
| `TENNIS_API_HOST` | `0.0.0.0` | Host used by `run_api.py` |
| `TENNIS_API_PORT` | `8000` | Port used by `run_api.py` |
| `TENNIS_API_RELOAD` | disabled | Enable reload for local development |

## Repository layout

```text
api/        FastAPI application and dashboard request gate
db/         DuckDB schema and parameterized query modules
pipeline/   Data cleaning, enrichment, deduplication, and loading
scraper/    Async Tennis Abstract scraper
frontend/   React and TypeScript dashboard
tests/      Backend query, route, and pipeline safety tests
deploy/     Manual deployment script and systemd reference unit
```

## Data and licensing

Runtime data under `data/` is not committed. No project license has been
assigned. The displayed match data is derived from Tennis Abstract and Jeff
Sackmann's datasets; preserve the attribution above when running the dashboard.
