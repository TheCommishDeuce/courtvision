import FilterField from './FilterField';

const LEVELS_ATP: Record<string, string> = {
  All: '',
  'All ATP': 'All Tour',
  'All Dev': 'All Dev',
  'Grand Slam': 'Grand Slam',
  'Masters 1000': 'Masters 1000',
  'ATP 250/500': 'ATP 250/500',
  'Tour Finals': 'Tour Finals',
  Olympics: 'Olympics',
  'Davis Cup': 'Davis Cup',
  Challenger: 'Challenger',
  ITF: 'ITF',
};
const LEVELS_WTA: Record<string, string> = {
  All: '',
  'All WTA': 'All Tour',
  'All Dev': 'All Dev',
  'Grand Slam': 'Grand Slam',
  'Masters 1000': 'Masters 1000',
  'WTA 500': 'WTA 500',
  'WTA 250': 'WTA 250',
  'Tour Finals': 'Tour Finals',
  Olympics: 'Olympics',
  'BJK Cup': 'BJK Cup',
  Challenger: 'Challenger',
  ITF: 'ITF',
  'WTA (pre-tier)': 'WTA',
};

interface Props {
  tour: string;
  value: string;
  onChange: (v: string) => void;
}

export default function LevelSelect({ tour, value, onChange }: Props) {
  const map = tour === 'F' ? LEVELS_WTA : LEVELS_ATP;
  return (
    <FilterField label="Level">
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select w-full">
        {Object.entries(map).map(([label, code]) => (
          <option key={label} value={code}>{label}</option>
        ))}
      </select>
    </FilterField>
  );
}
