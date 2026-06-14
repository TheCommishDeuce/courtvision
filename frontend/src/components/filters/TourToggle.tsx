interface Props {
  value: string;
  onChange: (v: string) => void;
}

const TOURS = [
  { label: 'ATP (Men)', value: 'M' },
  { label: 'WTA (Women)', value: 'F' },
];

export default function TourToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {TOURS.map(t => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`ba-chip px-3 py-1.5 text-xs transition-colors ${
            value === t.value
              ? 'ba-chip-active'
              : ''
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
