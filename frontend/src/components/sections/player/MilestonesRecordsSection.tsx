import StatTable from '../../tables/StatTable';
import SectionHeader from '../../ui/SectionHeader';
import type { PlayerMilestones, TopNRecords } from '../../../types/tennis';

export function MilestonesRecordsSection({ milestones, topN }: { milestones?: PlayerMilestones; topN?: TopNRecords }) {
  if (!milestones && !topN) return null;
  return (
    <section>
      <SectionHeader title="Milestones & Records" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {milestones && Object.keys(milestones).length > 0 && (
          <StatTable title="Career Milestones" rows={[
            { label: 'First Top 100', value: milestones.first_top100 },
            { label: 'First Top 50', value: milestones.first_top50 },
            { label: 'First Top 20', value: milestones.first_top20 },
            { label: 'First Top 10', value: milestones.first_top10 },
            { label: 'First Title', value: milestones.first_title_date ? `${milestones.first_title_tournament} (${milestones.first_title_date})` : null },
            { label: 'First Tour Title', value: milestones.first_tour_title_date ? `${milestones.first_tour_title_tournament} (${milestones.first_tour_title_date})` : null },
          ]} />
        )}
        {topN && Object.keys(topN).length > 0 && (
          <StatTable title="Records vs Top Ranked" rows={[
            { label: 'vs Top 5', value: topN.top5 ? `${topN.top5['W-L']} (${topN.top5['win%']}%)` : null },
            { label: 'vs Top 10', value: topN.top10 ? `${topN.top10['W-L']} (${topN.top10['win%']}%)` : null },
            { label: 'vs Top 20', value: topN.top20 ? `${topN.top20['W-L']} (${topN.top20['win%']}%)` : null },
            { label: 'vs Top 50', value: topN.top50 ? `${topN.top50['W-L']} (${topN.top50['win%']}%)` : null },
            { label: 'vs Top 100', value: topN.top100 ? `${topN.top100['W-L']} (${topN.top100['win%']}%)` : null },
          ]} />
        )}
      </div>
    </section>
  );
}
