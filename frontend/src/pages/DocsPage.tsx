import SectionHeader from '../components/ui/SectionHeader';

const MCP_SNIPPET = `{
  "mcpServers": {
    "courtvision-tennis": {
      "url": "https://courtvision.homelab-nn.com/mcp",
      "headers": {
        "Authorization": "Bearer cv_your_key_here"
      }
    }
  }
}`;

const CURL_SNIPPET = `curl \\
  -H "Authorization: Bearer cv_your_key_here" \\
  "https://courtvision.homelab-nn.com/api/h2h?player_a=Novak%20Djokovic&player_b=Rafael%20Nadal&tour=M"`;

interface Endpoint {
  tool: string;
  path: string;
  desc: string;
  params?: string;
  example?: string;
}

interface Group {
  title: string;
  blurb?: string;
  endpoints: Endpoint[];
}

const GROUPS: Group[] = [
  {
    title: 'Players',
    endpoints: [
      { tool: 'get_player_summary', path: 'GET /api/player/summary', desc: 'Career record, titles, country, hand, height, peak rank.' },
      { tool: 'get_player_matches', path: 'GET /api/player/matches', desc: 'Match log with by-surface / by-level / by-year splits. Now includes both players’ serve lines (focal + o_* opponent columns) for full match stats.' },
      { tool: 'get_player_serve_stats / get_player_return_stats', path: 'GET /api/player/serve-stats', desc: 'Aggregate serve and return profiles.' },
      { tool: 'get_player_serve_percentiles / get_player_return_percentiles', path: 'GET /api/player/serve-percentiles', desc: 'Tour-relative percentile ranks.' },
      { tool: 'get_player_form / get_player_milestones', path: 'GET /api/player/form', desc: 'Recent form and career milestones.' },
      { tool: 'get_player_rank_history / get_player_surface_heatmap', path: 'GET /api/player/rank-history', desc: 'Ranking timeline and surface win-rate heatmap.' },
      { tool: 'get_player_top_n_records', path: 'GET /api/player/top-n-records', desc: 'A player’s best/worst matches by a chosen metric.' },
      { tool: 'get_similar_serve_players / get_similar_return_players', path: 'GET /api/player/similar', desc: 'Stylistic neighbours by serve/return profile.' },
    ],
  },
  {
    title: 'Head-to-head & compare',
    endpoints: [
      { tool: 'get_head_to_head', path: 'GET /api/h2h', desc: 'H2H record, surface/level splits, and a match timeline with full both-sides stats (aces, DFs, serve/return %, BP saved).', params: 'player_a, player_b, surface, level, year_min, year_max, tour' },
      { tool: 'compare_common_opponents', path: 'GET /api/compare/common-opponents', desc: 'How two players fared against shared opponents.' },
    ],
  },
  {
    title: 'Relational match search',
    blurb: 'A focal player’s matches filtered by who the opponent was and the match situation. Returns a win/loss summary (all-time / last 5 years / last 52 weeks) plus full both-sides stats per match.',
    endpoints: [
      {
        tool: 'search_relational_matches',
        path: 'GET /api/search/relational',
        desc: 'Filter a player’s matches by opponent handedness, nationality, age, rank, round, and score state.',
        params: 'player, tour, opp_hand (L/R), opp_country (name or ISO), relation (compatriot/foreign), age_relation (younger/older), opp_rank_max, opp_age_min/max, round (incl. Q = qualifying), min_stage (R16/QF/SF/F or later), situation, surface, level, year_min/max',
        example: '"Show Nadal’s matches vs left-handers" · "Djokovic’s Grand Slam record after trailing two sets to love"',
      },
    ],
  },
  {
    title: 'Analysis & records',
    blurb: 'Composite tools for natural-language questions that span many matches.',
    endpoints: [
      {
        tool: 'get_match_extremes',
        path: 'GET /api/analysis/match-extremes',
        desc: 'Rank individual matches by a superlative metric, with full both-sides stats per result.',
        params: 'metric (duration, aces_match, aces_player, games, sets, rank_upset), order (desc/asc), tour, level, surface, round, tournament, year_min/max',
        example: '"Longest Masters 1000 match in 2024" · "Most aces in a match ever" · "Longest US Open match"',
      },
      {
        tool: 'get_nationality_stage_reached',
        path: 'GET /api/analysis/nationality-stage',
        desc: 'Players from a country that reached at least a given stage, ordered by date.',
        params: 'country (name or ISO), stage (R16/QF/SF/F), tour, level, surface, tournament, year_min/max, order (last/first)',
        example: '"Who was the last Russian woman to reach a Grand Slam final?" · "Last British man to reach a Wimbledon final"',
      },
      {
        tool: 'get_country_leaders',
        path: 'GET /api/analysis/country-leaders',
        desc: 'Rank countries by titles / finals / semifinals / match wins.',
        params: 'metric (titles/finals/semis/wins), tour, level, surface, year_min/max',
        example: '"Which country won the most WTA 250 titles in 2024?"',
      },
      {
        tool: 'get_youngest_tournament_stage_reached',
        path: 'GET /api/analysis/youngest-stage',
        desc: 'Youngest players to reach a stage, by tour/level/surface/year.',
      },
      {
        tool: 'get_tour_level_season_leaders',
        path: 'GET /api/analysis/tour-level-season-leaders',
        desc: 'Combined "All Tour" wins + finals leaders for one season.',
      },
    ],
  },
  {
    title: 'Search, tournaments & leaders',
    endpoints: [
      { tool: 'search_matches / download_matches_csv', path: 'GET /api/search/matches', desc: 'Symmetric match search with rank-upset and per-stat range filters; CSV export.' },
      { tool: 'get_tournament_recap', path: 'GET /api/tournament/recap', desc: 'Round-by-round draw (with per-match stats), longest matches, biggest upsets, stat leaders.' },
      { tool: 'get_wins_leaders / get_serve_leaders / get_return_leaders', path: 'GET /api/leaders/*', desc: 'Leaderboards across wins, serve, return, streaks, finals, tiebreaks, comebacks, and more.' },
    ],
  },
  {
    title: 'Metadata',
    endpoints: [
      { tool: 'list_players / list_tournaments', path: 'GET /api/meta/players', desc: 'Canonical player and tournament names.' },
      { tool: 'list_countries', path: 'GET /api/meta/countries', desc: '3-letter ISO country codes present, with player counts — map names to codes.' },
      { tool: 'get_filter_constants / get_year_range / get_database_stats', path: 'GET /api/meta/constants', desc: 'Surfaces, levels, tours, rounds, hands; covered seasons; headline counts.' },
    ],
  },
];

