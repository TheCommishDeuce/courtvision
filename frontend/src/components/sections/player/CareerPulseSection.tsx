import LineChart from '../../charts/LineChart';
import RankHistoryChart from '../../charts/RankHistoryChart';
import SectionHeader from '../../primitives/SectionHeader';
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
      <SectionHeader title="Career shape" kicker="How the years went" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ba-card">
          <LineChart data={toLineData(matchData.by_year)} title="Win % by year" referenceLine={50} />
        </div>
        {rankHistory && rankHistory.length > 0 ? (
          <div className="ba-card">
            <RankHistoryChart data={rankHistory} careerHigh={summary.career_high_rank} />
          </div>
        ) : (
          <div className="ba-card flex items-center justify-center py-12"><p className="ba-kicker">No ranking history on record for this player</p></div>
        )}
      </div>
    </section>
  );
}
