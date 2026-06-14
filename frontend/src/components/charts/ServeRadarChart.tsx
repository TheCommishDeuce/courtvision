import type { ServePercentiles } from '../../api/client';
import PercentileRadarChart from './PercentileRadarChart';

interface Props {
  percentiles: ServePercentiles;
  percentilesB?: ServePercentiles;
  labelA?: string;
  labelB?: string;
  title?: string;
  tour?: string;
}

const SUBJECTS: { key: keyof ServePercentiles; label: string }[] = [
  { key: 'ace%',       label: 'Ace%' },
  { key: '1st_in%',   label: '1st In%' },
  { key: '1st_win%',  label: '1st W%' },
  { key: '2nd_win%',  label: '2nd W%' },
  { key: 'bp_saved%', label: 'BP Saved%' },
  { key: 'tb_win%',   label: 'TB Win%' },
];

export default function ServeRadarChart({ title = 'Serve Profile', ...props }: Props) {
  return <PercentileRadarChart {...props} subjects={SUBJECTS} title={title} />;
}
