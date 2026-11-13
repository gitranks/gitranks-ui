import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A status box above a session (a lesson's stage, say): what is happening, in a word and a line. */
export function Box({
  children,
  tone = 'info',
  state,
}: {
  children: ReactNode;
  tone?: 'info' | 'warn' | 'done' | 'muted';
  state: string;
}) {
  return (
    <section
      data-attempt-status={state}
      // Focused when a submission starts, so keyboard and screen reader users land on its progress.
      tabIndex={-1}
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-5 py-4 outline-none',
        tone === 'info' && 'border-primary/20 bg-brand-soft',
        tone === 'warn' && 'border-warning/30 bg-warning-soft',
        tone === 'done' && 'bg-card',
        tone === 'muted' && 'bg-muted/40',
      )}
    >
      {children}
    </section>
  );
}