const STAT_FIELDS = [
  'Aces', 'Double Faults', '1st In%', '1st Won%', '2nd Won%',
  'Return Pts Won%', 'Total Pts Won', 'BP Saved',
];

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto bg-[var(--ink)] text-[var(--bone)] p-4 text-xs leading-relaxed ba-mono">
      <code>{value}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <div className="space-y-10">
      <section className="border-b border-[var(--rule)] pb-8">
        <div className="ba-kicker mb-4">Developer docs</div>
        <h1 className="ba-display">API Docs</h1>
        <p className="mt-5 max-w-2xl text-[16px] text-[var(--ink-2)] leading-relaxed">
          One free API key works for REST requests and MCP clients. Tools are auto-generated from the OpenAPI
          spec, so every endpoint below is also an MCP tool with the same name. Keys are created in the developer portal.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="ba-h2">REST Authentication</h2>
          <p className="text-sm text-[var(--ink-2)]">
            Send the key as a Bearer token. The frontend dashboard remains public, but external API calls require authentication.
          </p>
          <CodeBlock value={CURL_SNIPPET} />
        </div>
        <div className="space-y-4">
          <h2 className="ba-h2">MCP Client</h2>
          <p className="text-sm text-[var(--ink-2)]">
            MCP clients connect to the streamable HTTP endpoint and pass the same Bearer token in headers.
          </p>
          <CodeBlock value={MCP_SNIPPET} />
        </div>
      </section>

      {GROUPS.map(group => (
        <section key={group.title}>
          <SectionHeader title={group.title} kicker={`${group.endpoints.length} endpoint${group.endpoints.length !== 1 ? 's' : ''}`} />
          {group.blurb && <p className="text-sm text-[var(--ink-2)] mb-4 max-w-3xl">{group.blurb}</p>}
          <div className="space-y-3">
            {group.endpoints.map(ep => (
              <div key={ep.tool} className="ba-card-flat">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="ba-mono text-[13px] font-bold text-[var(--clay-deep)] break-words">{ep.tool}</span>
                  <span className="ba-mono text-[11px] text-[var(--mute)]">{ep.path}</span>
                </div>
                <p className="text-[13px] text-[var(--ink-2)] mt-1.5 leading-relaxed">{ep.desc}</p>
                {ep.params && (
                  <p className="ba-mono text-[11px] text-[var(--mute)] mt-2 leading-relaxed">
                    <span className="uppercase tracking-[0.12em] text-[var(--ink-2)]">params</span> · {ep.params}
                  </p>
                )}
                {ep.example && (
                  <p className="text-[12px] text-[var(--ink-2)] mt-2 italic">{ep.example}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <SectionHeader title="Extended match stats" kicker="expandable rows" />
        <p className="text-sm text-[var(--ink-2)] mb-4 max-w-3xl">
          Match-level tools return both players’ serve lines, so any single match can be broken down into a full
          stat comparison (shown when you tap a match row anywhere in the dashboard). Return% and Total Pts Won are
          derived from both serve lines.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_FIELDS.map(s => (
            <div key={s} className="ba-card-flat ba-mono text-xs text-[var(--ink-2)] break-words">{s}</div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="ba-card">
          <div className="ba-kicker mb-2">Self-serve</div>
          <div className="ba-stat-sm">60/min</div>
          <p className="text-sm text-[var(--ink-2)] mt-3">5,000 requests/day.</p>
        </div>
        <div className="ba-card">
          <div className="ba-kicker mb-2">Research</div>
          <div className="ba-stat-sm">300/min</div>
          <p className="text-sm text-[var(--ink-2)] mt-3">100,000 requests/day, admin-granted.</p>
        </div>
        <div className="ba-card">
          <div className="ba-kicker mb-2">Dev</div>
          <div className="ba-stat-sm">3,000/min</div>
          <p className="text-sm text-[var(--ink-2)] mt-3">1,000,000 requests/day for local testing.</p>
        </div>
      </section>
    </div>
  );
}
