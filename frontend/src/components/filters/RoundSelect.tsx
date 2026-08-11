import { ROUNDS } from '../../domain/rounds';
import FilterField from './FilterField';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function RoundSelect({ value, onChange }: Props) {
  return (
    <FilterField label="Round">
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select w-full">
        {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    </FilterField>
  );
}
