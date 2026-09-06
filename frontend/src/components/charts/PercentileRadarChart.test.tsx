import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    expect(screen.getByText(/1,234 eligible players/)).toBeInTheDocument();
  });

  it('shows available values and missing markers instead of plotting unknown values as zero', () => {
    render(
      <PercentileRadarChart
        percentiles={{ 'stat_a%': 0, 'stat_b%': null, tour_size: 20 }}
        percentilesB={{ 'stat_a%': 75, 'stat_b%': 100, tour_size: 20 }}
        subjects={SUBJECTS}
        labelA="Player A"
        labelB="Player B"
      />,
    );
    const table = within(screen.getByRole('table'));
    expect(table.getByText('0th pct')).toBeInTheDocument();
    expect(table.getByText('75th pct')).toBeInTheDocument();
    expect(table.getByText('100th pct')).toBeInTheDocument();
    expect(table.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/missing metrics are unranked, not zero/i)).toBeInTheDocument();
  });

  it('keeps the radar layout when every plotted metric is available', () => {
    render(<PercentileRadarChart<FakePercentiles> percentiles={{ 'stat_a%': 0, 'stat_b%': 80 }} subjects={SUBJECTS} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('omits the player count when tour_size is missing', () => {
    const percentiles: FakePercentiles = { 'stat_a%': 80 };
    render(<PercentileRadarChart percentiles={percentiles} subjects={SUBJECTS} title="T" />);
    expect(screen.getByText(/Tour percentiles/)).toBeInTheDocument();
    expect(screen.queryByText(/eligible players/)).not.toBeInTheDocument();
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
