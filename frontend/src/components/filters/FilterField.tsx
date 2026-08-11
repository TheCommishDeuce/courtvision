import type { ReactNode } from 'react';

interface Props {
  label: ReactNode;
  children: ReactNode;
  /** Width classes. Defaults to full-width on mobile, intrinsic above sm. */
  width?: string;
}

/** One label/control pair. Every filter control uses this so labels can't drift. */
export default function FilterField({ label, children, width = 'w-full sm:w-auto' }: Props) {
  return (
    <label className={`flex flex-col gap-0.5 ${width}`}>
      <span className="ba-label">{label}</span>
      {children}
    </label>
  );
}
