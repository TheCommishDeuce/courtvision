"""SQLite-backed scrape state: resume + incremental logic.

Schema:
    CREATE TABLE scrape_state (
        url_name     TEXT PRIMARY KEY,
        tour         TEXT NOT NULL,          -- 'M' or 'F'
        status       TEXT NOT NULL,          -- 'done' | '404' | 'timeout' | 'error'
        scraped_at   TEXT,
        last_match_date TEXT,
        match_count  INTEGER
    )
"""
import sqlite3
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class Checkpoint:
    def __init__(self, db_path: Path) -> None:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._con = sqlite3.connect(str(db_path), check_same_thread=False)
        self._create_table()

    def _create_table(self) -> None:
        self._con.execute("""
            CREATE TABLE IF NOT EXISTS scrape_state (
                url_name        TEXT PRIMARY KEY,
                tour            TEXT NOT NULL,
                status          TEXT NOT NULL,
                scraped_at      TEXT,
                last_match_date TEXT,
                match_count     INTEGER
            )
        """)
        self._con.commit()

    def is_done(self, url_name: str) -> bool:
        row = self._con.execute(
            "SELECT status FROM scrape_state WHERE url_name = ?", (url_name,)
        ).fetchone()
        return row is not None and row[0] == 'done'

    def mark_success(
        self,
        url_name: str,
        tour: str,
        last_match_date: Optional[str] = None,
        match_count: int = 0,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self._con.execute(
            """
            INSERT OR REPLACE INTO scrape_state
                (url_name, tour, status, scraped_at, last_match_date, match_count)
            VALUES (?, ?, 'done', ?, ?, ?)
            """,
            (url_name, tour, now, last_match_date, match_count),
        )
        self._con.commit()

    def mark_error(self, url_name: str, tour: str, status: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        # If player was previously done, flag for retry so --mode retry-failed picks them up
        current = self._con.execute(
            "SELECT status FROM scrape_state WHERE url_name = ?", (url_name,)
        ).fetchone()
        if current and current[0] == 'done':
            status = f'retry_{status}'
            logger.warning(f'{url_name!r} was previously done but failed ({status}) — flagged for retry')
        self._con.execute(
            """
            INSERT OR REPLACE INTO scrape_state
                (url_name, tour, status, scraped_at, last_match_date, match_count)
            VALUES (?, ?, ?, ?, NULL, 0)
            """,
            (url_name, tour, status, now),
        )
        self._con.commit()

    def delete_entry(self, url_name: str) -> None:
        self._con.execute("DELETE FROM scrape_state WHERE url_name = ?", (url_name,))
        self._con.commit()

    def get_failed(self) -> list[tuple[str, str]]:
        """Return (url_name, tour) for all non-done entries."""
        rows = self._con.execute(
            "SELECT url_name, tour FROM scrape_state WHERE status != 'done'"
        ).fetchall()
        return [(r[0], r[1]) for r in rows]

    def get_done_set(self) -> set[str]:
        rows = self._con.execute(
            "SELECT url_name FROM scrape_state WHERE status = 'done'"
        ).fetchall()
        return {r[0] for r in rows}

    def summary(self) -> dict:
        row = self._con.execute("""
            SELECT
                SUM(CASE WHEN status='done'    THEN 1 ELSE 0 END),
                SUM(CASE WHEN status='404'     THEN 1 ELSE 0 END),
                SUM(CASE WHEN status='timeout' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status='error'   THEN 1 ELSE 0 END)
            FROM scrape_state
        """).fetchone()
        return {'done': row[0] or 0, '404': row[1] or 0,
                'timeout': row[2] or 0, 'error': row[3] or 0}

    def close(self) -> None:
        self._con.close()
