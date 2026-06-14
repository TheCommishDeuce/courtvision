import LineChart from '../../charts/LineChart';
import RankHistoryChart from '../../charts/RankHistoryChart';
import SectionHeader from '../../ui/SectionHeader';
import type { PlayerMatchesResponse, PlayerSummary, RankHistoryPoint, WinPctRow } from '../../../types/tennis';

function toLineData(rows: WinPctRow[]) {
  return rows.map(r => ({
    x: r.year ?? 0,
    y: r.win_pct,
    wins: r.wins,
    total: r.total,
  }));
}

export function CareerPulseSection({ matchData, rankHistory, summary }: { matchData: PlayerMatchesResponse; rankHistory?: RankHistoryPoint[]; summary: PlayerSummary }) {
  return (
    <section>
      <SectionHeader title="Career Pulse" kicker="Trajectory over time" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ba-card">
          <LineChart data={toLineData(matchData.by_year)} title="Win % by Year" referenceLine={50} />
        </div>
        {rankHistory && rankHistory.length > 0 ? (
          <div className="ba-card">
            <RankHistoryChart data={rankHistory} careerHigh={summary.career_high_rank} />
          </div>
        ) : (
          <div className="ba-card flex items-center justify-center text-[var(--mute)] text-sm py-12">No rank history available</div>
        )}
      </div>
    </section>
  );
}
