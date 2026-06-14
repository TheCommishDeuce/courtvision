export type Tab = 'activity' | 'serve' | 'return' | 'streaks' | 'draw_strength';

export const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: 'activity',      label: 'Activity',      subtitle: 'Wins, finals, tiebreaks, upsets, comebacks, bakery' },
  { id: 'serve',         label: 'Serve',         subtitle: 'Ace, 1st/2nd won, BP saved' },
  { id: 'return',        label: 'Return',        subtitle: 'Return & BP conversion' },
  { id: 'streaks',       label: 'Streaks',       subtitle: 'Longest winning runs' },
  { id: 'draw_strength', label: 'Draw Strength', subtitle: 'Toughest tournament paths' },
];
