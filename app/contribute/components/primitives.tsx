import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** A small uppercase label in the mono face, above a block. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-xs uppercase tracking-wider text-muted-foreground', className)}>
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
        tone === 'danger' && 'border-destructive/30',
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
  green: 'bg-positive/10 text-positive-strong',
  violet: 'bg-brand-soft text-brand-soft-foreground',
  amber: 'bg-warning-soft text-warning-soft-foreground',
  red: 'bg-negative/10 text-negative-strong',
} as const;

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof PILL_TONES }) {
  return (
    <Badge variant="secondary" className={PILL_TONES[tone]}>
      {children}
    </Badge>
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
