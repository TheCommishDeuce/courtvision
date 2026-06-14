const SURFACES = ['All', 'Hard', 'Clay', 'Grass', 'Carpet'];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SurfaceSelect({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <label className="ba-kicker">Surface</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="ba-select text-sm px-2 py-1.5 w-full"
      >
        {SURFACES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
