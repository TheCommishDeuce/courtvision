import { useEffect, useRef, useState } from 'react';

interface Props {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export default function YearRangeSlider({ min, max, value, onChange }: Props) {
  const [local, setLocal] = useState<[number, number]>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleChange = (next: [number, number]) => {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 400);
  };

  return (
    <div className="flex flex-col gap-0.5 w-full sm:min-w-[280px] sm:w-auto">
      <span className="ba-label">
        Years <span className="text-[var(--ink)]">{local[0]}–{local[1]}</span>
      </span>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <input
          type="range"
          aria-label="Start year"
          min={min}
          max={max}
          value={local[0]}
          onChange={e => {
            const v = Number(e.target.value);
            if (v <= local[1]) handleChange([v, local[1]]);
          }}
          className="w-full h-6 accent-[var(--clay)]"
        />
        <span className="ba-mono text-[10px] text-[var(--mute)]">to</span>
        <input
          type="range"
          aria-label="End year"
          min={min}
          max={max}
          value={local[1]}
          onChange={e => {
            const v = Number(e.target.value);
            if (v >= local[0]) handleChange([local[0], v]);
          }}
          className="w-full h-6 accent-[var(--clay)]"
        />
      </div>
    </div>
  );
}
