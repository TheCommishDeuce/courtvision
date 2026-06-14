import type { ReturnPercentiles } from '../../api/client';
import PercentileRadarChart from './PercentileRadarChart';

interface Props {
  percentiles: ReturnPercentiles;
  percentilesB?: ReturnPercentiles;
  labelA?: string;
  labelB?: string;
  title?: string;
  tour?: string;
}

const SUBJECTS: { key: keyof ReturnPercentiles; label: string }[] = [
  { key: '1st_return_win%', label: '1st Ret W%' },
  { key: '2nd_return_win%', label: '2nd Ret W%' },
  { key: 'bp_converted%',   label: 'BP Conv%' },
];

export default function ReturnRadarChart({ title = 'Return Profile', ...props }: Props) {
  return <PercentileRadarChart {...props} subjects={SUBJECTS} title={title} />;
}
