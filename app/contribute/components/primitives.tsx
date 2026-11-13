import type { ComponentProps, ReactNode } from 'react';

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

/** A bordered block of a Contribute page. Other attributes (`aria-*`, `data-*`) go on its `section`. */
export function Panel({
  children,
  className,
  id,
  tone = 'default',
  ...rest
}: Omit<ComponentProps<'section'>, 'children' | 'className' | 'id'> & {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <section
      {...rest}
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

/** A dot that breathes while an agent works (solid under reduced motion), green once settled, grey while it waits. */
export function LiveDot({ active, settled }: { active: boolean; settled?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex size-2 shrink-0">
      {active ? (
        <span className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-contribute-pulse" />
      ) : null}
      <span
        className={cn(
          'relative size-2 rounded-full',
          active ? 'bg-primary' : settled ? 'bg-positive' : 'bg-muted-foreground/60',
        )}
      />
    </span>
  );
}

export type SteppedMeterStep = {
  /** `data-step`: the step's own key, else its label. */
  id?: string;
  label: string;
  state: 'done' | 'current' | 'retrying' | 'failed' | 'skipped' | 'pending';
};

const STEP_WORDS: Record<SteppedMeterStep['state'], string> = {
  done: 'done',
  current: 'now',
  retrying: 'trying again',
  failed: 'failed',
  skipped: 'not needed',
  pending: 'next',
};

/**
 * `Meter`, in steps: the same track and fill, one segment per step, the step's name under it. Done steps are filled,
 * the current one pulses (motion-safe), a retry is amber, a failure red, a skipped step struck through.
 */
export function SteppedMeter({ steps, label }: { steps: SteppedMeterStep[]; label: string }) {
  return (
    <ol
      aria-label={label}
      className="grid w-full min-w-0 gap-1.5"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step) => (
        <li
          key={step.id ?? step.label}
          data-step={step.id ?? step.label}
          data-step-state={step.state}
          aria-current={step.state === 'current' || step.state === 'retrying' ? 'step' : undefined}
          className="flex min-w-0 flex-col gap-1"
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-1.5 rounded bg-muted',
              (step.state === 'done' || step.state === 'current') && 'bg-primary',
              step.state === 'current' && 'motion-safe:animate-pulse',
              step.state === 'retrying' && 'bg-warning',
              step.state === 'failed' && 'bg-destructive',
            )}
          />
          <span
            className={cn(
              'truncate text-xs',
              step.state === 'pending' || step.state === 'skipped' ? 'text-muted-foreground' : 'font-medium',
              step.state === 'skipped' && 'line-through',
              step.state === 'failed' && 'text-destructive',
            )}
          >
            {step.label}
            <span className="sr-only">: {STEP_WORDS[step.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
