import { lastName } from '../../../utils';
import ServeRadarChart from '../../charts/ServeRadarChart';
import ReturnRadarChart from '../../charts/ReturnRadarChart';
import StatTable from '../../tables/StatTable';
import SectionHeader from '../../ui/SectionHeader';
import type { ReturnPercentiles, ServePercentiles } from '../../../api/client';
import type { ReturnStats, ServeStats } from '../../../types/tennis';

export function ServeReturnSection({
  player,
  tour,
  serveStats,
  returnStats,
  servePct,
  returnPct,
}: {
  player: string;
  tour: string;
  serveStats?: ServeStats;
  returnStats?: ReturnStats;
  servePct?: ServePercentiles;
  returnPct?: ReturnPercentiles;
}) {
  if (!serveStats && !returnStats && !servePct && !returnPct) return null;
  return (
    <section>
      <SectionHeader title="Serve and return" kicker="Against the rest of the tour" />
      {/* The two radars sit side by side rather than stacked. Stacked, this one
          section ran to roughly twice the height of every section around it for
          no extra information — the two charts are peers and read better as a
          pair anyway. */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-stretch">
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {servePct && Object.keys(servePct).length > 0 && <div className="ba-card"><ServeRadarChart percentiles={servePct} labelA={lastName(player)} title="Serve" tour={tour} /></div>}
          {returnPct && Object.keys(returnPct).length > 0 && <div className="ba-card"><ReturnRadarChart percentiles={returnPct} labelA={lastName(player)} title="Return" tour={tour} /></div>}
        </div>
        <div className="xl:col-span-2 flex flex-col">
          <StatTable stretch title="Serve and return" rows={[
            ...(serveStats && Object.keys(serveStats).length > 0 ? [
              { label: 'Ace %', value: serveStats['ace%'] != null ? `${serveStats['ace%']}%` : null },
              { label: 'Double Fault %', value: serveStats['df%'] != null ? `${serveStats['df%']}%` : null },
              { label: '1st Serve In %', value: serveStats['1st_in%'] != null ? `${serveStats['1st_in%']}%` : null },
              { label: '1st Serve Win %', value: serveStats['1st_win%'] != null ? `${serveStats['1st_win%']}%` : null },
              { label: '2nd Serve Win %', value: serveStats['2nd_win%'] != null ? `${serveStats['2nd_win%']}%` : null },
              { label: 'BP Saved %', value: serveStats['bp_saved%'] != null ? `${serveStats['bp_saved%']}%` : null },
              { label: 'Tiebreaks W-L', value: serveStats['tb_W-L'] ?? null },
              { label: 'Tiebreak Win %', value: serveStats['tb_win%'] != null ? `${serveStats['tb_win%']}%` : null },
            ] : []),
            ...(returnStats && Object.keys(returnStats).length > 0 ? [
              { label: '1st Return Win %', value: returnStats['1st_return_win%'] != null ? `${returnStats['1st_return_win%']}%` : null },
              { label: '2nd Return Win %', value: returnStats['2nd_return_win%'] != null ? `${returnStats['2nd_return_win%']}%` : null },
              { label: 'BP Converted %', value: returnStats['bp_converted%'] != null ? `${returnStats['bp_converted%']}%` : null },
            ] : []),
            { label: 'Matches w/ Stats', value: serveStats?.matches_with_stats ?? returnStats?.matches_with_stats ?? null },
          ]} />
        </div>
      </div>
    </section>
  );
}
