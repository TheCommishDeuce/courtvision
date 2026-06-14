#!/usr/bin/env python3
"""
CLI: python run_scraper.py --mode full|incremental|player

Examples:
    python run_scraper.py --mode full
    python run_scraper.py --mode incremental
    python run_scraper.py --mode player --name "Novak Djokovic" --tour M
    python run_scraper.py --mode player --name CarlosAlcaraz --tour M
"""
import asyncio
import logging
import sys

import click

from scraper.checkpoint import Checkpoint
from scraper.config import CHECKPOINT_DB

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@click.command()
@click.option('--mode', type=click.Choice(['full', 'incremental', 'player', 'retry-failed']),
              default='incremental', show_default=True)
@click.option('--name', default=None, help='Player name or url_name (for --mode player)')
@click.option('--tour', type=click.Choice(['M', 'F']), default='M',
              show_default=True, help='Tour: M=ATP, F=WTA (for --mode player)')
def main(mode: str, name: str, tour: str) -> None:
    from scraper.scheduler import (
        get_full_player_list, get_incremental_targets, get_single_player_task,
    )
    from scraper.runner import run_scraper

    checkpoint = Checkpoint(CHECKPOINT_DB)

    try:
        if mode == 'full':
            tasks = get_full_player_list()
            logger.info(f'Full mode: {len(tasks)} players')
            results = asyncio.run(run_scraper(tasks, checkpoint))

        elif mode == 'incremental':
            from scraper.scheduler import ScrapeTask
            tasks = get_incremental_targets(checkpoint=checkpoint)
            logger.info(f'Incremental mode: {len(tasks)} players')
            # Clear checkpoint for targeted players — they must be re-scraped
            for task in tasks:
                checkpoint.delete_entry(task.url_name)
            results = asyncio.run(run_scraper(tasks, checkpoint))

            # Auto retry-failed up to 2x, scoped to players targeted in this run
            scraped_names = {t.url_name for t in tasks}
            for attempt in range(1, 3):
                retry_tasks = [
                    ScrapeTask(url_name=u, player_name=u, tour=t)
                    for u, t in checkpoint.get_failed()
                    if u in scraped_names
                ]
                if not retry_tasks:
                    break
                logger.info(f'Auto-retry {attempt}/2: {len(retry_tasks)} players')
                results = asyncio.run(run_scraper(retry_tasks, checkpoint))

        elif mode == 'player':
            if not name:
                click.echo('--name is required for --mode player', err=True)
                sys.exit(1)
            task = get_single_player_task(name, tour)
            logger.info(f'Single player: {task.url_name} ({task.tour})')
            results = asyncio.run(run_scraper([task], checkpoint))

        elif mode == 'retry-failed':
            from scraper.scheduler import ScrapeTask
            failed = checkpoint.get_failed()
            if not failed:
                logger.info('No failed players in checkpoint — nothing to retry.')
                return
            tasks = [ScrapeTask(url_name=u, player_name=u, tour=t) for u, t in failed]
            logger.info(f'Retry-failed mode: {len(tasks)} players')
            results = asyncio.run(run_scraper(tasks, checkpoint))

        summary = checkpoint.summary()
        logger.info(f'Checkpoint summary: {summary}')
        done = sum(1 for r in results if r.get('status') == 'done')
        logger.info(f'New parquets written this run: {done}')

    finally:
        checkpoint.close()


if __name__ == '__main__':
    main()
