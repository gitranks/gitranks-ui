import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A key as the boards draw it: a small keycap, its bottom edge thicker. `onPrimary` sits inside the main button. */
export function Kbd({
  children,
  onPrimary,
  className,
}: {
  children: ReactNode;
  onPrimary?: boolean;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'inline-grid h-[22px] min-w-[22px] place-items-center rounded-[5px] border border-b-2 px-[5px] font-mono text-[11px] leading-none',
        onPrimary
          ? 'border-primary-foreground/40 bg-transparent text-primary-foreground'
          : 'bg-card text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
