"""asyncio orchestrator with tqdm progress bar."""
from __future__ import annotations

import asyncio
import logging
import traceback
from pathlib import Path
from typing import Optional

import aiohttp
import pandas as pd
from tqdm.asyncio import tqdm as atqdm

from scraper.config import (
    SEMAPHORE_LIMIT, PARQUET_ATP, PARQUET_WTA,
    ATP_PLAYER_URL, WTA_JS_URL, WTA_CAREER_URL,
)
from scraper.checkpoint import Checkpoint
from scraper.fetcher import Fetcher
from scraper.parser import (
    extract_matchmx_atp, extract_matchmx_wta,
    matches_to_dataframe, is_error_page, normalize_name_for_url,
)
from scraper.scheduler import ScrapeTask
from pipeline.loader import write_player_parquet
from pipeline.deduplicator import _make_unique_key_vectorized

logger = logging.getLogger(__name__)


async def _scrape_one(
    task: ScrapeTask,
    fetcher: Fetcher,
    checkpoint: Checkpoint,
) -> dict:
    """
    Fetch and parse one player's matches.
    Returns a status dict: {'url_name', 'status', 'match_count', 'error'}
    """
    raw_url_name = task.url_name
    url_name = normalize_name_for_url(raw_url_name)  # strip spaces / bad chars
    tour = task.tour

    # If the stored name had spaces/bad chars, remove the stale checkpoint entry
    # so the clean name takes over as the canonical key.
    if url_name != raw_url_name:
        checkpoint.delete_entry(raw_url_name)
        logger.info(f'Normalized url_name: {raw_url_name!r} → {url_name!r}')

    try:
        raw_matches: list = []

        if tour == 'M':
            # ATP: single HTML page
            url = ATP_PLAYER_URL.format(url_name=url_name)
            status, html = await fetcher.get(url)

            if status == 404:
                checkpoint.mark_error(url_name, tour, '404')
                return {'url_name': url_name, 'status': '404', 'match_count': 0}

            if is_error_page(html, url_name):
                checkpoint.mark_error(url_name, tour, 'error_page')
                return {'url_name': url_name, 'status': 'error_page', 'match_count': 0}

            parsed = extract_matchmx_atp(html)
            if parsed:
                raw_matches.extend(parsed)

        else:
            # WTA: two JS files
            for url_template in [WTA_JS_URL, WTA_CAREER_URL]:
                url = url_template.format(url_name=url_name)
                try:
                    status, js_text = await fetcher.get(url)
                except aiohttp.ClientResponseError as e:
                    if e.status == 404:
                        continue
                    raise

                if status == 404:
                    continue

                if is_error_page(js_text, url_name):
                    continue

                parsed = extract_matchmx_wta(js_text)
                if parsed:
                    raw_matches.extend(parsed)

        if not raw_matches:
            checkpoint.mark_error(url_name, tour, 'no_data')
            return {'url_name': url_name, 'status': 'no_data', 'match_count': 0}

        df = matches_to_dataframe(raw_matches, task.player_name)
        if df.empty:
            checkpoint.mark_error(url_name, tour, 'no_data')
            return {'url_name': url_name, 'status': 'no_data', 'match_count': 0}

        # Add tour column and unique key before writing
        df['tour'] = tour
        df['unique_match_key'] = _make_unique_key_vectorized(df)

        # Write parquet
        out_dir = PARQUET_ATP if tour == 'M' else PARQUET_WTA
        out_path = out_dir / f'{url_name}.parquet'

        write_player_parquet(df, out_path)

        last_date = str(df['date'].max().date()) if 'date' in df.columns else None
        checkpoint.mark_success(url_name, tour, last_date, len(df))

        return {'url_name': url_name, 'status': 'done', 'match_count': len(df)}

    except asyncio.TimeoutError:
        checkpoint.mark_error(url_name, tour, 'timeout')
        logger.warning(f'Timeout: {url_name}')
        return {'url_name': url_name, 'status': 'timeout', 'match_count': 0, 'error': 'timeout'}

    except Exception as exc:
        checkpoint.mark_error(url_name, tour, 'error')
        logger.error(f'Error scraping {url_name}: {exc}\n{traceback.format_exc()}')
        return {'url_name': url_name, 'status': 'error', 'match_count': 0, 'error': str(exc)}


async def run_scraper(
    tasks: list[ScrapeTask],
    checkpoint: Checkpoint,
) -> list[dict]:
    """
    Run all tasks concurrently with SEMAPHORE_LIMIT workers.
    Returns list of result dicts.
    """
    semaphore = asyncio.Semaphore(SEMAPHORE_LIMIT)
    results: list[dict] = []

    async with Fetcher(semaphore) as fetcher:
        coros = [
            _scrape_one(task, fetcher, checkpoint)
            for task in tasks
        ]
        for coro in atqdm.as_completed(coros, total=len(coros), desc='Scraping'):
            result = await coro
            results.append(result)

    # Summary
    by_status: dict[str, int] = {}
    for r in results:
        by_status[r['status']] = by_status.get(r['status'], 0) + 1
    logger.info(f'Scrape complete: {by_status}')

    # List failed players
    failed = [r for r in results if r['status'] != 'done']
    if failed:
        lines = [f"  {r['status']:<12} {r['url_name']}" for r in sorted(failed, key=lambda r: (r['status'], r['url_name']))]
        logger.warning(f'Failed players ({len(failed)}):\n' + '\n'.join(lines))

    return results
