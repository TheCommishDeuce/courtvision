import FilterField from './FilterField';

const SURFACES = ['All', 'Hard', 'Clay', 'Grass', 'Carpet'];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SurfaceSelect({ value, onChange }: Props) {
  return (
    <FilterField label="Surface">
      <select value={value} onChange={e => onChange(e.target.value)} className="ba-select w-full">
        {SURFACES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </FilterField>
  );
}
