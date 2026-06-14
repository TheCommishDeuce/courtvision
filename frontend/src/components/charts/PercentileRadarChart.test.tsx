import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PercentileRadarChart from './PercentileRadarChart';
import ServeRadarChart from './ServeRadarChart';
import ReturnRadarChart from './ReturnRadarChart';

interface FakePercentiles {
  'stat_a%'?: number | null;
  'stat_b%'?: number | null;
  tour_size?: number;
}

const SUBJECTS: { key: keyof FakePercentiles; label: string }[] = [
  { key: 'stat_a%', label: 'Stat A' },
  { key: 'stat_b%', label: 'Stat B' },
];

describe('PercentileRadarChart', () => {
  it('renders title and tour-size footnote', () => {
    render(
      <PercentileRadarChart
        percentiles={{ 'stat_a%': 80, 'stat_b%': 50, tour_size: 1234 }}
        subjects={SUBJECTS}
        title="Test Profile"
      />,
    );
    expect(screen.getByText('Test Profile')).toBeInTheDocument();
    expect(screen.getByText(/vs 1,234 players/)).toBeInTheDocument();
  });

  it('omits the player count when tour_size is missing', () => {
    const percentiles: FakePercentiles = { 'stat_a%': 80 };
    render(<PercentileRadarChart percentiles={percentiles} subjects={SUBJECTS} title="T" />);
    expect(screen.getByText(/Tour percentiles/)).toBeInTheDocument();
    expect(screen.queryByText(/vs .* players/)).not.toBeInTheDocument();
  });
});

describe('radar chart wrappers', () => {
  it('ServeRadarChart keeps its default title', () => {
    render(<ServeRadarChart percentiles={{ 'ace%': 90 }} />);
    expect(screen.getByText('Serve Profile')).toBeInTheDocument();
  });

  it('ReturnRadarChart keeps its default title and accepts the legacy tour prop', () => {
    render(<ReturnRadarChart percentiles={{ 'bp_converted%': 60 }} tour="W" />);
    expect(screen.getByText('Return Profile')).toBeInTheDocument();
  });
});
