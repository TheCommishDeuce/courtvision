import type { ReactNode } from 'react';
import { toNum } from '../../../lib/compare';

export default function CompareRow({
  label,
  a,
  b,
  better = 'higher',
}: {
  label: string;
  a: ReactNode;
  b: ReactNode;
  better?: 'higher' | 'lower' | 'none';
}) {
  const aNum = toNum(a as string | number | null | undefined);
  const bNum = toNum(b as string | number | null | undefined);
  const hasBoth = aNum !== null && bNum !== null;
  const aWins = hasBoth && (better === 'higher' ? aNum > bNum : better === 'lower' ? aNum < bNum : false);
  const bWins = hasBoth && (better === 'higher' ? bNum > aNum : better === 'lower' ? bNum < aNum : false);

  return (
    <tr className="border-b border-[var(--rule)] last:border-b-0">
      <td className={`px-4 py-1.5 text-right text-[12.5px] ba-mono ${aWins ? 'text-[var(--clay)] font-bold' : 'text-[var(--ink)]'}`}>{a ?? '—'}</td>
      <td className="px-4 py-1.5 text-center text-[10px] ba-mono font-medium tracking-[0.12em] uppercase text-[var(--mute)] bg-[var(--bone-3)] whitespace-nowrap">{label}</td>
      <td className={`px-4 py-1.5 text-left text-[12.5px] ba-mono ${bWins ? 'text-[var(--ink)] font-bold' : 'text-[var(--ink-2)]'}`}>{b ?? '—'}</td>
    </tr>
  );
}
