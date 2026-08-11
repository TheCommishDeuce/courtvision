interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Pass null when the toggle sits inside an already-labelled group. */
  label?: string | null;
}

const TOURS = [
  { label: 'ATP', value: 'M', full: 'ATP (men)' },
  { label: 'WTA', value: 'F', full: 'WTA (women)' },
];

/** Two mutually exclusive options, so a joined segmented pair, not loose chips. */
export default function TourToggle({ value, onChange, label = 'Tour' }: Props) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="ba-label">{label}</span>}
      <div className="flex" role="group" aria-label="Tour">
        {TOURS.map((t, i) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={value === t.value}
            onClick={() => onChange(t.value)}
            title={t.full}
            className={`ba-chip px-3 ${i > 0 ? '-ml-px' : ''} ${
              value === t.value ? 'ba-chip-active relative z-10' : ''
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
