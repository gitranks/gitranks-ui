import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A small uppercase label in the mono face, above a block. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground', className)}>
      {children}
    </span>
  );
}

/** A bordered block of a Contribute page. */
export function Panel({
  children,
  className,
  id,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <section
      id={id}
      className={cn(
        'flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6',
        tone === 'danger' && 'border-red-200 dark:border-red-900',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ title, text, id }: { title: string; text?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
    </div>
  );
}

const PILL_TONES = {
  neutral: 'bg-muted text-foreground/80',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
} as const;

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof PILL_TONES }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', PILL_TONES[tone])}>
      {children}
    </span>
  );
}

/** A thin bar for spend against a cap. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded bg-muted">
      <meter className="sr-only" aria-label={label} min={0} max={max} value={value} />
      <div aria-hidden="true" className="h-full rounded bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}
