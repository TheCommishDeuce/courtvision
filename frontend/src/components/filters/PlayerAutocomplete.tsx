import { useState } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: string[];
  placeholder?: string;
  width?: string;
}

export default function PlayerAutocomplete({
  label,
  value,
  onChange,
  players,
  placeholder = 'Type player name…',
  width = 'w-full sm:w-64',
}: Props) {
  const [open, setOpen] = useState(false);
  const filtered = value
    ? players.filter(p => p.toLowerCase().includes(value.toLowerCase())).slice(0, 20)
    : [];

  return (
    <div className={`flex flex-col gap-1 relative ${width}`}>
      <label className="ba-kicker">{label}</label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="ba-input text-sm px-2 py-1.5 w-full min-w-0"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 z-20 bg-[var(--paper)] border border-[var(--rule)] max-h-48 overflow-y-auto w-full text-sm">
          {filtered.map(p => (
            <li
              key={p}
              onMouseDown={() => { onChange(p); setOpen(false); }}
              className="px-3 py-1.5 hover:bg-[var(--paper-3)] cursor-pointer text-[var(--ink)]"
            >
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
