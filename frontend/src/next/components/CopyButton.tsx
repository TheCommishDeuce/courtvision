/** Copy link / Copy citation (brief 02-shell.md › Shared patterns). */
import { useEffect, useState } from 'react';
import { useMetaStats } from '../../hooks';
import { citation } from '../lib/format';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CopyButton({ what = 'link' }: { what?: 'link' | 'citation' }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const { data } = useMetaStats();

  useEffect(() => {
    if (state === 'idle') return;
    const id = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(id);
  }, [state]);

  const label = what === 'link' ? 'Copy link' : 'Copy citation';
  const done = what === 'link' ? 'Link copied' : 'Citation copied';
  return (
    <button
      type="button"
      className="cv-btn"
      onClick={async () => {
        const url = window.location.href;
        const ok = await copy(what === 'link' ? url : citation(url, data?.data_through));
        setState(ok ? 'done' : 'failed');
      }}
    >
      <span aria-live="polite">{state === 'done' ? done : state === 'failed' ? 'Copy failed' : label}</span>
    </button>
  );
}
