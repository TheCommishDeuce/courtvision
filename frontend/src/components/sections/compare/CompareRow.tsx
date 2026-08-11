import type { ReactNode } from 'react';
import { toNum } from '../../../lib/compare';

/**
 * One metric, both players, label between them. Only the winning side is bold —
 * clay for A, ink for B, matching the two hero blocks.
 */
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
    <tr>
      <td className={`text-right ba-figure ${aWins ? 'text-[var(--clay)] font-bold' : 'text-[var(--ink-2)] font-normal'}`}>
        {a ?? '—'}
      </td>
      <td className="text-center ba-label bg-[var(--paper-sunken)] whitespace-nowrap">{label}</td>
      <td className={`text-left ba-figure ${bWins ? 'text-[var(--ink)] font-bold' : 'text-[var(--ink-2)] font-normal'}`}>
        {b ?? '—'}
      </td>
    </tr>
  );
}
