import { CheckIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LiveDot, Pill, SteppedMeter, type SteppedMeterStep } from './primitives';
import type { ContributeClaimStep } from '@/lib/contribute/contribute.types';
import type { StatusLead, StatusLink } from '@/lib/contribute/session-status';
import { cn } from '@/lib/utils';

/** A link of the status line: one of ours, or GitHub's in a new tab. */
export function StatusLinkView({ link }: { link: StatusLink }) {
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
      {link.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={link.href as Route} prefetch={false} scroll={false} className="font-semibold text-link">
      {link.label}
    </Link>
  );
}

/**
 * Where the shown session stands, in one line (M3), when nothing waits on it: a lead (a live dot, a pill, a check), a
 * title, one fact, at most one link, and the rest behind Details. A move another session holds takes the link's place;
 * the line's own link then goes into Details.
 */
export function StatusLine({
  lead,
  title,
  fact,
  bar,
  link,
  details,
  poll,
  live = false,
  name,
}: {
  lead: StatusLead;
  title: string;
  fact?: ReactNode;
  bar?: SteppedMeterStep[] | null;
  link?: ReactNode;
  details?: ReactNode;
  /** The proof's poll while it works or posts: the page asks for news often. */
  poll?: ReactNode;
  live?: boolean;
  /** `data-status`: the state the line says. */
  name: string;
}) {
  return (
    <section
      data-status={name}
      role={live ? 'status' : undefined}
      aria-label={title}
      className="flex scroll-mt-20 flex-row flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card px-4 py-3"
    >
      {lead?.kind === 'dot' ? <LiveDot active /> : null}
      {lead?.kind === 'pill' ? <Pill tone={lead.tone}>{lead.label}</Pill> : null}
      {lead?.kind === 'check' ? <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
      <h2 className="text-sm font-semibold break-words">{title}</h2>
      {fact ? <span className="min-w-0 text-sm break-words text-muted-foreground">{fact}</span> : null}
      {link ? <span className="text-sm sm:ml-auto">{link}</span> : null}
      {bar?.length ? (
        <div className="basis-full pt-1">
          <SteppedMeter steps={bar} label="Steps" />
        </div>
      ) : null}
      {poll}
      {details ? (
        <details className={cn('basis-full text-sm')} data-status-details="">
          <summary className="cursor-pointer font-medium text-link marker:text-muted-foreground">Details</summary>
          <div className="mt-2 flex flex-col gap-1.5 text-muted-foreground [overflow-wrap:anywhere]">{details}</div>
        </details>
      ) : null}
    </section>
  );
}

const STEP_MARKS = { running: '…', done: '✓', failed: '✕' } as const;

/** The claim's check as it goes: each step in its words, the latest last; a failed repository read lets it go on. */
export function ClaimSteps({ steps }: { steps: ContributeClaimStep[] }) {
  if (!steps.length) return null;
  return (
    <ol data-claim-steps className="flex flex-col gap-1 text-sm">
      {steps.map((step) => (
        <li key={step.key} data-claim-step={step.key} data-state={step.state} className="flex gap-2">
          <span aria-hidden className={cn('w-4 text-center', step.state === 'failed' && 'text-warning')}>
            {STEP_MARKS[step.state] ?? '…'}
          </span>
          <span className={step.state === 'running' ? 'text-foreground' : 'text-muted-foreground'}>
            {step.words}
            {step.state === 'failed' ? ' (failed)' : ''}
            {step.state === 'running' ? <span className="sr-only"> (in progress)</span> : null}
            {step.state === 'done' ? <span className="sr-only"> (done)</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
