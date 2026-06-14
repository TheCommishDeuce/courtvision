"""Public query-builder API grouped by domain modules."""
from __future__ import annotations

from .analysis import q_tour_level_season_leaders, q_youngest_stage_reached
from .compare import q_common_opponents
from .h2h import q_h2h
from .leaders import (
    q_leaders_activity,
    q_leaders_activity_combined,
    q_leaders_bakery,
    q_leaders_comebacks,
    q_leaders_draw_strength,
    q_leaders_finals,
    q_leaders_return,
    q_leaders_serve,
    q_leaders_slam_record,
    q_leaders_streaks,
    q_leaders_tiebreaks,
    q_leaders_top10_wins,
    q_leaders_upsets,
    q_leaders_wins,
)
from .meta import (
    q_all_countries,
    q_all_player_names,
    q_all_tournaments,
    q_meta_stats,
    q_recent_upsets,
    q_storylines,
    q_year_range,
)
from .nationality import q_country_leaders, q_nationality_stage
from .relational import q_relational_match_search, q_relational_summary
from .superlatives import q_match_extremes
from .player import (
    q_player_form,
    q_player_matches,
    q_player_matches_with_walkovers,
    q_player_milestones,
    q_player_rank_history,
    q_player_return_percentiles,
    q_player_return_stats,
    q_player_serve_percentiles,
    q_player_serve_stats,
    q_player_summary,
    q_similar_players,
    q_similar_players_return,
    q_surface_level_heatmap,
    q_top_n_records,
)
from .search import q_match_search
from .tournament import (
    q_recent_champions,
    q_tournament_draw_strength,
    q_tournament_matches,
    q_tournament_years,
)

__all__ = [name for name in globals() if name.startswith('q_')]
