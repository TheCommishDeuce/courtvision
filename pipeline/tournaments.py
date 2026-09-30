"""One display name per tournament across spellings, tour prefixes and qualifying.

Tennis Abstract names the same event several ways depending on the page and the
year: "'s-Hertogenbosch", "s Hertogenbosch", "S-Hertogenbosch"; "ATP Stuttgart"
next to "Stuttgart"; and, for roughly 2007-2015, qualifying stored as its own
event ("Wimbledon Q", level "Q"). Downstream everything filters on the exact
`tournament` string, so each of those split an event's history.
"""
import logging
import re
import unicodedata

import pandas as pd

logger = logging.getLogger(__name__)

# Display spellings the frequency rule gets wrong, keyed by folded name.
DISPLAY_OVERRIDES = {
    'shertogenbosch': "'s-Hertogenbosch",
}

_QUALIFYING_SUFFIX = re.compile(r'\s+Q$')
_TOUR_PREFIX = re.compile(r'^(?:ATP|WTA)\s+', re.IGNORECASE)


def fold_tournament(name: str) -> str:
    """Identity of a tournament name: ASCII, lowercase, letters and digits only."""
    ascii_name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', ascii_name.lower())


def canonicalize_tournaments(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rewrite `tournament` to one display name per event, and give folded-in
    qualifying rows their parent event's level.

    A tour prefix ("ATP ") or qualifying suffix (" Q") is only dropped when the
    remainder is an event that already exists on the same tour, so "ATP Cup"
    and "WTA Finals" keep their names. A " Q" event is only folded in when all
    its rounds are qualifying rounds. The display name for a group is an entry
    in DISPLAY_OVERRIDES, else its most frequent unprefixed spelling.
    """
    if df.empty or 'tournament' not in df.columns:
        return df

    df = df.copy()
    df['tournament'] = df['tournament'].str.strip().str.replace(r'\s+', ' ', regex=True)
    names = df[['tournament', 'tour']].assign(
        is_q_round=df['round'].astype(str).str.startswith('Q'),
        year=df['year'] if 'year' in df.columns else pd.to_datetime(df['date']).dt.year,
    ).dropna(subset=['tournament'])
    spellings = names.groupby(['tournament', 'tour'], as_index=False).agg(
        n=('is_q_round', 'size'),
        all_q=('is_q_round', 'all'),
        last_year=('year', 'max'),
    )
    spellings['fold'] = spellings['tournament'].map(fold_tournament)
    folds_by_tour = spellings.groupby('tour')['fold'].agg(set).to_dict()

    def target(row) -> tuple[str, bool]:
        stripped = _TOUR_PREFIX.sub('', row.tournament)
        is_q = bool(_QUALIFYING_SUFFIX.search(stripped)) and row.all_q
        if is_q:
            stripped = _QUALIFYING_SUFFIX.sub('', stripped)
        parent = fold_tournament(stripped)
        if parent != row.fold and parent in folds_by_tour[row.tour]:
            return parent, is_q
        return row.fold, False

    targets = [target(r) for r in spellings.itertuples(index=False)]
    spellings['target'] = [t for t, _ in targets]
    spellings['merged_q'] = [q for _, q in targets]

    # Display spelling per target: only spellings that are already the plain
    # name compete, so a prefixed or " Q" variant never becomes the display.
    # Prize-money tiers are written "25K" more often than "$25K", so prefer
    # that; then the spelling with the most word breaks ("Sharm El Sheikh"
    # over "Sharm ElSheikh"); then the most frequent.
    plain = spellings[spellings['fold'] == spellings['target']]
    ranked = (
        plain.groupby(['target', 'tournament'], as_index=False)
        .agg(n=('n', 'sum'), last_year=('last_year', 'max'))
    )
    ranked['has_dollar'] = ranked['tournament'].str.contains('$', regex=False)
    ranked['breaks'] = ranked['tournament'].str.count(r'[\s\-]')
    ranked = ranked.sort_values(
        ['target', 'has_dollar', 'breaks', 'n', 'last_year', 'tournament'],
        ascending=[True, True, False, False, False, True],
    )
    display = ranked.drop_duplicates('target').set_index('target')['tournament'].to_dict()
    display.update({k: v for k, v in DISPLAY_OVERRIDES.items() if k in display})

    spellings['display'] = spellings['target'].map(display)
    changed = spellings[spellings['display'] != spellings['tournament']]
    if changed.empty:
        return df
    logger.info(
        f"Canonicalized {len(changed)} tournament spellings "
        f"({int(changed['merged_q'].sum())} qualifying events folded into their parent)"
    )

    key = pd.MultiIndex.from_frame(df[['tournament', 'tour']])
    lookup = changed.set_index(['tournament', 'tour'])
    merged_q_rows = key.isin(lookup.index[lookup['merged_q']])
    renamed = pd.Series(key.map(lookup['display'].to_dict().get), index=df.index)
    df['tournament'] = renamed.fillna(df['tournament'])

    # Folded-in qualifying rows carry level "Q"; give them the level the main
    # event had that year so level filters include them like modern qualifying.
    if merged_q_rows.any():
        year = df['year'] if 'year' in df.columns else pd.to_datetime(df['date']).dt.year
        main = df.loc[~merged_q_rows & (df['level'] != 'Q'), ['tournament', 'tour', 'level']].assign(year=year)
        parent_level = (
            main.groupby(['tournament', 'tour', 'year'])['level']
            .agg(lambda s: s.mode().iat[0])
        )
        q_keys = pd.MultiIndex.from_arrays([
            df.loc[merged_q_rows, 'tournament'], df.loc[merged_q_rows, 'tour'], year[merged_q_rows],
        ])
        levels = pd.Series(q_keys.map(parent_level.to_dict().get), index=df.index[merged_q_rows])
        df.loc[merged_q_rows, 'level'] = levels.fillna(df.loc[merged_q_rows, 'level'])

    return df
