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

/**
 * Contribute's heading scale, one step per level, so a heading never reads like the text under it (`text-sm`):
 * - `page`: the page's title, its h1;
 * - `section`: a section of the page, an h2 in a full-width panel;
 * - `card`: a narrower block's h2, a side card or a form beside the diff;
 * - `block`: a part inside a section or card, its h3.
 * For a heading that needs its own element (a ref, a level picked at runtime); the components below use them.
 */
export const HEADING = {
  page: 'text-2xl font-bold tracking-tight text-balance md:text-3xl',
  section: 'text-xl font-semibold tracking-tight',
  card: 'text-lg font-semibold',
  block: 'text-base font-semibold',
} as const;

/** A page's h1, with an eyebrow above it and a line of muted text under it. */
export function PageTitle({
  title,
  text,
  eyebrow,
  children,
}: {
  title: ReactNode;
  text?: ReactNode;
  eyebrow?: ReactNode;
  /** Beside the title, on its line: a chip or a control. */
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className={HEADING.page}>{title}</h1>
        {children}
      </div>
      {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
    </div>
  );
}

/** A section's h2, with an eyebrow above it and a line of muted text under it. */
export function PanelTitle({
  title,
  text,
  id,
  eyebrow,
}: {
  title: string;
  text?: ReactNode;
  id?: string;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className={HEADING.section}>
        {title}
      </h2>
      {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
    </div>
  );
}

/** A part's h3 inside a section or a card. */
export function SubTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn(HEADING.block, className)}>{children}</h3>;
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
