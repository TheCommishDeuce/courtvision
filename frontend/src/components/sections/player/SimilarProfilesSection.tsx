import { Link } from 'react-router-dom';
import ProfileTable from './ProfileTable';
import SectionHeader from '../../ui/SectionHeader';
import type { SimilarPlayerRow, SimilarReturnPlayerRow } from '../../../types/tennis';

export function SimilarProfilesSection({ similarPlayers, similarReturn, tour }: { similarPlayers?: SimilarPlayerRow[]; similarReturn?: SimilarReturnPlayerRow[]; tour: string }) {
  if (!((similarPlayers && similarPlayers.length > 0) || (similarReturn && similarReturn.length > 0))) return null;
  return (
    <section>
      <SectionHeader title="Similar Profiles" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {similarPlayers && similarPlayers.length > 0 && (
          <ProfileTable title="Serve" headers={['#', 'Player', 'Ace%', '1st In%', '1st W%', '2nd W%', 'BP Saved%']} rows={similarPlayers.map((r: SimilarPlayerRow, i) => [
            <span key="rank" className="ba-mono text-[var(--mute)]">{i + 1}</span>,
            <Link key={`${r.player_name}-${i}`} to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${tour}`} className="ba-link font-medium">{r.player_name}</Link>,
            r.ace_pct != null ? `${r.ace_pct}%` : '—',
            r.first_in_pct != null ? `${r.first_in_pct}%` : '—',
            r.first_win_pct != null ? `${r.first_win_pct}%` : '—',
            r.second_win_pct != null ? `${r.second_win_pct}%` : '—',
            r.bp_saved_pct != null ? `${r.bp_saved_pct}%` : '—',
          ])} />
        )}
        {similarReturn && similarReturn.length > 0 && (
          <ProfileTable title="Return" headers={['#', 'Player', '1st Ret W%', '2nd Ret W%', 'BP Conv%']} rows={similarReturn.map((r: SimilarReturnPlayerRow, i) => [
            <span key="rank" className="ba-mono text-[var(--mute)]">{i + 1}</span>,
            <Link key={`${r.player_name}-${i}`} to={`/player?p=${encodeURIComponent(r.player_name)}&tour=${tour}`} className="ba-link font-medium">{r.player_name}</Link>,
            r.first_return_win_pct != null ? `${r.first_return_win_pct}%` : '—',
            r.second_return_win_pct != null ? `${r.second_return_win_pct}%` : '—',
            r.bp_converted_pct != null ? `${r.bp_converted_pct}%` : '—',
          ])} />
        )}
      </div>
    </section>
  );
}
