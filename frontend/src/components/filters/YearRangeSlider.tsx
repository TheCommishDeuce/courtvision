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
    <div className="flex flex-col gap-1 w-full sm:min-w-[320px] sm:w-auto">
      <label className="ba-kicker">
        Years: {local[0]} – {local[1]}
      </label>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <input
          type="range"
          min={min}
          max={max}
          value={local[0]}
          onChange={e => {
            const v = Number(e.target.value);
            if (v <= local[1]) handleChange([v, local[1]]);
          }}
          className="w-full accent-[var(--primary)]"
        />
        <span className="ba-mono text-xs text-[var(--mute)]">to</span>
        <input
          type="range"
          min={min}
          max={max}
          value={local[1]}
          onChange={e => {
            const v = Number(e.target.value);
            if (v >= local[0]) handleChange([local[0], v]);
          }}
          className="w-full accent-[var(--primary)]"
        />
      </div>
    </div>
  );
}
