import { Link } from 'react-router-dom';
import ProfileTable from './ProfileTable';
import type { PlayerForm } from '../../../types/tennis';

export function FormSection({ playerForm, tour }: { playerForm?: PlayerForm; tour: string }) {
  if (!playerForm) return null;
  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfileTable
          title="Recent Top-50 Wins"
          headers={['Date', 'Opponent', 'Rank', 'Tournament', 'Round']}
          rows={(playerForm.top_wins_recent ?? []).map(r => [
            r.date,
            <Link key={`${r.opponent_name}-${r.date}`} to={`/player?p=${encodeURIComponent(r.opponent_name)}&tour=${tour}`} className="ba-link font-medium">{r.opponent_name}</Link>,
            r.opponent_rank != null ? `#${r.opponent_rank}` : '—',
            <Link key={`${r.tournament}-${r.date}-topwin`} to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.date.slice(0, 4)}&tour=${tour}`} className="ba-link font-medium">{r.tournament}</Link>,
            r.round,
          ])}
        />
        <ProfileTable
          title="Recent Upset Losses"
          headers={['Date', 'Opponent', 'Rank', 'Tournament', 'Round']}
          rows={(playerForm.upset_losses_recent ?? []).map(r => [
            r.date,
            <Link key={`${r.opponent_name}-${r.date}`} to={`/player?p=${encodeURIComponent(r.opponent_name)}&tour=${tour}`} className="ba-link font-medium">{r.opponent_name}</Link>,
            r.opponent_rank != null ? `#${r.opponent_rank}` : '—',
            <Link key={`${r.tournament}-${r.date}-upsetloss`} to={`/tournament?t=${encodeURIComponent(r.tournament)}&year=${r.date.slice(0, 4)}&tour=${tour}`} className="ba-link font-medium">{r.tournament}</Link>,
            r.round,
          ])}
        />
      </div>
    </section>
  );
}
