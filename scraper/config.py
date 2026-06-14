"""Scraper configuration constants."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).parents[1]

# Tennis Abstract URLs
TA_BASE_URL = 'https://tennisabstract.com'
TA_RANKINGS_BASE = 'https://www.tennisabstract.com/reports'
ATP_PLAYER_URL = TA_BASE_URL + '/cgi-bin/player-classic.cgi?p={url_name}'
WTA_JS_URL     = TA_BASE_URL + '/jsmatches/{url_name}.js'
WTA_CAREER_URL = TA_BASE_URL + '/jsmatches/{url_name}Career.js'

# Concurrency
# SEMAPHORE_LIMIT workers run in parallel; a global rate limiter then ensures
# consecutive requests are spaced at least MIN_REQUEST_GAP seconds apart so
# workers never burst-fire simultaneously.
SEMAPHORE_LIMIT  = 2
MIN_REQUEST_GAP  = 4.0   # Minimum seconds between any two consecutive requests (global)
SLEEP_MIN        = 0.5   # Extra per-request random jitter on top of the gap
SLEEP_MAX        = 2.0

# HTTP
REQUEST_TIMEOUT = 20         # Seconds
MAX_RETRIES = 3
RETRY_WAIT_MIN = 4.0
RETRY_WAIT_MAX = 9.0
RATE_LIMIT_WAIT = 30.0       # Base wait on 429; doubles each retry attempt

# Incremental scraping targets
INCREMENTAL_DAYS_STALE = 1   # Re-scrape if not scraped in N days

# Paths
PARQUET_ATP  = BASE_DIR / 'data' / 'parquet' / 'atp'
PARQUET_WTA  = BASE_DIR / 'data' / 'parquet' / 'wta'
REFERENCE_DIR = BASE_DIR / 'data' / 'reference'
CHECKPOINT_DB = BASE_DIR / 'data' / 'checkpoint.db'

ATP_PLAYERS_CSV     = REFERENCE_DIR / 'atp_players_cleaned.csv'
WTA_PLAYERS_CSV     = REFERENCE_DIR / 'wta_players_cleaned.csv'
ATP_TOP100_CSV      = REFERENCE_DIR / 'atp_players_top100.csv'
WTA_TOP100_CSV      = REFERENCE_DIR / 'wta_players_top100.csv'

# Proxy (optional) — set HTTPS_PROXY or HTTP_PROXY env var to route through a proxy
PROXY_URL = os.getenv('HTTPS_PROXY') or os.getenv('HTTP_PROXY') or None

USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/124.0.0.0 Safari/537.36'
)
