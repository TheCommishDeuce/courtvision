# CourtVision

A tennis statistics dashboard covering ATP and WTA match history, built on data
from [Tennis Abstract](https://www.tennisabstract.com). It scrapes per-player
match data, cleans and enriches it into a canonical DuckDB database, serves it
through a FastAPI JSON API, and renders an interactive React dashboard.

> All credit for the underlying match data goes to Jeff Sackmann
> ([tennis_atp](https://github.com/JeffSackmann/tennis_atp)) and Tennis Abstract.

## Features

- **Player profiles** — career summary, match history, serve/return stats,
  percentile ranks, rank trajectory, surface heatmaps, milestones, and
  statistically similar players.
- **Head-to-head** — full H2H records with surface/level/year filters and a
  match timeline.
- **Tournament recaps** — results by round, longest matches, biggest upsets,
  stat leaders, and draw strength.
- **Leaderboards** — wins, serve, return, upsets, comebacks, streaks, and more.
- **Match search** — filter by stat ranges with CSV export.
- **Compare** — side-by-side player comparison.

## Architecture

```
React + TypeScript SPA (Vite)
        │  /api/*
FastAPI (uvicorn)
        │  read-only
DuckDB  data/tennis.duckdb
```

An offline batch pipeline, fully decoupled from the API, produces the database:

```
run_scraper.py  ──►  per-player Parquet (data/parquet/{atp,wta}/)
run_pipeline.py ──►  master Parquet + data/tennis.duckdb
```

## Tech stack

- **Backend:** Python 3.12, FastAPI, DuckDB, pandas, PyArrow
- **Scraper:** aiohttp, BeautifulSoup, demjson3 (async, rate-limited)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Query,
  React Router, Recharts

## Project structure

```
api/        FastAPI app (routers, DuckDB dependency, serializers)
db/         DuckDB schema + parameterised SQL query modules
pipeline/   Clean / enrich / deduplicate / load
scraper/    Async scraper (fetcher, parser, scheduler, checkpoint)
frontend/   React + TypeScript SPA
tests/      pytest suite
```

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+

### 1. Backend

```bash
python3.12 -m venv venv
venv/bin/pip install -r requirements.txt
```

### 2. Build the database

```bash
venv/bin/python run_scraper.py --mode incremental   # fetch match data
venv/bin/python run_pipeline.py                      # build data/tennis.duckdb
```

### 3. Run the API

```bash
venv/bin/uvicorn api.main:app --port 8000 --reload
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server on :5173, proxies /api to :8000
```

Or start both with `./start.sh`.

## Production build

```bash
cd frontend && npm run build      # outputs frontend/dist/
```

When `frontend/dist/` exists, the FastAPI app serves the built SPA directly, so
the API and frontend are same-origin. Deployment runs uvicorn behind a reverse
proxy; see `deploy/` for a systemd unit and deploy script.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `TENNIS_DB` | `data/tennis.duckdb` | Path to the DuckDB database |
| `TENNIS_DB_THREADS` | `1` | DuckDB threads per connection |
| `TENNIS_AUTH_DB` | `data/auth.db` | SQLite auth database |

## Tests

```bash
venv/bin/pytest tests/
```

## License

No license has been assigned yet. The match data originates from Tennis Abstract
and Jeff Sackmann's datasets; please respect their terms when using this project.
