"""Which players to scrape? Full vs incremental target lists."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

from scraper.config import (
    ATP_PLAYERS_CSV, WTA_PLAYERS_CSV,
    ATP_TOP100_CSV, WTA_TOP100_CSV,
    INCREMENTAL_DAYS_STALE,
    TA_RANKINGS_BASE, USER_AGENT, PROXY_URL,
)

logger = logging.getLogger(__name__)


@dataclass
class ScrapeTask:
    url_name: str
    player_name: str
    tour: str               # 'M' for ATP, 'F' for WTA


def _load_players(csv_path, tour: str) -> list[ScrapeTask]:
    from scraper.parser import normalize_name_for_url
    df = pd.read_csv(csv_path)
    # Vectorized string processing — avoids iterrows on potentially large player lists
    df['url_name'] = (
        df['url_name'].fillna('').astype(str).str.strip().apply(normalize_name_for_url)
    )
    df['name'] = df['name'].fillna('').astype(str).str.strip()
    df = df[df['url_name'].str.len() > 0]
    df = df[df['url_name'] != 'nan']
    return [
        ScrapeTask(url_name=row.url_name, player_name=row.name, tour=tour)
        for row in df.itertuples(index=False)
    ]


def get_full_player_list() -> list[ScrapeTask]:
    """Return top-100 players from both tours in data/reference/."""
    atp = _load_players(ATP_TOP100_CSV, tour='M') if ATP_TOP100_CSV.exists() else []
    wta = _load_players(WTA_TOP100_CSV, tour='F') if WTA_TOP100_CSV.exists() else []
    tasks = atp + wta
    logger.info(f'Full list (top-100): {len(atp)} ATP + {len(wta)} WTA = {len(tasks)} total')
    return tasks


def fetch_live_ranked_players() -> list[ScrapeTask]:
    """
    Fetch the current ATP and WTA rankings pages from Tennis Abstract
    and return a ScrapeTask for each ranked player.
    Falls back to an empty list if the fetch fails.
    """
    import random
    import time
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error('requests and beautifulsoup4 are required: pip install requests beautifulsoup4')
        return []

    from scraper.parser import normalize_name_for_url

    tasks: list[ScrapeTask] = []

    for tour_key, tour_code in [('atp', 'M'), ('wta', 'F')]:
        url = f'{TA_RANKINGS_BASE}/{tour_key}Rankings.html'
        logger.info(f'Fetching live {tour_key.upper()} rankings from {url}')
        try:
            time.sleep(random.uniform(1.0, 2.5))
            proxies = {'http': PROXY_URL, 'https': PROXY_URL} if PROXY_URL else None
            resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=30, proxies=proxies)
            resp.raise_for_status()
        except Exception as exc:
            logger.error(f'Failed to fetch live {tour_key.upper()} rankings: {exc}')
            continue

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')

        target = None
        for tbl in soup.find_all('table'):
            headers = [th.get_text(strip=True).lower() for th in tbl.find_all('th')]
            if any('rank' in h or 'rk' in h for h in headers) and \
               any('player' in h or 'name' in h for h in headers):
                target = tbl
                break

        if target is None:
            logger.warning(f'No rankings table found on {url}')
            continue

        for tr in target.find_all('tr')[1:]:
            tds = tr.find_all('td')
            if len(tds) < 2:
                continue
            rank_text = tds[0].get_text(strip=True)
            if not rank_text or not rank_text[0].isdigit():
                continue
            player_name = ''
            for td in tds[1:3]:
                a = td.find('a')
                if a:
                    player_name = a.get_text(strip=True)
                    break
                text = td.get_text(strip=True)
                if text and not text.isdigit():
                    player_name = text
                    break
            if not player_name:
                continue
            url_name = normalize_name_for_url(player_name)
            if url_name:
                tasks.append(ScrapeTask(url_name=url_name, player_name=player_name, tour=tour_code))

        logger.info(f'Found {sum(1 for t in tasks if t.tour == tour_code)} live {tour_key.upper()} players')

    return tasks


def get_incremental_targets(
    days_stale: int = INCREMENTAL_DAYS_STALE,
    checkpoint=None,
) -> list[ScrapeTask]:
    """
    Fetch the current live rankings from Tennis Abstract and return players
    who have not been scraped within days_stale days.
    """
    all_tasks = fetch_live_ranked_players()

    if not all_tasks:
        logger.warning('Live rankings fetch returned no players — incremental run aborted.')
        return []

    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=days_stale)

    # Get last-scraped timestamps from checkpoint
    last_scraped: dict[str, datetime] = {}
    if checkpoint is not None:
        rows = checkpoint._con.execute(
            "SELECT url_name, scraped_at FROM scrape_state WHERE status='done'"
        ).fetchall()
        for url_name, ts_str in rows:
            if ts_str:
                try:
                    last_scraped[url_name] = datetime.fromisoformat(ts_str)
                except ValueError:
                    pass

    filtered = [
        task for task in all_tasks
        if not (last_scraped.get(task.url_name, datetime.min.replace(tzinfo=timezone.utc)) > stale_cutoff)
    ]

    logger.info(f'Incremental targets: {len(filtered)} / {len(all_tasks)} live players need re-scraping')
    return filtered


def get_single_player_task(name_or_url: str, tour: str) -> ScrapeTask:
    """Build a single task for --mode player CLI."""
    from scraper.parser import normalize_name_for_url
    url_name = normalize_name_for_url(name_or_url) if ' ' in name_or_url else name_or_url
    return ScrapeTask(url_name=url_name, player_name=name_or_url, tour=tour)
