import { ROUNDS } from '../../domain/rounds';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function RoundSelect({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <label className="ba-kicker">Round</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="ba-select text-sm px-2 py-1.5 w-full"
      >
        {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}
