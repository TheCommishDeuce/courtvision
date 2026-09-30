import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fromWinnerLoser } from '../lib/matches';
import { renderAt } from '../test/render';
import { MatchRow } from './MatchRow';

const row = {
  date: '2025-06-08', tournament: 'Roland Garros', tour: 'M', round: 'F', surface: 'Clay',
  score: '4-6 6-7(4) 6-4 7-6(3) 7-6(2)', time: 329, is_upset: false,
  winner_name: 'Carlos Alcaraz', winner_rank: 2, loser_name: 'Jannik Sinner', loser_rank: 1,
  winner_aces: 9, loser_aces: 5, winner_dfs: 3, loser_dfs: 1, winner_pts: 110, loser_pts: 100,
  winner_firsts: 70, loser_firsts: 60, winner_fwon: 50, loser_fwon: 40, winner_swon: 25, loser_swon: 20,
  winner_saved: 4, loser_saved: 2, winner_chances: 6, loser_chances: 5,
};

describe.each([false, true])('MatchRow (card=%s)', card => {
  it('links names and the event, and expands to the statistics', () => {
    renderAt(<MatchRow m={fromWinnerLoser(row, 'Jannik Sinner')} card={card} />);
    expect(screen.getByText('Carlos Alcaraz')).toHaveAttribute('href', '/player/carlos-alcaraz');
    expect(screen.getByText('Roland Garros')).toHaveAttribute('href', '/tournament/roland-garros/2025?tour=M');
    expect(screen.getByLabelText('Lost')).toBeInTheDocument();
    expect(screen.getByText('5:29')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /Match statistics/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('table', { name: 'Match statistics' })).toBeInTheDocument();
    expect(screen.getByText('63.6% · 70/110')).toBeInTheDocument();
  });

  it('says when a match has no point statistics', () => {
    renderAt(<MatchRow m={fromWinnerLoser({ ...row, winner_pts: null, loser_pts: null })} card={card} />);
    fireEvent.click(screen.getByRole('button', { name: /Match statistics/ }));
    expect(screen.getByText('No point statistics for this match.')).toBeInTheDocument();
  });
});
