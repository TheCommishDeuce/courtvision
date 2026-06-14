import { useMetaStats } from '../../hooks';

function fmt(value?: number) {
  return value != null ? value.toLocaleString() : '—';
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[140px]">
      <div className="ba-kicker">{label}</div>
      <div className="ba-mono text-sm font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}

export default function DataStrip() {
  const { data: stats } = useMetaStats();
  const era = stats ? `${stats.year_min}–${stats.year_max}` : '—';
  const lastSync = stats?.data_through ? stats.data_through.slice(0, 10) : '—';

  return (
    <section className="border-b border-[var(--rule)] bg-[var(--paper)]">
      <div className="max-w-7xl mx-auto px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-6 whitespace-nowrap">
          <Cell label="Matches Indexed" value={fmt(stats?.total_matches)} />
          <Cell label="Players" value={fmt(stats?.total_players)} />
          <Cell label="Tournaments" value={fmt(stats?.total_tournaments)} />
          <Cell label="Era" value={era} />
          <Cell label="Last Sync" value={lastSync} />
        </div>
      </div>
    </section>
  );
}
